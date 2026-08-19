# CognoDB compatibility notes

Findings from building against **CognoDB v0.9.11** (Bolt 5.4, free `c0` tier),
using the official `neo4j-driver` for JavaScript.

CognoDB speaks openCypher and works with the Neo4j drivers, but it is a pre-1.0
engine and a few Neo4j-flavoured constructs behave differently. Two of the three
below fail loudly; **one returns wrong answers silently**, which is the one worth
reading carefully.

Everything here was found by probing the live instance and is reflected in the
queries in `server/src/graph/cypher/`.

---

## 1. Pattern predicates ignore inline property constraints ⚠️ silent

The most dangerous finding. A pattern predicate in `WHERE` is evaluated as if
the node property constraint were not there.

```cypher
-- ground truth
MATCH (p:Person)-[:HAS_SKILL]->(:Skill {id: 'cypher'})
RETURN count(DISTINCT p)                                    -- 18  ✅

-- pattern predicate: the {id: 'cypher'} constraint is ignored
MATCH (p:Person) WHERE (p)-[:HAS_SKILL]->(:Skill {id: 'cypher'})
RETURN count(p)                                             -- 184 ❌ everyone

-- comprehension form is evaluated correctly
MATCH (p:Person) WHERE size([(p)-[:HAS_SKILL]->(s:Skill) WHERE s.id = 'cypher' | s]) > 0
RETURN count(p)                                             -- 18  ✅
```

No error, no warning — the query simply matches anyone with *any* skill. This
had silently broken the skill filter on the People and Projects screens.

**Rule adopted:** never use a pattern predicate in `WHERE`. Existence is always
`size([pattern WHERE …]) > 0`.

## 2. Negation and anti-joins

Every idiomatic way of writing "not connected to this specific node" returns the
wrong answer. Against a project with 10 members out of 184 people, the correct
result is 174:

| Form | Result |
| --- | ---: |
| `WHERE NOT (c)-[:WORKED_ON]->(pr)` | 0 ❌ |
| `WHERE NOT (c)-[:WORKED_ON]->(:Project {id: $pid})` | 0 ❌ |
| `WHERE NOT EXISTS { MATCH (c)-[:WORKED_ON]->(pr) }` | 0 ❌ |
| `OPTIONAL MATCH (c)-[w:WORKED_ON]->(pr) … WHERE w IS NULL` | 0 ❌ |
| `WHERE size([(c)-[:WORKED_ON]->(x:Project) WHERE x.id = $pid \| x]) = 0` | **174 ✅** |

Consistent with §1: the negation collapses to "has no `WORKED_ON` edge at all".

**Rule adopted:** anti-joins are written as an empty comprehension. This is why
the hidden-experts and candidate queries look the way they do.

## 3. Pattern comprehensions cannot nest

```
pattern comprehension requires a store context
```

A pattern comprehension inside **another pattern comprehension** is rejected:

```cypher
-- ❌ rejected
RETURN [(pr)-[req:REQUIRES]->(s:Skill) | {
  covered: size([(pr)<-[:WORKED_ON]-(m:Person)-[hs:HAS_SKILL]->(s) | m]) > 0
}]
```

A pattern comprehension inside a **list** comprehension is fine, as is one
inside `collect(CASE … END)`:

```cypher
-- ✅ accepted
RETURN [r IN reqs WHERE size([(cand)-[h:HAS_SKILL]->(s:Skill) WHERE s.id = r.id | s]) > 0 | r.id]
```

**How this shaped the model.** Rather than restructure every read query, the
role, team, department and location labels a person card needs are denormalised
onto the `:Person` node at seed time (and the holder count onto `:Role`). The
`HOLDS_ROLE` / `MEMBER_OF` / `BASED_IN` edges stay authoritative and are what all
the traversals walk — these are display copies, written only by the seed. That
makes `personSummary()` a pure property read, usable at any nesting depth, and
removes four hops per projected row into the bargain.

Where a genuine per-row aggregation was needed anyway — project coverage,
departure impact — the query was rewritten with `OPTIONAL MATCH` + `count()`,
which is clearer than the nested comprehension it replaced.

---

## Works exactly as expected

Verified against the live instance:

- `shortestPath` with a variable-length bounded pattern, including multiple
  relationship types (`[:WORKED_ON|MENTORS|REPORTS_TO*1..8]`)
- flat pattern comprehensions, with an inline `WHERE` and with an undirected leg
- deeply chained patterns (a five-hop comprehension for second-degree distance)
- `reduce()`, `head()`, `size()`, list comprehensions, list slicing (`[0..3]`)
- `collect(CASE … END)[0]` for best-of-group after an `ORDER BY`
- `OPTIONAL MATCH` with aggregation, `avg()`, `count(DISTINCT …)`
- `labels()`, `type()`, `nodes()`, `relationships()` on a path
- `CREATE CONSTRAINT … IF NOT EXISTS` and `CREATE INDEX … IF NOT EXISTS`
- batched `UNWIND … MERGE` writes

## One bug of our own, worth noting

Not a CognoDB issue: inside a single `WITH` clause Cypher expects
`ORDER BY` **before** `WHERE`. Writing them the other way round is a syntax
error that CognoDB reported precisely (`unexpected token ORDER`). Filtering and
then ranking needs two `WITH` clauses.

## Operational limits observed

| Limit | Value | How the app respects it |
| --- | --- | --- |
| Max connections | 200 | Driver pool capped at 20, one driver per process |
| Max result rows | 50,000 | Largest query returns ~184 |
| Memory | 512 MB | Seed writes in 400-row batches; reset deletes in 500-node batches |
| Round-trip latency | ~600 ms/query from Europe to `us-east4` | Independent queries issued with `Promise.all`; detail screens use 2–3 concurrent queries rather than 8 sequential ones |

The last row is the one that shapes the code most: the instance is fast (2–4 ms
server-side health latency) but geographically distant, so the cost of a screen
is dominated by round trips, not by query complexity.

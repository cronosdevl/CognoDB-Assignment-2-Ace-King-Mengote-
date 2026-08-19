# CognoDB compatibility notes

Findings from building against **CognoDB v0.9.11** (Bolt 5.4, free `c0` tier),
using the official `neo4j-driver` for JavaScript.

CognoDB speaks openCypher and works with the Neo4j drivers, but it is a pre-1.0
engine and several Neo4j-flavoured constructs behave differently. One of the
four below fails loudly. **Three return wrong answers silently** — no error, no
warning, just plausible numbers that are not true. Those are the ones worth
reading carefully, and they are the reason this file exists.

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

## 3. `OPTIONAL MATCH` ignores already-bound nodes ⚠️ silent

The most damaging of the four, and the hardest to spot. When both endpoints of
an `OPTIONAL MATCH` are already bound, the binding on the second one is
discarded:

```cypher
MATCH (p:Person {id: 'person-001'})
MATCH (s:Skill  {id: 'typescript'})

MATCH (p)-[h:HAS_SKILL]->(s)           RETURN count(h)   -- 1   ✅
OPTIONAL MATCH (p)-[h:HAS_SKILL]->(s)  RETURN count(h)   -- 13  ❌ every skill p holds
```

13 is exactly how many skills that person has. The clause behaves as
`OPTIONAL MATCH (p)-[h:HAS_SKILL]->(:Skill)`.

The damage is arithmetic rather than a crash. `OPTIONAL MATCH (p)-[owned:HAS_SKILL]->(s)`
is the natural way to ask "what level does this person have in *this* skill",
and it is how skill gaps, role readiness and project coverage were all written.
Instead of one row per requirement, each produced one row per requirement × per
skill the person holds — so gap lists were duplicated, readiness percentages
were computed over the wrong denominator, and project coverage was inflated
because almost every requirement looked satisfied by somebody.

Plain `MATCH` is correct. So is a flat pattern comprehension:

```cypher
coalesce(head([(p)-[h:HAS_SKILL]->(x:Skill) WHERE x.id = s.id | h.level]), 0) AS currentLevel
```

**Rule adopted:** `OPTIONAL MATCH` is used only where the far node is *free*
(`OPTIONAL MATCH (pr)<-[w:WORKED_ON]-(person:Person)`), which behaves correctly.
Anything with both ends bound goes through the `levelInSkill()` and
`coverCount()` helpers in `cypher/fragments.ts`.

**How it was caught.** Not by reading the code — the query looked obviously
right. `npm run verify` logs the row count of every statement, and a skill-gap
query for a two-role path was returning 115 rows where about ten were possible.
The independent check is that `npm run dataset:check` computes the same
statistics in TypeScript from the generated data, with no database involved:
both now report 11 skills resting on a single expert and ~92% project coverage.
Two implementations agreeing is the evidence that the Cypher is right.

## 4. Pattern comprehensions cannot nest

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
- `collect(…)` as an aggregation — but the `[0]` must be a *separate* `WITH`
  clause. Written inline as `collect(…)[0]`, CognoDB does not treat it as an
  aggregation and emits one row per candidate instead of one per group.
- `OPTIONAL MATCH` where the far node is free, with aggregation, `avg()`,
  `count(DISTINCT …)`
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

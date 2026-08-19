# The queries

Every statement lives in [`server/src/graph/cypher/`](../server/src/graph/cypher/)
and is constructed through `defineQuery(name, text)`. The runners in
[`server/src/db/query.ts`](../server/src/db/query.ts) accept nothing else, so
user input can only ever reach the database as a bound parameter.

---

## 1. Career pathfinding — the multi-hop query

**Screen:** Career pathfinder · **File:** `cypher/pathfinder.ts`

```cypher
MATCH (from:Role {id: $fromRoleId})
MATCH (to:Role   {id: $toRoleId})
MATCH path = shortestPath((from)-[:PROGRESSES_TO*1..6]->(to))
RETURN [n IN nodes(path) | { id: n.id, title: n.title, family: n.family, level: n.level }] AS roles,
       [rel IN relationships(path) | rel.typicalMonths] AS months
```

Variable-length traversal of one to six hops. Because `PROGRESSES_TO` includes
lateral moves between role families, the ladder contains cycles and multiple
routes between the same pair of roles — the shortest one is frequently *not* the
one that goes straight up.

**Why a relational database finds this awkward:** it needs a recursive CTE that
enumerates paths, carries an array of visited roles to break cycles, and then
takes a `MIN` over path length. Roughly thirty lines, and it re-walks the whole
ladder every time. Here the engine does it natively and stops at the first hit.

---

## 2. Skill gaps, head starts and mentors — one traversal, three answers

**Screen:** Career pathfinder · **File:** `cypher/pathfinder.ts`

For every role on the route, this finds what the person is missing, an adjacent
skill they already hold that shortens the climb, and the best colleague to learn
it from — preferring someone they have already shipped with.

```cypher
MATCH (p:Person {id: $personId})
UNWIND $roleIds AS roleId
MATCH (r:Role {id: roleId})-[req:REQUIRES_SKILL]->(s:Skill)
OPTIONAL MATCH (p)-[owned:HAS_SKILL]->(s)
WITH p, roleId, r, s, req, coalesce(owned.level, 0) AS currentLevel
WHERE currentLevel < req.minLevel

// Best adjacent skill they already hold
OPTIONAL MATCH (s)-[adj:ADJACENT_TO]-(near:Skill)<-[nearHas:HAS_SKILL]-(p)
WITH p, roleId, s, req, currentLevel, adj, near, nearHas
ORDER BY (coalesce(adj.similarity, 0) * coalesce(nearHas.level, 0)) DESC
WITH p, roleId, s, req, currentLevel,
     collect(CASE WHEN near IS NULL THEN null ELSE {
       skillId: near.id, name: near.name, level: nearHas.level, similarity: adj.similarity
     } END)[0] AS headStart

// Strongest mentor, preferring someone already in their orbit
OPTIONAL MATCH (mentor:Person)-[mh:HAS_SKILL]->(s)
WHERE mentor.id <> p.id AND mh.level >= 4
WITH p, roleId, s, req, currentLevel, headStart, mentor, mh,
     size([(p)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(x:Person)
           WHERE x.id = mentor.id | x]) AS sharedProjects
ORDER BY sharedProjects DESC, mh.level DESC, mentor.name ASC
WITH p, roleId, s, req, currentLevel, headStart,
     collect(CASE WHEN mentor IS NULL THEN null ELSE { … } END)[0] AS bestMentor
RETURN roleId, s.id AS skillId, req.minLevel AS requiredLevel, currentLevel,
       req.minLevel - currentLevel AS gap, headStart, bestMentor AS mentor
```

Three ideas resolved together: the gap (a property comparison), the head start
(a two-hop hop out through `ADJACENT_TO` and back through `HAS_SKILL`), and the
mentor (a filtered scan ranked by a *collaboration* count that is itself a
two-hop pattern). `collect(...)[0]` after an `ORDER BY` is the portable way to
take a best-of-group without a correlated subquery.

The output is the difference between "you lack ETL" and "you already know Spark
at level 4, which is 70% transferable — ask Priya, you shipped DAT-5 together."

---

## 3. Hidden experts — ranked by social distance

**Screen:** Project detail · **File:** `cypher/projects.ts`

People qualified for a project's requirements who are *not* on it, ranked by how
close they already are to the team.

```cypher
MATCH (pr:Project {id: $id})-[req:REQUIRES]->(s:Skill)
MATCH (cand:Person)-[hs:HAS_SKILL]->(s)
WHERE hs.level >= req.minLevel AND NOT (cand)-[:WORKED_ON]->(pr)
WITH pr, cand,
     collect({skillId: s.id, name: s.name, level: hs.level}) AS matchedSkills,
     sum(req.importance * hs.level) AS rawScore
WITH pr, cand, matchedSkills, rawScore,
     [(cand)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(m:Person)-[:WORKED_ON]->(pr) | m] AS firstDegree
WITH pr, cand, matchedSkills, rawScore, firstDegree,
     CASE
       WHEN size(firstDegree) > 0 THEN 1
       WHEN size([(cand)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(:Person)
                  -[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(m2:Person)-[:WORKED_ON]->(pr) | m2]) > 0 THEN 2
       ELSE 3
     END AS distance
ORDER BY distance ASC, rawScore DESC
RETURN cand, distance, matchedSkills, [x IN firstDegree | …][0..3] AS connectedVia
```

Distance 1 means they have shipped with somebody on the project; distance 2 is a
friend-of-a-friend; distance 3 means nobody on the project has ever heard of
them. The five-hop pattern in the middle is what a relational schema would need
three self-joins of a membership table to express — and it would still not give
you the connecting person, which is what makes the suggestion actionable.

---

## 4. Single points of failure

**Screen:** Key-person risk · **File:** `cypher/insights.ts`

Skills a live project depends on where exactly one person is at expert level —
plus the nearest understudy, so the answer includes the remedy.

```cypher
MATCH (s:Skill)<-[req:REQUIRES]-(pr:Project)
WHERE pr.status IN ['active', 'planned']
WITH s, collect({projectId: pr.id, name: pr.name, code: pr.code, importance: req.importance}) AS exposedProjects,
     max(req.importance) AS topImportance
WITH s, exposedProjects, topImportance,
     [(s)<-[hs:HAS_SKILL]-(p:Person) WHERE hs.level >= 4 | p] AS experts
WHERE size(experts) = 1
WITH s, exposedProjects, topImportance, experts[0] AS expert
OPTIONAL MATCH (understudy:Person)-[uh:HAS_SKILL]->(s)
WHERE understudy.id <> expert.id
…
RETURN s.id AS skillId, expert, exposedProjects, understudy,
       topImportance * size(exposedProjects) AS severity
ORDER BY severity DESC
```

---

## 5. Departure impact — "what breaks if they leave?"

**Screen:** Key-person risk · **File:** `cypher/insights.ts`

```cypher
MATCH (p:Person {id: $personId})-[:WORKED_ON]->(pr:Project)
WHERE pr.status IN ['active', 'planned']
WITH p, pr,
     [(pr)-[req:REQUIRES]->(s:Skill)
      WHERE size([(p)-[ph:HAS_SKILL]->(s2:Skill)
                  WHERE s2.id = s.id AND ph.level >= req.minLevel | s2]) > 0
        AND size([(pr)<-[:WORKED_ON]-(o:Person)-[oh:HAS_SKILL]->(s3:Skill)
                  WHERE s3.id = s.id AND o.id <> p.id AND oh.level >= req.minLevel | o]) = 0
      | {skillId: s.id, name: s.name, minLevel: req.minLevel}] AS orphanedSkills
WHERE size(orphanedSkills) > 0
RETURN pr.id AS projectId, pr.name AS name, orphanedSkills
ORDER BY size(orphanedSkills) DESC
```

The nested pattern comprehension counts *everyone else on the same project* who
also meets the requirement, and keeps the requirement only when that count is
zero. Two levels of correlated existence check, expressed inline.

---

## 6. Degrees of separation across three relationship types

**Screen:** Connections · **File:** `cypher/people.ts`

```cypher
MATCH (a:Person {id: $fromPersonId})
MATCH (b:Person {id: $toPersonId})
MATCH path = shortestPath((a)-[:WORKED_ON|MENTORS|REPORTS_TO*1..8]-(b))
RETURN [n IN nodes(path) | {labels: labels(n), id: n.id, name: coalesce(n.name, n.title), …}] AS pathNodes,
       [r IN relationships(path) | type(r)] AS pathTypes
```

The traversal mixes shared projects, mentorship and reporting lines because a
useful introduction path uses whichever is shortest. The service layer then
collapses `Person → Project → Person` into a single "shared project" hop, which
is how a person would describe it.

**The relational version:** a recursive CTE over the `UNION` of three join
tables, with an accumulated visited-set to prevent cycles, then a `MIN` on
depth. It is the textbook example of a query graph databases exist to make
ordinary.

---

## 7. Project candidate scoring with adjacent-skill credit

**Screen:** Project detail · **File:** `cypher/projects.ts`

Scores every person not on a project against its requirements, giving partial
credit (45%) when they hold a *neighbouring* skill at the required level rather
than the exact one, and breaking ties by whether they already know the team.

```cypher
MATCH (pr:Project {id: $id})-[req:REQUIRES]->(s:Skill)
WITH pr, collect({id: s.id, name: s.name, minLevel: req.minLevel, importance: req.importance}) AS reqs
WITH pr, reqs, reduce(total = 0.0, r IN reqs | total + r.importance) AS maxScore
MATCH (cand:Person) WHERE NOT (cand)-[:WORKED_ON]->(pr)
WITH pr, reqs, maxScore, cand,
     [r IN reqs WHERE size([(cand)-[hs:HAS_SKILL]->(x:Skill)
                            WHERE x.id = r.id AND hs.level >= r.minLevel | x]) > 0 | r.id] AS directIds,
     [r IN reqs WHERE … AND size([(cand)-[ahs:HAS_SKILL]->(a:Skill)-[adj:ADJACENT_TO]-(t:Skill)
                                  WHERE t.id = r.id AND ahs.level >= r.minLevel
                                    AND adj.similarity >= 0.6 | a]) > 0 | r.id] AS adjacentIds
…
```

---

## 8. Collaborators — derived, never stored

**Screen:** Person detail · **File:** `cypher/people.ts`

```cypher
MATCH (p:Person {id: $id})-[:WORKED_ON]->(pr:Project)<-[:WORKED_ON]-(other:Person)
WHERE other.id <> p.id
WITH other, count(DISTINCT pr) AS sharedProjects, collect(DISTINCT pr.name) AS sharedProjectNames
ORDER BY sharedProjects DESC
RETURN other, sharedProjects, sharedProjectNames
```

---

## Parameterisation

There is no string interpolation of user input anywhere in the codebase. Queries
are frozen at module load:

```ts
export const GET_PERSON = defineQuery('people:detail', `MATCH (p:Person {id: $id}) …`);
```

and executed with a separate parameter object:

```ts
await readOne(GET_PERSON, { id }, mapPerson);
```

Two structural guarantees back this up:

1. `read` / `readOne` / `write` accept a `CypherQuery`, which only `defineQuery`
   can produce — a bare string does not typecheck.
2. Composition happens only from hard-coded fragments in `cypher/fragments.ts`
   (for example the `personSummary('p')` projection), evaluated once at import.
   The rare case where Cypher genuinely cannot parameterise an identifier —
   a dynamic label or relationship type — goes through
   `defineQueryFromTemplate`, which requires an explicit allow-list.

Request input is additionally validated by zod schemas in
`middleware/validate.ts` before it becomes a parameter, so `limit` is bounded
and ids must match a slug pattern.

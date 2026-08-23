# Grammar Curriculum Handoff

## Delivered data contract

The canonical grammar bank now contains **139 unique lesson templates**. The new
`grammar-curriculum-v1.json` provides one deterministic ordered map for all CEFR
levels and links each row to a stable grammar `subskill` and template ID.

Level inventory:

| Level | Lessons |
|---|---:|
| A1 | 17 |
| A2 | 17 |
| B1 | 47 |
| B2 | 32 |
| C1 | 19 |
| C2 | 7 |

## A1 ordered pathway

1. Subject, object, and possessive pronouns
2. Verb to be: subject agreement
3. Articles: a, an, and the
4. Plural nouns
5. Demonstratives
6. Possessive adjectives
7. Have got and has got
8. There is and there are
9. Basic prepositions of place
10. Present simple basics
11. Basic question words
12. Can for ability
13. Present continuous basics
14. Past form of be: was and were
15. Past simple regular verbs
16. Some, any, and countability
17. Prepositions of time

The fifteen A1 grammar lessons in `classroom-lessons-v1.json` are all mapped to
these canonical lessons. The ten previously classroom-only concepts now have
four-option canonical templates with CEFR labels, distractor diagnoses, and full
explanations.

## Files

- `grammar-templates.json`: existing 129 templates preserved; 10 A1 templates added.
- `grammar-curriculum-v1.json`: ordered curriculum, prerequisites, source mapping, and level counts.
- `grammar-curriculum-test.js`: schema, inventory, order, prerequisite, level, and classroom coverage gate.
- `GRAMMAR-CURRICULUM-REPORT.json`: machine-readable test report.
- `grammar-quality-audit.js`: inventory and runtime question expectations now derive from the data count instead of a hard-coded 129.

## Verification

```text
node grammar-curriculum-test.js   PASS: 12/12
node grammar-quality-audit.js     PASS
```

The runtime audit now expects 139 × 25 = 3,475 generated grammar questions.

## Integration requirements for the deploying AI

1. Load `grammar-curriculum-v1.json` before rendering Grammar Hub.
2. Resolve the active learner level once, then filter curriculum rows and all
   learning-domain content through that resolver.
3. Render grammar lessons using curriculum `sequence`, never `Object.keys(G)`
   or fetched object insertion order.
4. Keep option shuffling inside a lesson. Do not shuffle lesson order.
5. Treat `lessonId` as the runtime `subskill` key and `templateId` as the source
   template identity.
6. Keep learner progress keyed by lesson/subskill. Changing active level must
   not delete progress from another level.
7. Placement may read across CEFR levels; ordinary learning panels may not.

# Global learner-level contract

The Speaking + Listening sidecar and the standalone Classroom state machine now
accept the same host-owned level contract. The supported values are `A1`, `A2`,
`B1`, `B2`, `C1`, and `C2`.

## Host integration

Pass the current learner level when creating each runtime:

```js
const activeLevel = getActiveLearnerLevel();

const skills = await FiezelSLAddon.create({
  root: skillsRoot,
  activeLevel,
  baseUrl: './features/speaking-listening/'
});

const classroom = FiezelClassroom.createSession(pack, { activeLevel });
```

For a runtime that stays mounted while the learner can change level, use a
getter. The getter remains the single source of truth and the sidecar does not
render a second level picker:

```js
const getActiveLevel = () => learnerPreferences.activeLevel;

const skills = await FiezelSLAddon.create({ root: skillsRoot, getActiveLevel });
const classroom = FiezelClassroom.createSession(pack, { getActiveLevel });
```

When the host changes the level, either recreate the runtime or call the
explicit setter. A switch resets the in-progress lesson/session so content from
the previous level cannot leak into the new track:

```js
skills.setActiveLevel('A2');
classroom.setActiveLevel('A2');
```

`initialLevel` is supported as an alias for `activeLevel` for callers that only
know the level at first mount. Invalid explicit values fall back to `A1` rather
than exposing all levels. Callers that provide no level contract keep the legacy
behavior: Skills Lab shows its local picker and Classroom exposes the complete
pack. This preserves older integrations while allowing the main app to enforce
one global level.

## Runtime guarantees

- Speaking and Listening always load items from the host-selected level.
- A domain-level argument cannot override an external `activeLevel` contract.
- The Skills Lab local picker is bypassed when the host owns the level.
- Classroom categories only show categories with lessons in the active level.
- Classroom cannot deep-link to a lesson outside the active level.
- Dynamic level changes reset stale Classroom and Skills Lab session state.
- Existing callers without the contract remain backward compatible.

## Verification

The focused contracts are covered by:

```text
node speaking-listening-test.js
node classroom-test.js
```

Both suites pass after the change. The tests cover normalization, static and
dynamic level selection, cross-level isolation, level switching, picker bypass,
and legacy behavior.

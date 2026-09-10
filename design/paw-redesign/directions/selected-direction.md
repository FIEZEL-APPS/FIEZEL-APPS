# Selected Direction — Gate Decision

**Selected: Direction C — PAW EXPRESSIVE**, built on Direction A's structural repairs, with two low-risk cleanups cherry-picked from Direction B.

## Decision matrix (self-scores, verified against renders)

| Criterion | A Evolution | B Modernization | C Expressive |
|---|---|---|---|
| Recognizability | 5 | 4.5 | 4.5 |
| Personality | 3 | 4 | **5** |
| Scalability | 4 | 5 | 4 |
| Animation potential | 4 | 4.5 | **5** |
| Brand fit (checklist /42) | 42 | 39 | 40 |
| Implementation complexity (5 = easiest) | 5 | 3 | 2.5 |

## Rationale

1. The master prompt's center of gravity is the character SYSTEM: 14 expressions (§8), 15 states (§11), motion (§12–13), reactions (§19–22), speech/visemes (§23–24). These all depend on rig bandwidth. Direction C is the only direction that delivers it: a 16-parameter transform-only rig (lid+pupil separation, first-class brows, 9-shape mouth set incl. sp1/sp2 visemes, ±14–18° ear rotation, 2-bone tail, shoulder-pivot arms).
2. Direction A's repairs (fixed group nesting, blink lids, fz-head group, stable IDs, #EDB93A shade unification) are included in C by construction. A alone does not advance expressiveness (personality 3).
3. Direction B's proportion rebalance is attractive but has the widest blast radius (motion-CSS head-crop constants, 178%/-8% placement pattern, all duplicate copies) for payoff that is orthogonal to the character-system goals. Deferred as a possible later phase.
4. Same-character test verified by orchestrator on renders: C's concept is unmistakably PAW (identical head, ears, blush, muzzle, chest paw emblem, tail ring, closed palette).

## Adopted from B (low-risk cleanups only)

- Remove the left-arm 4%-black stain artifact.
- Rebuild feet as clean pill capsules.

## Not adopted

- B's head/body ratio change (0.66 → 0.64) and torso widening — out of scope for this cycle.

## Binding notes for Wave 3

- Geometry base: `directions/direction-c.svg` rig + `direction-c-expressive.md` parameter table.
- Rotation-free body language (translate/scale only) is stricter than current motion CSS and is the new rule.
- Closed palette (8 sanctioned hexes), circles/capsules/triangles grammar, no outlines, no gradients, no new accessories.
- Cuteness-risk guard (checklist E2): expressions must stay companion-like, not infantile.
- Multi-copy drift risk (E5): every Wave 3 spec must reference ONE canonical rig source (the fiezel-mascot.js component) and treat static twins as generated exports.

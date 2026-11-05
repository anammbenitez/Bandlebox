# Design

## Context

`Bough.astro` currently rebuilds the full painted composition: four corners, the top and bottom runs, repeating side vines, seeded sprigs, and a hanging side cutting, all placed in `cqw` against the frame's own width. `global.css` adds an inset machined rectangle and a 1px edge line, and switches the browser frame to a canopy below `lg`. The painted pack ships as four corner crops plus four edge runs and four sprigs; only the corners are needed for this change.

The two frames are used only on `/decks/build`: the browser frame at `quiet`, the deck sheet at `lit`. The deck sheet and browser both scroll inside their frames at `lg+`, and both already carry a bottom fade. The panel content is inset by `10.6cqw`.

See `proposal.md` for motivation and `specs/deck-manager/spec.md` for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Keep the painted hand at the four elbows only, with each arm dissolving before it reaches the middle of an edge.
- Keep the frame proportional at every panel width and keep the painted wood out of the content's way.
- Leave one durable rule in the design record and one testable requirement, so the next UI pass does not rebuild a full border.
- Remove the code, assets, and rules that only existed to run or repeat an edge.

**Non-Goals:**

- Changing the deck manager's grid, viewer width, card sizes, or content inset.
- Recoloring or redrawing the painted art.
- Touching the site nav and footer rails; they are page chrome, not container borders, and keep their vector branch and hanging sprig.
- Changing deck behavior, storage, or data.

## Decisions

### 1. Mask each corner with one radial fade, not a clip

Each of the four corner pieces gets a radial gradient mask anchored at its outer corner: opaque through the elbow, falling to transparent before the arm reaches the visible limit. Mirrored anchors for the four pieces: top-left at `0 0`, top-right at `100% 0`, bottom-left at `0 100%`, bottom-right at `100% 100%`.

Why a radial mask:

- A `linear-gradient` pair needs `mask-composite: intersect`; the intersection multiplies both axes and dims the elbow, which is the part that must stay strongest.
- A `clip-path` leaves a hard diagonal edge, exactly what the fade is meant to avoid.
- An overlay gradient cannot fade the art to the panel's own gradient background without a color seam.

The mask is decorative: if a browser does not support `mask-image`, the corner still renders with visible arm ends. That is an acceptable fallback for an ornament, and it is still far lighter than the full border.

The corner pieces keep their registered crops and `cqw` sizes. The bottom pieces are wider (27.16cqw) than the top (20.2/18.8cqw), so their masks fade sooner; the visible arm length is tuned to read as one corner detail rather than two sizes of corner.

### 2. Remove the full inner line with the full border

The inset machined rectangle (`.bough::after`) and the 1px inset edge in the panel's box-shadow are continuous borders. Keeping them would leave a full rectangle around a corner-only frame and undercut the request. Both are removed. Depth comes from the existing background gradient, the soft outer shadow, and a soft inset shade — no hard line.

Alternative kept in reserve: a faint full hairline (not a shadow line) if the panel loses its edge on the dark page at 2560. The design record should call it out as a fallback, not the default.

### 3. Keep the content inset at `10.6cqw`

Removing the side vines does not remove the corners' vertical arms, which still occupy the first ~18.5cqw of the top and bottom. Reducing the inset would let the first filter row or ledger sit under a fading arm. The inset stays as-is; this change is about the frame's weight, not about reclaiming card width. If the card grid is revisited later, the inset is the lever.

### 4. Collapse the `Bough` API to `tone`

With no cuttings and no side rails, `seed` and `density` have nothing left to control. The component becomes `tone: 'bark' | 'lit' | 'quiet'`:

- `lit` for the deck sheet (the current `tone="lit"`).
- `quiet` for the browser (the current `density="quiet"` grade, promoted to a tone).
- `bark` remains the default for any future frame.

The PRNG, the cutting model, the sprig imports, and the `seed`/`density` props are deleted. `/decks/build` passes only the tone.

### 5. Remove the edge assets once nothing references them

The edge runs and the sprigs that only fed the full frame are deleted from `src/assets/wood/`. The four corners stay. `sprig_vertical_left.png` stays because the nav's painted hanging vine still uses it; every other sprig and edge image is checked for references before deletion.

### 6. Retire the full-frame rules; record the corner rules

`DESIGN.md` is the durable design record. The bough section is rewritten around the new rules and explicitly retires the ones that no longer hold:

- **Keep**: registration (each corner keeps its crop and sits at its canvas-relative place), width-relative scaling in `cqw`, undistorted paint (no stretch, rotation, mirror, or recolor), the light direction, the content inset, and the `lit`/`quiet` hierarchy.
- **Retire**: compressing runs along the grain, repeating side vines, seeded cuttings, the canopy fallback, and the full inner line.
- **Add**: the corner is the whole frame; an arm fades before it reaches the middle of its edge; never run, tile, or stretch a painted edge to fill a panel.

A short note in `AGENTS.md` points UI work at `DESIGN.md` and states the corner-accent rule in one sentence, so other chats inherit it without reading this change. The deck-manager requirement is the enforcement point.

## Risks / Trade-offs

- **A bare edge can read as an unfinished panel** → The corners still anchor all four angles, the outer shadow holds the panel's silhouette, and a soft inset shade replaces the hard line. Verify at 1440 and 2560 before deciding whether a faint hairline is needed.
- **A fading arm can sit over a filter row or ledger cell** → The painted pieces sit above the content in z-order by design, so the inset and the mask are the guarantee: keep the `10.6cqw` inset and tune the arm to be effectively transparent by the content line. Verify at 390, 1024, and 1440 with real decks.
- **Corner masks are unsupported** → The decorative fallback is the unmasked corner with visible arm ends; the layout and content are unaffected.
- **The bottom corners meet the deck sheet's foot fade** → The fade's inset starts where the horizontal arms already are; verify the overlap at 1440. If the fade cuts an arm, shorten the fade or fade the corner sooner.
- **The frame becomes too subtle to notice** → The elbows stay at full strength and keep the `lit`/`quiet` grade; the detail is intentionally quiet. If it disappears at phone width, the corner scale is the lever, not a return to edge runs.
- **Two frames now look alike at the corners** → Intended: the tone difference carries the hierarchy. The seeded variation was what made the full border feel grown; it has no role in a corner detail.

## Migration Plan

Pure UI and documentation change; no data or storage migration. Deploy with the next build. Rollback is a revert of the component, styles, page props, assets, design record, and spec delta. The old full-frame assets remain in git history if the direction is reversed.

## Open Questions

None. Corner scale and mask stops are visual tuning values, settled against screenshots during implementation without changing the approach or the spec.

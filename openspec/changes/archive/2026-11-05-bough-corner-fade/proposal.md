# Proposal

## Why

The painted bough currently runs a continuous wood border around both deck-manager columns: top and bottom branch runs, side vines repeated down the full height, seeded sprigs, and a machined inner rectangle. It proves the asset pack, but at working size it reads as a heavy picture frame, competes with the card art, and takes about a fifth of each column's width. The strongest marks in the pack are the four elbows; the straight runs are the part that has to be stretched, repeated, or hidden.

The change keeps the painted wood only where it is strongest — the corners — and fades each arm out toward the middle of its edge, so the frame becomes a detail at the edge of the work rather than a border around it.

The same work also closes a rule gap. `DESIGN.md` currently records the full-frame rules (side vines repeat, seeded cuttings, canopy fallback) as the intended design. Left as-is, the next UI pass would rebuild exactly what this change removes. Those rules are retired and replaced with the corner-accent rules, and the deck-manager spec gains one requirement so the behavior has a durable contract.

## What Changes

- **Corner-only bough.** Keep the four corner pieces; remove the top run, bottom run, repeating left and right vines, their seeded cuttings, the hanging side cutting, and the below-`lg` canopy fallback.
- **Fade toward the middle.** Mask every corner with a soft radial fade anchored at its elbow. The elbow stays opaque and each arm dissolves to transparent before the midpoint of the adjacent edge, so no cut end is visible and no edge is fully framed.
- **Retire the continuous edge treatment.** Remove the full inner machined rectangle and the inset hairline border. Panel depth comes from the existing background grade and outer shadow; the corners are the only drawn edge.
- **Keep the tone hierarchy.** The deck sheet stays warmer (`lit`) and the card browser calmer (`quiet`); only the perimeter art changes. The `Bough` API collapses to `tone` — the `seed` and `density` props and the deterministic generator go away with the cuttings.
- **Drop unused paint from the shipped pack.** The edge runs and the sprigs that only fed the full frame are removed once no surface references them; the nav's hanging vine keeps the one sprig it uses.
- **Persist the rules.** Rewrite the bough section of `DESIGN.md` around corner accents, retire the tiling/seed/canopy rules, and add a short design-work pointer to `AGENTS.md` so future UI passes read the design record before touching the frame.
- **No functional deck behavior changes.** Deck state, section placement, filters, drag and drop, sharing, and legality are untouched.

## Capabilities

### New Capabilities

None. The durable behavior belongs to the existing deck-manager surface, and the general design rules are documentation rather than a new system capability.

### Modified Capabilities

- `deck-manager`: adds a requirement that the painted bough is a corner accent — four corners only, fading to transparent before each edge's midpoint, never a continuous border, tiled vine, or seeded ornament, and never overlapping the panel's content at any width or panel height.

## Impact

- `src/components/Bough.astro` — corner-only markup, fade masks, simplified props.
- `src/styles/global.css` — bough geometry and grades, corner masks, removal of run/rail/cutting/canopy rules and the inner line.
- `src/pages/decks/build.astro` — drop the `seed` and `density` props from the two frames.
- `src/assets/wood/` — remove the edge runs and now-unused sprigs; keep the four corners and the nav's hanging sprig.
- `DESIGN.md` — replace the full-frame section with the corner-accent rules.
- `AGENTS.md` — add the design-work pointer.
- `openspec/specs/deck-manager/spec.md` — one added requirement.
- `src/layouts/Base.astro` and `src/components/BoughSprite.astro` — the nav and footer rails are not container borders and keep their current treatment; only a reference check is needed.

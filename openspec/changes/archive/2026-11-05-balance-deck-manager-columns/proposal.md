# Proposal

## Why

The deck manager's desktop workspace currently lets the deck viewer be dragged wider or narrower, so the card browser and the deck sheet rarely read as equal halves: the viewer starts at a fixed 520px while the browser absorbs everything else, and a drag can starve either side. The user asked for the two containers to stay the same size. With the drag removed, the 12px grip column becomes dead space; the user also asked that the middle of the workspace be decorated with the project's woodland assets so the split reads as part of the Bandlewood desk rather than an empty control gap.

## What Changes

- **BREAKING** — Remove the draggable deck-viewer width grip and the persisted viewer-width preference. The viewer is no longer user-resizable on the desktop layout.
- Fix the desktop two-column layout to equal widths: after the center seam, the card browser and the deck viewer each take half of the remaining workspace. Both panels keep their current viewport-confinement and independent scrolling.
- Replace the 12px grip column with a decorative center seam that carries the existing painted hanging sprig and dissolving vertical billets. The seam is decorative only, sits outside both panels, and is not a frame edge: it uses one sprig, never a tiled vine or a continuous border.
- Below the large-screen breakpoint, where the browser and viewer swap as full-width panes, keep the current single-pane behavior and show no seam.
- Update `DESIGN.md` to record the equal split and the seam rules, and add a deck-manager requirement that fixes the equal columns and describes the seam's limits.
- Remove the now-obsolete adjustable-width and width-responsive requirements from the deck-manager capability, and amend the requirements that referenced dragging or a default viewer width.

## Capabilities

### New Capabilities

None. The behavior belongs to the existing deck-manager surface; the decorative seam is a presentation rule of that same capability.

### Modified Capabilities

- `deck-manager`: replaces the user-adjustable viewer width and its persistence with fixed equal columns; adds the decorative center seam between the two desktop panes; removes drag-based wording from the container-sizing and field-zone requirements.

## Impact

- `src/pages/decks/build.astro` — the three-track grid becomes equal browser / seam / viewer tracks; the grip element is removed and the seam element is added.
- `src/scripts/deck-builder.ts` — the grip pointer handlers, bounds, clamping, and `riftbound-deck-viewer-width` storage code are deleted.
- `src/styles/global.css` — grip styles are removed; the center-seam composition and its fade rules are added.
- `src/components/` — the painted sprig is loaded for the seam (either a small dedicated component or the deck page's frontmatter); no change to `Bough.astro`'s corner treatment.
- `DESIGN.md` — the layout and bough sections record the equal split and the seam as a gutter ornament, distinct from the corner-only frames.
- `openspec/specs/deck-manager/spec.md` — delta spec removes the adjustable-width requirements and adds the equal-column and seam contract.
- No deck data, sharing, legality, filtering, or card behavior changes. The old local-storage key becomes inert and needs no migration.

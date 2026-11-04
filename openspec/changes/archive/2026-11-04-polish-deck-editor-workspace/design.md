# Design

## Context

The deck editor already has: a viewport-fit, user-resizable two-column workspace (`add-resizable-deck-viewer`, in flight — sticky columns with internal scrolls, grip-driven `--deck-viewer-w`, section rows as `auto-fill minmax(4rem,1fr)`); a browser grid still fixed to breakpoints (`grid-cols-3 sm:4 lg:5 xl:6 2xl:7`); card impressions that are full printed card faces (name/text are baked into the raster art), so card size ≡ label legibility; sections rendered by `renderSections()`/`rowHtml()`/`legendCardHtml()` in `deck-builder.ts`; and deck state `{ id, name, sections… }` persisted by `deck-store`, shared via `encodeDeck`/`decodeDeck`. See proposal.md for the why and specs for the what.

## Goals / Non-Goals

**Goals:**
- Site nav fixed; deck-editor chrome sticky in context.
- Browser grid sized by its container with a comfortable minimum card size.
- Champion zone per the user ruling; chip relocated to the Champion card.
- Field-zone viewer layout; wider default viewer; ~5 columns of duel-sized main-deck cards on desktop.

**Non-Goals:**
- No changes to legality formulas, section rules, or the five-section deck model (champion copies remain main-deck copies — spec'd in deck-manager, not deck-legality).
- No collapsible sections / drag-sorting of zones (inspiration image showed them; not requested).
- No catalog-page changes beyond the shared nav (the new browser sizing targets the deck editor).
- No per-deck viewer width (the global width preference from the in-flight change stays).

## Decisions

- **Nav is sticky-in-flow, not `position: fixed`** — `Base.astro`'s `<header>` becomes `sticky top-0 z-40` (opaque enough to read over content as it scrolls past). Sticky keeps the header in document flow, so no body padding/height math is needed and wrapping at narrow widths stays natural; visually it is "fixed on scroll" as requested. Alternative rejected: `fixed` + measured padding — breaks on nav text wrapping and needs JS top-offset bookkeeping.
- **Editor chrome sticks by measuring, once** — the deck name/meta/actions bar sticks under the nav with `top: var(--nav-h)`, where `--nav-h` is set once from the rendered nav height (and on resize) from a few lines of script; below `lg` this is the main scrolling surface, at `lg`+ it only matters when the page itself scrolls. The browser's pill/filter rows stick inside the browser column at `lg`+ (`sticky top-0` inside its own scroller); below `lg` they follow the page (the delegated "best solution": sticky within their real containers instead of new fixed overlays).
- **Browser grid goes container-driven** — `#bd-list` switches from breakpoints to `repeat(auto-fill, minmax(8rem, 1fr))` (floor ≈ printed-label legibility; tuned in implementation). This composes with the viewer grip: dragging the viewer wider instantly reflows the browser to fewer-but-bigger cards, as the browser column predicate changes width with the split.
- **Champion slot rides on deck state, outside the sections** — an optional `champion?: string` (card slug) on `Deck`; `deck-store` and `encodeDeck`/`decodeDeck` treat it as optional (unset = empty zone; legacy stored decks and older share payloads open unchanged, spec'd in deck-library). Copies are never duplicated: zone + / − / remove mutate `deck.main` through the existing cap gate, so the main-deck count and the champion-unit legality rule see them exactly once. Designation clears when its copies all leave the main deck.
- **Zone placement is a zone-directed action** — the Champion area is a drop target and carries its own placement control; the browser's plain click-add keeps routing champion units to the main deck (main-only additions never hijack the slot). Dragging a tag-matching champion unit to the zone places (or replaces) the pick; a non-matching champion is visibly refused like other vetted drop targets.
- **Viewer layout restructure, presentation only** — the viewer keeps its five data sections plus the champion presentation: top row = Legend (no chip on the face; replaceable by placing another legend) and the empty/picked Champion card with the relocated copy chip; Battlefields become a horizontal row of landscape (`aspect-[7/5]`) faces; the main-deck grid floor rises from `4rem` to ≈`5.6rem` so the default-width panel shows ≈5 larger cards per row (plus the ≈9-column state dies); rune/side rows and the checklist keep their auto-fill behavior. The viewer default width widens (≈520px) and the grip's upper bound loosens accordingly (≈880px or the existing half-viewport cap), keeping the resizable spec's shape.

## Risks / Trade-offs

- [Champion placement via browser click does not claim the zone] → Deliberate; zone-directed placement (drop or zone control) is explicit and predictable. Mitigation if feedback disagrees: route click-adds of the first tag-matching champion to the zone (small follow-up).
- [Optional `champion` field must not break old share links / stored decks] → Tolerant reads everywhere; normalization unit-verifiable in the existing `scripts/verify-deck-core.mjs` run.
- [Legend clearing loses its affordance when the face chip is removed] → Replace-only covers correcting a wrong legend; whether a dedicated remove-legend action is still wanted is a deferrable Open Question.
- [Raster cards at the 8rem floor may still read small on dense monitors] → Floor is one tuned constant; the spec's "comfortable minimum" is judge-able behavior verified at the bounds during implementation.
- [Sticky chrome stacking], the nav must stay above the deck's sticky bar and the browser's own sticky filters → Single z-index layering (nav z-40, page sticky below), verified across the breakpoint.

## Migration Plan

Ship with the nav sticky (no layout math), chrome/grid changes confined to the deck editor page, and the optional deck field read tolerantly (no migration for stored decks or old links). Rollback = revert; an unset champion field is inert everywhere.

## Open Questions

- Does a legend-clear affordance remain desirable now that the face chip is gone (decks currently always return to a no-legend state via that chip)? Replace-only is assumed for v1.
- Final tuned numbers (browser floor, viewer default/upper bound, main-deck row floor) are bounded in tasks and verified against the spec scenarios; exact px are implementation freedom.

# Tasks

## 1. Fixed site navigation

- [x] 1.1 In `src/layouts/Base.astro`, pin the header nav (`sticky top-0 z-40` per design) with an opaque-at-scroll backdrop, and verify on a tall page (cards catalog) the nav stays in place on scroll with links usable and no content permanently hidden under it (spec: "Main navigation stays fixed on scroll")
- [x] 1.2 Verify every existing page (home, sets, cards, decks, deck builder) still lays out correctly under the pinned nav, including the deck page's independent scrolled columns; `npm run build` passes

## 2. Sticky editor chrome

- [x] 2.1 In `src/pages/decks/build.astro` + `deck-builder.ts`, measure the nav height into a `--nav-h` custom property (refresh on resize) and make the deck name/meta/actions bar sticky at `top: var(--nav-h)`; verify it stays visible crossing the breakpoint and page scrolling (below `lg`, and near the footer at `lg+`) (spec: "Page-level scroll keeps the deck identity visible")
- [x] 2.2 Make the browser's pills/filter rows sticky inside the browser column at `lg+` (`sticky top-0` within its own scroller) and verify they remain visible while scrolling a multi-window card list without crawling over the deck's sticky name bar (spec: "Scrolling the browser keeps its filters")

## 3. Responsive browser cards

- [x] 3.1 In `build.astro`, switch `#bd-list` from `grid-cols-3 sm:… xl:6 2xl:7` breakpoints to `repeat(auto-fill, minmax(<floor>, 1fr))` (floor ≈ 8rem, tuned per design) and verify column count follows the container: more columns as the window widens and as the viewer drag narrows the browser, fewer without clipping the printed labels (spec: "More width, more columns")
- [x] 3.2 Verify at the narrow bound (viewer dragged to its max) cards stay at or above the minimum comfortable size with labels readable (spec: "Narrow width respects the minimum size")

## 4. Champion zone

- [x] 4.1 In `src/lib/deck.ts` + `deck-share.ts` + `deck-store.ts`, add the optional `champion` pick (card slug) to deck state; keep reads tolerant (absent field = empty zone) and verify via the existing `node scripts/verify-deck-core.mjs` run plus round-trip assertions covering: place → persist → reload → pick intact; legacy deck opens with empty zone (spec: "Champion pick survives a reload", "Legacy decks open unchanged", "Stale champion pick keeps the deck open")
- [x] 4.2 Implement the Champion zone presentation in the viewer: a card-sized slot to the right of the Legend with an empty placement state and a zone-directed placement (drop target + zone control), refusing champions of a different tag like other vetted drop targets, and replacing the pick when a tag-matching champion is placed (spec: "Placing the deck's champion", "Zone accepts only the Legend's tag")
- [x] 4.3 Wire the chip to the Champion card: minus/count/plus and remove controls mutate `deck.main` through the existing cap gate (max 3 per name); verify placing the same champion to a playset shows 3 in the zone, the Main deck counter counts exactly 3, and legality (champion-unit rule, copy cap) reacts with no doubled entries (spec: "Playset counts in the main deck", "Copy chip lives on the champion card")
- [x] 4.4 Strip the copy chip off the Legend card face (`legendCardHtml`), keep legend replacement working (placing another legend replaces), and verify no chip remains on the Legend card at desktop sizes (spec: "Copy chip lives on the champion card")
- [x] 4.5 Verify share round-trips carry the champion pick: encode → open link → zone reconstructs with copies counted as main-deck copies (spec: "Shared champion reconstructs the zone"); stale `champion` slug keeps the deck open

## 5. Viewer field-zone layout

- [x] 5.1 Rebuild the viewer's top zone: Legend card and Champion zone side by side as the first zone in the panel, responsive to the panel width; verify at the default width both halves fit and no later zone overlaps (spec: "Legend and Champion share the top row")
- [x] 5.2 Present Battlefields as a horizontal row with each card landscape (`aspect-[7/5]`, no rotated crops) and verify up to all three fit on one row at the default width, reflowing if the panel narrows (spec: "Battlefields lie horizontally")
- [x] 5.3 Raise the main-deck row floor (≈5.6rem per design), widen the viewer default width (≈520px) and the grip's upper bound (≈880px / existing half-viewport cap), and verify on a standard desktop window a full main deck renders ≈5 larger cards per row at default width, staying at the comfortable minimum at the narrow bound — the nine-tiny-columns look is gone (spec: "Main deck reads large")
- [x] 5.4 Re-verify the viewer interactions from the previous change still hold with the new layout: drag resizes/clamps, width persists, contents reflow, columns-built fit kept (`openspec validate` on this change green; visual check across `lg`+ widths)

## 6. Integration checks

- [x] 6.1 Full deck-flow pass at desktop size: browser add/drag, section focus, rune ratio, share link, and persistence all behave with sticky chrome and the redesigned viewer; `npm run build` passes
- [x] 6.2 Full pass below `lg`: stacked layout, sticky name header under the pinned nav, no sticky browser filters, and the page scrolls normally; CDP-driven interactive checks re-run green on: nav pinning, chrome stickiness, browser reflow, champion zone controls, main-deck sizing

## Workflow follow-up

- Archive order matters for the `deck-library` MODIFIED delta: archive `add-deck-builder` first (it creates the deck-library main spec), then this change; the validator's note about a not-yet-existing target spec clears once ordering is respected.

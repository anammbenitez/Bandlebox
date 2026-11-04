# Tasks

## 1. Resizable split layout

- [x] 1.1 In `src/pages/decks/build.astro`, replace the fixed `lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_440px]` on `#deck-app` with a grid driven by `--deck-viewer-w` (default 380px), add the grip element between the browser and the viewer columns, and verify the default layout visually matches the current one at `lg` (and that the old 440px-at-`xl` nicety is subsumed by the wider default or kept as an initial fallback)
- [x] 1.2 Style the grip (col-resize cursor and hover/active state) and confirm it is hidden below the `lg` breakpoint, where the stacked layout is unchanged — verify by resizing the browser window down across the breakpoint

## 2. Drag behavior and bounds

- [x] 2.1 In `src/scripts/deck-builder.ts`, implement grip drag handling (`pointerdown` + `setPointerCapture`, `pointermove` computing the viewer width from the pointer position, `rAF`-throttled writes to `--deck-viewer-w`) and verify dragging widens/narrows the viewer live while the browser column absorbs the remainder (spec: "Dragging the grip resizes the viewer")
- [x] 2.2 Clamp the dragged width between the minimum (~280px) and maximum (~min(720px, half viewport)) bounds and verify the viewer stops at each bound without collapsing, overflowing the window, or stretching past it (spec: "Dragging clamps at the bounds")
- [x] 2.3 Verify the Rune deck's ratio row, section headers/counts, and the checklist remain legible and non-broken at the minimum width, and raise the minimum if the ratio row cannot fit its inputs on one row

## 3. Content reflow

- [x] 3.1 Change section card rows (`ul[data-rows]` in `build.astro`) from `grid-cols-5 xl:grid-cols-6` to an auto-fill track (e.g. `repeat(auto-fill, minmax(<floor>, 1fr))`) with the floor tuned so the default width still shows ≈5 columns, and verify rows show more cards per row when widened and fewer when narrowed, including freshly rendered rows from `renderSections()` (spec: "Widening shows more cards per row", "Narrowing keeps rows usable")
- [x] 3.2 Verify at both bounds that thumbnails, copy chips/controls, and section counts are usable and nothing overflows or is clipped in the viewer (spec: "Narrowing keeps rows usable")

## 4. Persistence

- [x] 4.1 Store the chosen width under a namespaced local-storage key (reusing deck-builder's storage-availability handling), read it on init with bounds clamping, write through the drag path, and verify a reload restores the last chosen width (spec: "Chosen width survives a reload")
- [x] 4.2 Verify behavior when storage is unavailable (or key absent): the viewer opens at the default width, the page works normally, and no error appears (spec: "Missing stored width falls back gracefully")

## 5. Integration checks

- [x] 5.1 Full pass on a desktop-size window: deck flows (add/drag/remove cards, rune ratio writing, section focus, share link) unaffected by the resizable viewer; `npm run build` (or `astro check` per project setup) passes with no template or TS errors
- [x] 5.2 Full pass below `lg`: stacked layout identical to before, no grip rendered or focusable, radar the grip against card drag-and-drop by dragging a card around while the grip is visible to confirm no interference

## 6. Viewport-fit workspace (independent scrolls)

- [x] 6.1 Confine the deck viewer at `lg`+: sticky near the viewport top, `max-height: calc(100vh - <offset>)`, `overflow-y-auto` with contained overscroll — verify a deck whose sections exceed the screen keeps the viewer on screen and scrolls internally (spec: "Sections beyond the screen scroll inside the viewer")
- [x] 6.2 Confine the browser column the same way — verify scrolling the card grid scrolls only that column, scrolling the viewer scrolls only the viewer, and appended card windows are still reachable through the column's own scroll (spec: "The browser scrolls its own card grid", "Appended cards stay reachable")
- [x] 6.3 Cap the grip to the viewport at `lg`+ (sticky as well) and re-verify the drag/clamp behavior still works with the confined layout (spec: "Dragging the grip resizes the viewer", "Dragging clamps at the bounds")
- [x] 6.4 Re-verify below `lg`: stacked full-width layout unchanged, page scrolls through both parts (spec: "Smaller viewports keep the stacked layout")
- [x] 6.5 `npm run build` passes; re-run the interactive CDP checks with the fit layout enabled

# Tasks

## 1. Equal desktop split

- [x] 1.1 In `src/pages/decks/build.astro`, replace the three-track grid with `minmax(0,1fr) var(--deck-seam-w) minmax(0,1fr)`, set `--deck-seam-w: clamp(4rem, 4vw, 6rem)` on `#deck-app`, use `lg:gap-x-2`, and remove `--deck-viewer-w` plus its `xl` override; verify at 1024, 1440, and 1920 that the browser and viewer render at equal widths and the seam track keeps its clamp width.
- [x] 1.2 Remove the `#deck-grip` element, its comments, and the below-`lg` `#deck-grip` display rule from `build.astro`; verify the rendered DOM contains no grip and the stacked pane swap still works at 1023px and below.
- [x] 1.3 Delete the entire resize-grip block in `src/scripts/deck-builder.ts` (`gripEl`, `VIEWER_WIDTH_KEY`, bounds, clamp, apply/read/store, rAF, pointer handlers) while keeping `appEl` for its existing uses; verify `grep -n "deck-viewer-w\|gripEl\|VIEWER_WIDTH" src/scripts/deck-builder.ts` returns nothing and a drag between the panes no longer changes either width.
- [x] 1.4 Remove the `#deck-grip` and `#deck-grip::before` rules from the page's global style; verify the gutter shows the default cursor with no hover highlight and `grep -R "deck-grip" src/pages/decks/build.astro src/styles/global.css src/scripts/deck-builder.ts` returns nothing.
- [x] 1.5 Verify the stale preference is inert: set `localStorage['riftbound-deck-viewer-width']` to a value such as `880` in the browser, reload the deck manager, and confirm the two panels still render equal and no inline `--deck-viewer-w` is applied.

## 2. Center seam decoration

- [x] 2.1 Add `src/components/BoughSeam.astro`: a decorative root with `aria-hidden="true"`, `pointer-events: none`, and `hidden lg:flex`; inside it render the `sprig_vertical_left.png` through `getImage` (WebP, quality 88) at roughly 70% of the seam width, plus top and bottom `#bough-run-v` billets; verify the component renders one sprig and two billets with no interactive element.
- [x] 2.2 Place `<BoughSeam />` in the center grid column of `#deck-app` between the browser and viewer, and add `.deck-seam` styles in `src/styles/global.css` for the sprig, billet placement, and the fading masks; verify at 1024, 1440, and 2560 that the sprig stays inside the gutter and both billets fade out before the seam's midpoint.
- [x] 2.3 Add the short-window rule: hide `.deck-seam` in the existing `max-height: 32rem` media query alongside the painted corners; verify at a 1440×500 viewport that the seam is absent and both panes keep a usable height.
- [x] 2.4 Verify the seam is not a control or a frame edge: tab through the deck manager and confirm the seam is never focused; click and drag on it and confirm the two panels keep their widths; confirm no browser filter, card, ledger cell, deck row, or control is covered at 1024, 1440, and 2560.
- [x] 2.5 Capture desktop screenshots at 1024, 1440, and 2560 with a full deck open; verify the sprig reads as a single hanging cutting, has no halo or stretched aspect, the billets do not join, and the middle of the seam stays bare.

## 3. Design record and comments

- [x] 3.1 Update `DESIGN.md`: in Layout, replace the 12px grip and `--deck-viewer-w` default with the equal split and center seam; in the bough section, add the seam rule (one sprig, dissolving billets, gutter ornament rather than a panel edge, no tiling, hidden below `lg` and in short windows); verify `grep -n "resize grip\|deck-viewer-w" DESIGN.md` returns nothing and the new text matches the implemented seam.
- [x] 3.2 Refresh obsolete code comments in `build.astro`, `deck-builder.ts`, and `global.css` so they describe the equal split and seam instead of the grip or viewer width; verify `grep -R "deck-viewer-w\|resize grip\|user-adjustable" src` returns nothing.

## 4. Integration verification

- [x] 4.1 Run `astro dev --background` and walk through `/decks/build` at 1024, 1440, and 1920: add and remove cards, switch section pills, use the domain filters, drag a card onto a section, open the champion picker, check legality, and copy a share link; verify all interactions behave as before and only the column split and center seam changed.
- [x] 4.2 Check the stacked layout at 390px wide: verify the browser and viewer swap as full-width panes, the seam is absent, each pane scrolls inside its frame, and no horizontal overflow appears.
- [x] 4.3 Run `npm run build` and confirm the build succeeds with the new component and no missing-asset or CSS warnings.
- [x] 4.4 Run the project's impeccable check on the changed `/decks/build` UI and confirm this change adds no new findings; record any pre-existing findings separately instead of fixing them in this change.
- [x] 4.5 Run `openspec validate balance-deck-manager-columns --strict` and confirm the change validates.

## Workflow follow-up

- Archive the change after the implementation and design review are complete.

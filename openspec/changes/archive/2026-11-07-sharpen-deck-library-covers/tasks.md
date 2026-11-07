# Tasks

## 1. Legend payload

- [x] 1.1 In `src/pages/decks/index.astro`, add `coverUrl: imgUrl(imageId, '400w')` (null when no image) to each `legends` entry and keep `url` at `240w`; verify with `npm run build` and by checking the built `dist/decks/index.html` `deck-legends-data` JSON has both `coverUrl` (`-400w.webp`) and `url` (`-240w.webp`) for a sample Legend

## 2. Tile covers

- [x] 2.1 In `src/scripts/deck-list.ts`, add `coverUrl` to `LegendEntry` and use it for the tile `<img>` in `coverHtml()`, leaving `renderLegendList()` on `url`; verify in the built site that a deck tile's `<img>` src ends in `-400w.webp` while the creation modal's picker thumbnails end in `-240w.webp`
- [x] 2.2 Update the tile `onerror` to swap once to the legend's `url` (`240w`, with a `data-fallback` guard) and remove the image on a second failure; verify by forcing load errors in the browser: the tile shows the 240w art, then no broken-image icon with badge and name intact
- [x] 2.3 Check `/decks` with at least one saved deck in the browser: the cover fills its 5:7 face, is visibly sharper than before, and the "no legend chosen" placeholder, the plus tile, and the badges are unchanged

## 3. Integration checks

- [x] 3.1 Run `npm run build`, `.opencode/skills/impeccable/scripts/impeccable.cmd detect src/pages/decks`, `node scripts/verify-deck-core.mjs`, and `node scripts/verify-card-text.mjs`; verify the build passes, the verify scripts pass, and detect reports no new findings related to this change

## Workflow follow-up

- Archive the change with `/opsx:archive` once the checks above pass, so the delta syncs into `openspec/specs/deck-library/spec.md`.

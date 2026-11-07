# Tasks

## 1. Shared image module

- [x] 1.1 Create `src/lib/card-image.ts` (pure: no data or DOM imports, explicit `.ts` relative imports) exporting `OPENRIFT_SITE`, `imageUrl`, the `hero`/`tile`/`thumb` role chains, `imageSources`, `imageDims` (240x335 / 400x559 / 744x1039, swapped when rotated) and `imgAttrs`; verify with `node -e "import('./src/lib/card-image.ts')"` loading without errors
- [x] 1.2 Add `scripts/verify-card-image.mjs` covering URL shape, each role's chain order, dimensions incl. the rotate swap, HTML-escaped handler output, and executing the generated `onerror` on a stub element through the full hero chain (full -> 400w -> 240w -> remove); verify `node scripts/verify-card-image.mjs` passes
- [x] 1.3 Document the module and the new script in `CLAUDE.md` (Commands list and the "pure modules" list); verify the entries match the files' actual names

## 2. Payloads carry imageId

- [x] 2.1 First record the current `grid-data` JSON byte size in `dist/index.html` as the baseline for task 5.2; then in `src/lib/grid-payload.ts` change `GridArt` to `{ imageId, rotate, setSlug }` and build entries from the representative printing's image id; make `catalog.ts` re-export `imgUrl`/`OPENRIFT_SITE` from `card-image.ts` only if a caller still needs them (grep first, delete when unused); verify with `npm run build` and by checking `dist/index.html`'s `grid-data` JSON has `imageId` and no `url` on art
- [x] 2.2 In `src/pages/decks/index.astro` reduce each Legend entry to `{ slug, name, imageId, rotate }` (dropping `url` and `coverUrl`); verify the built `dist/decks/index.html` `deck-legends-data` has `imageId` for all 58 Legends

## 3. Grid and deck manager

- [x] 3.1 In `src/lib/grid-item.ts` build the tile `<img>` from `imgAttrs(art.imageId, 'tile', { rotate })` (replacing the 240x336 literals and the `this.onerror=null` handler) so SSR and client reveals share it; extend `scripts/verify-card-image.mjs` to assert `gridItemHtml` output uses `-400w.webp`, correct width/height and a working fallback attribute, and verify the script passes
- [x] 3.2 In `src/scripts/deck-builder.ts` replace `thumbHtml` and the battlefield row `<img>` with `imgAttrs(..., 'tile', ...)` for every face (browser faces, Legend, Champion, battlefields, main/rune/side); verify with `npm run build` and, in the browser, that faces across the builder request `-400w.webp` and a forced load error removes the image without a broken icon

## 4. Library and detail page

- [x] 4.1 In `src/scripts/deck-list.ts` use `imgAttrs(..., 'tile')` for tile covers and `imgAttrs(..., 'thumb')` for picker thumbnails, deleting the hand-rolled cover handler and the `coverUrl` field from the earlier change; verify tile covers request `-400w.webp` and picker thumbs `-240w.webp` in the browser
- [x] 4.2 In `src/pages/cards/[slug].astro` use `imgAttrs(..., 'hero')` for the main image and `'thumb'` for the printings list, deleting the local `fullUrl`/`midUrl`/`onerror` code from the earlier change; verify the main image still requests `-full.webp` eagerly (no `loading="lazy"`, `fetchpriority="high"`), degrades `full` -> `400w` -> "no art", and printing thumbnails stay `-240w.webp`

## 5. Integration checks

- [x] 5.1 Run `npm run build`, `node scripts/verify-card-image.mjs`, `node scripts/verify-deck-core.mjs`, `node scripts/verify-card-text.mjs` and `.opencode/skills/impeccable/scripts/impeccable.cmd detect` on the changed pages; verify all pass with no findings tied to this change
- [x] 5.2 In the browser check `/`, `/decks`, `/decks/build` and a portrait and a battlefield `/cards/{slug}`: art is visibly sharper than before on each surface, aspect ratios and rotated battlefields are unchanged, and the grid still reveals windows on scroll; also compare `grid-data` byte size against the pre-change build to confirm the payload shrank

## Workflow follow-up

- Archive the change with `/opsx:archive` once the checks above pass, so the deltas sync into `openspec/specs/card-catalog-browser/spec.md`.

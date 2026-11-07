# Tasks

## 1. Detail page main image

- [x] 1.1 In `src/pages/cards/[slug].astro`, point the main image `src` at `imgUrl(shownImageId, 'full')` and drop `loading="lazy"` in favor of `fetchpriority="high"`; verify with `npm run build` and by inspecting the built `dist/cards/<slug>/index.html` that the `<img>` uses the `-full.webp` URL and has no `loading="lazy"`
- [x] 1.2 Flip the `onerror` chain so a failed `full` swaps once to the `400w` URL (keeping the `data-fallback` guard) and a second failure removes the element; verify by blocking the `-full.webp` request in the browser devtools (then both variants) and confirming the `400w` image, then the "no art" placeholder, appear with no broken-image icon
- [x] 1.3 Set the `<img>` `width`/`height` attributes to 744x1039 (portrait) and 1039x744 (rotated battlefields) via the existing `rotateArt` flag; verify no layout shift on load (Lighthouse CLS or visual check of a throttled load)

## 2. Verification

- [x] 2.1 Check a portrait unit, a battlefield, a token and a foil/alt-art card in the dev server at 1x and 2x (devtools device pixel ratio): art is visibly sharper than before, fills its box with the right aspect, and the printings-list thumbnails and grid are unchanged
- [x] 2.2 Run `.opencode/skills/impeccable/scripts/impeccable.cmd detect src/pages/cards` and `node scripts/verify-deck-core.mjs` and `node scripts/verify-card-text.mjs`; verify all pass with no new findings

## Workflow follow-up

- Archive the change with `/opsx:archive` once the checks above pass, so the delta syncs into `openspec/specs/card-catalog-browser/spec.md`.

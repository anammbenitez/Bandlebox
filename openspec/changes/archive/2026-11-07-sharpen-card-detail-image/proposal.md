# Proposal

## Why

The card detail page is where a card is meant to be read and admired, but it shows OpenRift's mid-size `400w` image (400x559) in a ~272-300 CSS px slot. On a 2x display that is about half the pixels needed, so the art and printed text look soft. OpenRift also serves a `full` variant (744x1039, ~100 KB), which is the largest image it offers (no larger sizes, PNG, or AVIF exist), and the app currently uses it only as an error fallback.

## What Changes

- The card detail page's main image requests the `full` variant first and degrades to `400w`, then to the "no art" placeholder, if the file fails to load (the reverse of today's chain).
- The main image is no longer lazy-loaded: it is the primary content of the page, so the browser fetches it immediately.
- The `<img>` width/height attributes match the `full` asset's intrinsic ratio (744x1039 portrait, 1039x744 landscape for battlefields) so layout does not shift.
- Everything else is unchanged: the grid, deck builder, deck library, and the printings list on the detail page keep their current sizes and lazy loading.

Out of scope (decided during exploration): click-to-zoom/lightbox, `srcset` for the grid and deck builder, and any local mirroring of images.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-catalog-browser`: the "Card art loads remotely without mirroring" requirement changes. Detail pages must show the largest available variant as their main image and load it eagerly; the lazy-loading rule continues to apply to the grid and secondary images.

## Impact

- Code: `src/pages/cards/[slug].astro` only (main image `src`, fallback handler, dimensions, `loading`).
- Network: about +65 KB for one image per detail-page visit, cached by the browser for a year (`immutable`). No change to build output size, since images stay remote.
- No dependency, data, or snapshot changes; the "never mirror card art" rule is untouched.

# Design

## Context

The detail page (`src/pages/cards/[slug].astro`) renders one main `<img>` from `imgUrl(shownImageId, '400w')`, lazy-loaded, inside a box that is `aspect-[5/7]` (or `aspect-[7/5]` for rotated battlefields) and about 272-300 CSS px wide. Its `onerror` swaps to the `full` URL once, then removes the element. See proposal.md for motivation.

Measured on the OpenRift CDN (one portrait card and one battlefield): only `240w`, `400w` and `full` exist; every other size or format 404s. `full` is 744x1039 (portrait) / 1039x744 (battlefield), ~100 KB, served with `Cache-Control: public, max-age=31536000, immutable`. Sizes were probed on two cards, not all 2,496 printings.

## Goals / Non-Goals

**Goals:**
- Show the sharpest image OpenRift offers as the detail page's main image, on both 1x and high-DPI screens.
- Keep the existing "no art" placeholder and graceful degradation when image requests fail.

**Non-Goals:**
- Click-to-zoom/lightbox (a UI addition, decided out of scope).
- `srcset`/`sizes` for the grid, deck builder or deck library.
- Changing the printings-list thumbnails on the same page.

## Decisions

**D1. Always request `full`; no `srcset` on the detail image.**
At ~300 CSS px, `full` (744 px) already covers a 2.5x display, and a `srcset` choosing between `400w` and `full` would make 1x users download a smaller file but gain little: the page shows one image, cached for a year. The saving (~65 KB, once per card) does not justify the extra markup and a second URL to maintain. Alternative considered: `srcset="400w 400w, full 744w"` with `sizes` — rejected as complexity for a marginal byte saving on a personal, cached-forever asset.

**D2. Fallback chain flips to `full` -> `400w` -> placeholder.**
Reuse the existing single-step `onerror` with its `data-fallback` guard, swapping the target URL to the `400w` URL instead of `full`. The final `this.remove()` still reveals the "no art" box. No new mechanism.

**D3. Eager loading with high fetch priority, not lazy.**
The image is the main above-the-fold content, so `loading="lazy"` only risks delaying it. Use `loading="eager"` (the default; drop the attribute) and `fetchpriority="high"`. The grid keeps lazy loading because it renders many tiles.

**D4. Intrinsic dimensions follow the `full` asset.**
Set `width`/`height` to 744x1039 (portrait) and 1039x744 (rotated/landscape) to match the actual file. The wrapper's fixed aspect box plus `object-cover` already prevents layout shift; the attributes just stay truthful. The existing `rotateArt` flag selects between the two pairs.

## Risks / Trade-offs

- [~65 KB extra per detail visit] -> One image, immutable-cached for a year, only fetched on detail pages; acceptable for the stated priority (card quality).
- [`full` may be missing for some printings] -> D2's fallback to `400w` and then the placeholder covers it.
- [Dimensions measured on two cards only] -> The wrapper's aspect ratio and `object-cover` absorb small variations; verify a few other cards (a token, a foil/alt-art, a battlefield) during implementation.
- [Eager fetch competes with other page requests] -> Only one large image plus small printing thumbnails (still lazy); negligible.

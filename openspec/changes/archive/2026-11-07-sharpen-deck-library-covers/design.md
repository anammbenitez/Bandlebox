# Design

## Context

`src/pages/decks/index.astro` builds a `legends` payload (58 Legend cards) at build time, each with `url: imgUrl(imageId, '240w')`, serialized into the `deck-legends-data` JSON island. `src/scripts/deck-list.ts` reads it and uses the same `url` in two places: `coverHtml()` for the saved-deck tile faces (~230 CSS px wide, `object-cover` in a 5:7 face) and `renderLegendList()` for the modal's Legend picker (up to 48 small thumbnails, lazily loaded). See proposal.md for motivation.

OpenRift offers only `240w`, `400w` and `full`; `400w` is 400x559 at ~37 KB (measured on two cards).

## Goals / Non-Goals

**Goals:**
- Sharper tile covers on `/decks`, with the same graceful degradation as the card detail page.
- No extra weight where it buys nothing (the picker).

**Non-Goals:**
- `srcset`/density-based selection, `full` covers, or changes to the card grid, deck builder or detail page.

## Decisions

**D1. Add a separate `coverUrl` (400w) to the payload; keep `url` (240w).**
Both consumers read the same entry, so swapping `url` to `400w` would also upgrade the 48 picker thumbnails for no visible gain. A second field lets each consumer pick its size. Alternative considered: derive `400w` from `url` in the script with a string replace — rejected as it hides the variant choice in a regex and duplicates the URL scheme that `imgUrl()` owns.

**D2. `400w`, not `full`, for covers.**
At ~230 CSS px, `400w` gives ~1.7x density: a clear step up from 1:1 without the 2.7x file size of `full` (~100 KB). Few decks exist per user, so `full` would be affordable, but the tile is not the place to read card text (the detail page is, and it now uses `full`). Easy to raise later by changing the one size argument.

**D3. Fallback chain `coverUrl` -> `url` -> remove.**
`coverHtml()` keeps its inline `onerror`, but the first failure swaps `src` to the legend's 240w `url` (guarded with a `data-fallback` flag, same pattern as the detail page), and the second removes the image. This reuses the existing mechanism, and the tile face, badge and name stay visible.

**D4. Tiles stay lazy-loaded.**
Covers sit in a grid that can scroll below the fold with many decks, so `loading="lazy"` stays.

## Risks / Trade-offs

- [~20 KB more per deck tile] -> Handful of tiles, immutable-cached for a year; acceptable for the stated priority (card quality).
- [Payload grows by 58 URLs, ~4 KB uncompressed] -> Negligible against the page and cached.
- [A Legend with no `400w` file] -> D3's fallback to `240w`.

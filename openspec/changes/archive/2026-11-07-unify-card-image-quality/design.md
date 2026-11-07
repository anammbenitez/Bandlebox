# Design

## Context

Card art is requested from OpenRift (`https://openrift.app/media/cards/{imageId}-{variant}.webp`; variants `240w` 240x335, `400w` 400x559, `full` 744x1039; battlefields are the same sizes rotated; nothing larger exists). See proposal.md for motivation.

Today the choice is scattered:

| Surface | File | Variant today |
|---|---|---|
| Browse grid (SSR + infinite scroll) | `grid-payload.ts` -> `grid-item.ts` | 240w (`art.url` in payload) |
| Deck manager card browser, deck faces | `deck-builder.ts` (`thumbHtml`, battlefield rows) | 240w (same payload) |
| Decks library covers / Legend picker | `decks/index.astro` -> `deck-list.ts` | 400w cover, 240w picker (two URLs per Legend) |
| Detail hero / printings list | `cards/[slug].astro` | full / 240w |

Each surface builds its own `<img>`, hard-codes dimensions, and wires its own `onerror` (`this.remove()`, or a one-step swap in the two files the earlier changes touched). `catalog.ts` is the only module allowed to import `data/*.json`, so client scripts cannot call its `imgUrl`; that is why the grid payload ships prebuilt URLs.

## Goals / Non-Goals

**Goals:**
- One module decides URL, variant-per-role, fallback and dimensions; surfaces only name a role.
- The module works in the browser, in SSR, and under the Node verify scripts (pure, no data imports, explicit `.ts` imports).
- Payload JSON gets smaller.

**Non-Goals:**
- Density-aware `srcset`, a `full` variant for tiles, or per-viewport variant switching.
- Changing layout, card-face styling, or lazy-loading policy (grids stay lazy, the hero stays eager).

## Decisions

**D1. New `src/lib/card-image.ts`, three roles.**
`ROLE_CHAIN = { hero: ['full','400w','240w'], tile: ['400w','240w'], thumb: ['240w'] }`. The module exports `imageUrl(imageId, variant)`, `imageSources(imageId, role)` (best to worst URL list), `imageDims(role, rotate)` (true intrinsic dimensions) and `imgAttrs(imageId, role, { rotate })` returning `src`, `width`, `height` and an `onerror` string. Roles are named after what the surface is, not its pixel size, so tuning a role later is a one-line change. Alternative considered: a `size` argument at each call site (today's approach) - rejected as the cause of the inconsistency.

**D2. Role assignment follows displayed size at >=~1.7x source density.**
Measured/CSS widths: grid tile ~210-230 px; Legend face up to 176 px; Champion/deck-side faces up to 128 px and larger on wide panels; library covers ~185-230 px; picker thumbs ~70-90 px; printings thumbs 84-120 px; detail hero 272-300 px. Hence tile (`400w`) for grid, builder and deck faces, and covers; thumb (`240w`) for picker and printings; hero (`full`) for the detail page. Builder faces that can render at ~100 px would be fine at `240w` but share the tile role so the deck manager is uniform and a single face renders the same wherever it appears (pooled elements in `deck-builder.ts` are reused across panes).

**D3. Fallback is data, not hand-written code.**
`imgAttrs` builds one inline `onerror` from the remaining URLs of the chain: each error advances an index stored in `data-fb` and swaps `src`, and when the chain is exhausted it calls `this.remove()`. This covers single-step (tile), two-step (hero) and no-step (thumb) chains with the same code and replaces the three bespoke handlers. It is plain inline JS because the markup is produced both by Astro SSR and by `innerHTML` in client scripts, and inline handlers survive both (today's pattern).

**D4. The payload carries `imageId`, clients derive URLs.**
`GridArt` becomes `{ imageId, rotate, setSlug }` and the Legend payload on `/decks` becomes `{ slug, name, imageId, rotate }`. `grid-item.ts` (already shared and client-safe) and `deck-builder.ts` / `deck-list.ts` call `imgAttrs`. A 36-char id replaces an ~85-char URL per entry in the 1,106-card payload, and removes the second URL per Legend added by the library change. SSR and client reveal still go through the same `gridItemHtml`, so first-window and revealed items stay identical.

**D5. `catalog.ts` stops owning image URLs.**
`imgUrl` and `OPENRIFT_SITE` move to `card-image.ts`; `catalog.ts` keeps a thin re-export only if a remaining Astro caller needs it (implementation checks with a grep and deletes it when unused). This keeps the rule "only front matter imports `catalog.ts`" intact while letting everything else reuse the image logic.

**D6. Dimensions use the measured sizes.**
`imageDims` returns 240x335 / 400x559 / 744x1039 (swapped for battlefields) instead of the 240x336 / 336x240 literals in `grid-item.ts` and `[slug].astro`. Layout does not depend on them (aspect boxes do the work); they just stay truthful.

**D7. Verification is a real script.**
`scripts/verify-card-image.mjs` (plain Node, imports `src/lib/card-image.ts` and `grid-item.ts` directly, like the other verify scripts) checks URLs, role chains, dimensions, rotate swapping, HTML-escaping of the handler, and executes the generated `onerror` against a stub element to prove the degrade-then-remove sequence. CLAUDE.md lists the new script.

## Risks / Trade-offs

- [Grid and deck manager images are ~2.2x heavier (37 KB vs 17 KB)] -> They are lazy per visible card, windowed (`GRID_STEP`), and immutable-cached for a year; the payload shrinks by about 45 bytes per card. If it feels heavy, only the `tile` row of `ROLE_CHAIN` changes.
- [A face in the deck manager is shown at ~100 px yet fetches `400w`] -> Accepted for uniformity and cache reuse (the same file serves the browser pane and the deck pane for a card).
- [`imageId` missing for a card] -> Existing no-art path is unchanged (`art: null`).
- [Inline handler string is easy to break with quotes] -> URLs are `[0-9a-f-]` plus a fixed host and the handler is covered by the verify script, including escaping.
- [Refactor touches seven files] -> Each surface is verified in the browser (task group 5) and the markup changes are mechanical.

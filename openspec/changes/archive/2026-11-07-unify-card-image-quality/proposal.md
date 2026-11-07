# Proposal

## Why

Card art is still soft across most of the site. The browse grid (~210-230 CSS px tiles) and the deck manager faces load OpenRift's smallest variant (`240w`), and the two earlier fixes (`sharpen-card-detail-image`, `sharpen-deck-library-covers`) each hand-rolled their own variant choice, fallback handler and dimensions in a different file. Every surface now decides on its own which size to request, so quality is inconsistent and the next fix would mean touching six places again.

## What Changes

- Introduce one shared, client-safe module that owns card-image delivery: the URL scheme, which OpenRift variant each kind of surface uses, the degrade-then-remove fallback chain, and intrinsic dimensions.
- Three roles replace ad-hoc size picks:
  - **hero** (`full`, 744x1039): the card detail page's main image.
  - **tile** (`400w`, 400x559): the browse grid, the deck manager's card browser and deck faces (Legend, Champion, battlefields, deck-side), and the Decks library covers.
  - **thumb** (`240w`, 240x335): genuinely small images only: the Legend picker and the printings list on the detail page.
- Every role degrades one step at a time to a smaller variant, then to nothing, so a missing file never shows a broken-image icon.
- The grid payload carries the OpenRift `imageId` instead of a prebuilt URL; surfaces derive the URL from the shared module. The Legend payload on `/decks` likewise carries one `imageId` instead of two URLs. The payload gets smaller, not larger.
- The hand-rolled logic from the two earlier changes (detail page fallback, library cover fallback) is replaced by calls into the shared module.

Out of scope: `srcset`/density-aware selection, `full` for grid tiles, local mirroring of images, and card-text glyphs (already cached locally).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-catalog-browser`: "Card art loads remotely without mirroring" is generalized from a grid-vs-detail split to the three display-size roles, and a new requirement states that art resolution follows display size with graceful degradation on every surface, including the deck manager.

## Impact

- Code: new `src/lib/card-image.ts`; edits to `src/lib/catalog.ts` (`imgUrl` delegates), `src/lib/grid-payload.ts`, `src/lib/grid-item.ts`, `src/scripts/deck-builder.ts`, `src/scripts/deck-list.ts`, `src/pages/decks/index.astro`, `src/pages/cards/[slug].astro`. New `scripts/verify-card-image.mjs`; `CLAUDE.md` gains the new script and module.
- Network: tiles move from ~17 KB to ~37 KB per image on the grid and deck manager (about 2.2x, lazy per visible card, immutable-cached for a year). The detail page and library already carry their increases from the earlier changes. Payload JSON shrinks.
- No dependency, data, snapshot, or deck-storage changes; the "never mirror card art" rule is untouched.

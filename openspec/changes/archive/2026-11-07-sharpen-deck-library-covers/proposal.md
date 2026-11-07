# Proposal

## Why

On the Decks page each deck tile is a ~230 CSS px Legend card cover, but it loads OpenRift's smallest variant (`240w`, 240x335). That is roughly 1:1 at 100% scaling and under-resolved on any scaled or high-DPI display, so the Legend art and printed text look soft. The `400w` variant (400x559, ~37 KB) is available and, with only a handful of deck tiles on the page, costs very little. This follows `sharpen-card-detail-image`, which fixed the same problem on the card detail page and deliberately left the library alone.

## What Changes

- Saved-deck tile covers on `/decks` request the `400w` variant instead of `240w`.
- If the `400w` cover fails to load, it falls back once to the existing `240w` image, then to nothing (the tile face stays visible), instead of a broken-image icon.
- The Legend picker in the "New deck" modal keeps `240w`: it shows up to 48 small thumbnails at once, where the larger file would add weight without a visible gain.
- Everything else is unchanged, including the card grid, the deck builder, the card detail page, and the "no legend chosen" placeholder.

Out of scope (decided during exploration): `srcset` for the card grid or the deck builder, using `full` for library covers, and any local image mirroring.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deck-library`: the "Deck list is a tile grid with Legend covers" requirement gains a statement and scenario that tile covers use a larger image variant than the picker thumbnails, with a graceful fallback.

## Impact

- Code: `src/pages/decks/index.astro` (adds a cover URL to the Legend payload) and `src/scripts/deck-list.ts` (uses it for tile covers, with a fallback to the existing URL).
- Network: about +20 KB per deck tile on the Decks page (one cover per saved deck), cached by the browser for a year (`immutable`). The Legend payload grows by 58 short URLs.
- No dependency, data, snapshot, or deck-storage changes; the "never mirror card art" rule is untouched.

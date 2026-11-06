## Why

The top navigation is inconsistent across pages (full-window and left-tucked on the deck manager, container-width elsewhere), lists destinations in an order that doesn't reflect what the app is for (decks first), and carries a Sets page that duplicates what the card grid's set filter already does. Page descriptions are also long and uneven.

## What Changes

- Nav links sit to the left, beside the brand, on **every** page (the layout the deck manager already has), and are **centered on phone-width screens**.
- Nav order becomes **Decks, Browse cards, Sets → (Decks, Browse cards)** once Sets is removed.
- **BREAKING**: Remove the Sets destination entirely: the `/sets` index and `/sets/[slug]` pages, and the nav entry. Set browsing remains available through the card grid's set filter and the set tag on card detail pages.
- Page descriptions (the lede under each page title):
  - Browse cards: "Catalog of all the cards in the game."
  - Decks: "Decks live in this browser locally and save themselves as you build, be creative!"

Assumptions (no clarification needed): "as it is on Decks" means the deck manager's full-width nav with links tucked beside the brand; "phone resolutions" means below Tailwind's `sm` breakpoint (640px), matching the existing responsive breakpoint; the Browse cards page keeps its right-aligned "N cards · M sets" meta line.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-navigation`: adds requirements for nav placement/responsive alignment and entry order and set.
- `card-catalog-browser`: removes the "Set index and set pages" requirement; adjusts the offline scenario that mentions set pages; adds the Browse cards description.
- `deck-manager`: updates "Decks reachable from world navigation" (no Sets destination) and adds the Decks page description.

## Impact

- `src/layouts/Base.astro` (nav list/order, nav container width), `src/styles/global.css` (nav alignment, mobile centering).
- Delete `src/pages/sets/index.astro` and `src/pages/sets/[slug].astro`; `/sets/*` URLs stop being generated.
- `src/pages/index.astro`, `src/pages/decks/index.astro` (ledes).
- Docs: `CLAUDE.md` and `README.md` route lists.
- No data, refresh script, or storage changes.

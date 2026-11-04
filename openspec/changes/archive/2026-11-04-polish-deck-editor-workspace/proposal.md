# Proposal

## Why

The deck editor works but its frame fights the user: the site nav scrolls away, the deck name and filters vanish as soon as the page moves, the browser's card grid ignores how much width actually exists (tiny cards, fixed breakpoints), and the deck viewer crams the main deck into nine barely-readable columns. A deck editor is where users spend their whole session — its fixed frame, card sizing, and zone layout are the difference between comfortable and cluttered (user request, with a deckbuild.gg layout as inspiration).

## What Changes

- **Fixed site navigation**: the header nav across the app stays pinned in place on scroll instead of scrolling away.
- **Sticky editor chrome**: on the deck editor page, the deck name/meta/actions bar and the browser's pill/filter components remain visible while scrolling (sticky chosen over fixed as the fitting solution, since the workspace already fits the viewport at `lg`+).
- **Responsive card sizing in the browser**: card impressions (name/text are part of the raster) size with their actual container instead of fixed breakpoints, reflowing the column count as the page or viewer drag changes available width, with a minimum card size that keeps the printed labels comfortable to read.
- **Redesigned deck viewer (width + zones)**: a wider default viewer presenting zones in a deckbuild-field layout:
  - a **Champion zone directly to the right of the Legend** per the user's ruling: at most 1 champion (one champion-unit card of the Legend's tag), shown up to its 3-copy playset, with the copies living in — and counted by — the main deck;
  - the copy chip (`− / count / +` and remove) moves **off the Legend card onto the Champion card**; legend replacement stays available;
  - **Battlefields presented horizontally** (landscape cards in a row);
  - **Main deck cards noticeably larger**, ≈5 per row on a desktop PC, reflowing with the panel width down to a comfortable minimum rather than nine little columns.

## Capabilities

### New Capabilities

- `site-navigation`: owns the app-wide top navigation shell — that it is fixed in place while scrolling and the content accounts for it.

### Modified Capabilities

- `deck-manager`: adds editor-chrome stickiness, container-driven responsive card sizing in the browser, the Champion zone semantics and chip relocation, and the field-zone viewer layout; existing section/copy/legality behavior untouched.
- `deck-library`: decks now remember their champion pick (which champion-unit card fills the zone), carried through persistence and share URLs; older stored decks open unchanged.

## Impact

- `src/layouts/Base.astro` — fixed header with body offset; affects every page (assumption: "the app" means site-wide).
- `src/pages/decks/build.astro` — sticky chrome on the deck editor, container-driven browser grid, viewer zone layout markup, wider default `--deck-viewer-w`, reflow floors for browser and section rows.
- `src/scripts/deck-builder.ts` — viewer zone rendering (champion slot, horizontal battlefields, main-deck sized rows), champion placement/replace/count-routing controls, sticky chrome wiring, no reflow-by-script for the card grids.
- `src/lib/deck.ts` / `deck-store.ts` / `deck-share.ts` — optional champion field on deck state; tolerant read of older stored decks and share payloads (no format break).
- No dependency changes. Legality rules unchanged — champion-zone copies are ordinary main-deck copies, and the existing champion-unit requirement keeps judging them.

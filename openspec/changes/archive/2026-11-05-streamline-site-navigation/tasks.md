# Tasks

## 1. Navigation layout and order

- [x] 1.1 In `src/layouts/Base.astro`, reorder `nav` to Decks, Browse cards, remove the Sets entry, and apply the full-width nav container on all pages (keep `wide` for `<main>` only). Verify with `npm run build` and by viewing `/`, `/decks`, `/decks/build` that links read Decks, Browse cards.
- [x] 1.2 In `src/styles/global.css`, left-align the nav on `sm` and up, center it below `sm`. Verify in the browser pane at 375px and 1280px on `/`, `/decks`, `/decks/build` and a card page; run `impeccable detect` on `Base.astro` and `global.css`.

## 2. Remove the Sets pages

- [x] 2.1 Delete `src/pages/sets/index.astro` and `src/pages/sets/[slug].astro`; grep `src/` for `/sets` and fix any remaining links. Verify `npm run build` succeeds and `dist/sets` is not produced.
- [x] 2.2 Update the route lists in `CLAUDE.md` and `README.md` (and `DESIGN.md` if it describes the nav or Sets). Verify with a grep that no doc references `/sets`.

## 3. Page descriptions

- [x] 3.1 Set the Browse cards lede in `src/pages/index.astro` to "Catalog of all the cards in the game." and the Decks lede in `src/pages/decks/index.astro` to "Decks live in this browser locally and save themselves as you build, be creative!". Verify both in the browser pane.

## 4. Verification

- [x] 4.1 Run `node scripts/verify-deck-core.mjs`, `node scripts/verify-card-text.mjs`, and `npm run build`; confirm all pass and the card grid still filters by set.

## Workflow follow-up

- Archive the change with `/opsx:archive` once implemented, syncing deltas into `openspec/specs/`.

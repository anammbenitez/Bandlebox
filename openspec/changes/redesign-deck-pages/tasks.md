# Tasks

## 1. Decks page: tile grid, covers, badges, creation modal

- [x] 1.1 Add rule indexes + legend art lookup to `src/pages/decks/index.astro` (SSR: `buildDeckRuleIndexes` via `escapedJson`, legend slug → representative-art map), verify the payloads embed and `npm run build` passes.
- [x] 1.2 Convert `src/scripts/deck-list.ts` rendering to the square-tile grid: deck tile fronted by its Legend's art (placeholder face when absent), deck-sized "+" create tile in the grid, keep rename/delete on the tile. Verify on dev server: tiles render with legend art; legend-less deck shows the placeholder; the plus tile is present and same size.
- [x] 1.3 Compute and render a Legal / Not legal badge per tile from `validate(deck, indexes)`; verify a stored deck whose main deck is not exactly 40 shows the failing badge without opening it, and a legal deck shows the passing one.
- [x] 1.4 Build the creation modal: legend picker (legend-typed cards only, browsable via search over a slim embedded list), deck-name field, both required to accept, Cancel/ESC/backdrop discard, Accept seeds the Legend and opens the deck manager. Verify: cancel leaves no deck; accept creates `deck-store` deck with the legend pre-seeded and lands on the manager; missing name blocks accept; missing legend blocks accept.
- [x] 1.5 Add `addDeck(name, legendSlug)` to `src/lib/deck-store.ts` (or reuse `addDeck` + immediate `saveDeck`) so modal creation and shared-import produce identical shapes; verify with the Node script (new create path asserting legend zone contains the slug).

## 2. Deck manager: art-only browser and copy chips

- [x] 2.1 Rework deck browser entry markup in `src/scripts/deck-builder.ts` to card impressions (art tile only; name/meta demoted to title/aria attributes; image error fallback kept). Verify on dev server: browser rows are art-only cards in the windowed grid, tooltips/aria labels still name the card, detail links still work.
- [x] 2.2 Add the copy chip overlay (per-section counts or "not in deck"/"unknown card" markers, −/+ controls bound to the focused section) and wire it to the mutate pipeline (`refreshBadges`-style updates). Verify: chip counts update on adds, drags, and section-control edits; +  adds to the focused section; − pulls copies down to row removal at zero; the maxed card refuses with the same flash message the Add button gives.

## 3. Deck manager: drag-and-drop

- [x] 3.1 Make browser cards draggable (`dragstart` carrying the slug) and the five section containers drop targets that call `addToSection` on drop, with `canAdd`-based refuse behavior (no-placement drop + visible refusal) and drags hidden in shared view-only mode. Verify by dragging: unit → main deck adds a copy; unit → side adds a copy; rune → main deck refuses visibly; second legend → legend refuses visibly; shared deck shows no drag affordances.

## 4. Deck manager: rune ratio, pills, domain preselect

- [x] 4.1 Add per-color numeric inputs to the rune section header (one per Legend domain, defaults 0) syncing through the mutate path: raise fills that color's rune copies, lower pulls surplus. Verify: write 8/4 with a two-color legend fills the rune deck to those figures; lowering one input below current pulls surplus; manual qty edits keep inputs consistent; a one-color legend shows exactly one input.
- [x] 4.2 Add the All | Legend | Main deck | Battlefields | Runes pill row wired to the existing focus-section behavior (pills and section focus act together; "All" clears the type preset). Verify: choosing Runes presets rune cards and routes additions; choosing the same section from either pill or focus column updates both; the checklist and counts stay in step.
- [x] 4.3 Add a Domain filter chip row (snapshot domain enum) with the Legend's two domains preselected, composing with search/type/rarity/set filters, ignored on the Battlefields pill. Verify: a Ziggs deck opens with fury+chaos chips on and off-color cards hidden; clearing chips shows other colors; Battlefields still browses all colors; no legend → no preselection.

## 5. Integration verification

- [x] 5.1 Full dev-server walkthrough: create deck via modal (legend + name) → tiles show legend cover + legal badge grid → drag unit into main, rune into rune deck → broken legality then fixed → ratio write to 8/4 → pill switching → share → open link → save as copy (drag/chips hidden in shared view). Verify the flow behaves per specs with no console errors.
- [x] 5.2 Run `npm run build` and regression: catalog/sets/card pages and the previous deck flows (add buttons, section qty controls, share, persistence) unchanged where the proposal keeps them. Verify by browsing the pages post-build.

## Workflow follow-up

- Archive `add-deck-builder` before this change (`/opsx-archive`) — required for these MODIFIED deltas to land; noted in proposal.md.
- Archive this change after implementation review.

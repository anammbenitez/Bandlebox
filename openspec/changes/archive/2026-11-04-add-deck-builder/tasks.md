# Tasks

## 1. Deck state foundations

- [x] 1.1 Create `src/lib/deck.ts` with `DECK_RULES` constants (legends 1, main 40, rune 12, battlefields 3 distinct, side limit 10, copies 3) and deck/slot types (`{ id, name, updatedAt, schemaVersion, legend, battlefields, main, rune, side }` sections of `{ card: slug, qty }`). Verify by importing it from both later pages and grepping that no page hardcodes a rule number (npm run build passes).
- [x] 1.2 Create `src/lib/deck-store.ts`: load/save with a single versioned localStorage key, `createDeck`, `rename`, `remove` with in-place confirm at UI level, `save` after every mutation, and an in-memory fallback with a one-time warning flag when storage access throws. Verify each function via a Node type-strip run against a stubbed `localStorage` (Node can strip TS directly) including the storage-failure path.

## 2. Legality checker (pure functions)

- [x] 2.1 Create `src/lib/deck-rules.ts` snapshot indexes: banned card set (Constructed `bans[]`), copy-limit map plus `maxCopiesOverride`, champion/signature sets from `superTypes`, and tag lookups. Verify with a Node type-strip script feeding the real snapshot and asserting: a banned card is found as banned, Spiderling's limit is 0, `Ahri, Alluring` classifies as champion, `Fox-Fire` as signature, `Nine-Tailed Fox` as legend.
- [x] 2.2 Implement `validate(deck, indexes)` returning per-rule results with failing card names: exact counts (legend 1, main 40, rune 12, battlefields 3 distinct, side ≤ limit), per-name ≤ 3 in the main deck and side deck plus snapshot overrides (rune deck exempt from the per-name cap — amended 2026-10-30: rune ratio is uncapped per official rules), domain containment per legend identity, champion-unit tag match (units only), signature cap of 3 per tag, Constructed bans, and overall `legal` gating. Verify with a Node type-strip script asserting one synthetic failing deck per rule (39 and 41 cards, duplicated battlefield, 4th copy, limit-0 card, off-color card, no champion unit, 4th signature, banned card) each producing the expected named failure plus a 12x-one-rune deck that must pass copy-limit, and a fully legal synthetic deck returning `legal`.
- [x] 2.3 Handle the no-legend states: domain checks report pending-on-legend (not mass failure) until a legend exists. Verify in the same script a card-filled legend-less deck yields the pending outcome rather than domain failures.

## 3. Share links

- [x] 3.1 Add encode/decode in `src/lib/deck-share.ts`: compact section lists as `[slug, qty]` pairs → JSON → native `CompressionStream` deflate when available → base64url hash payload (`#s/…`), with an uncompressed base64url fallback when compression APIs are missing. Verify a Node type-strip round-trip: encode a synthetic full deck, decode returns the same deck bit-for-bit.
- [x] 3.2 Decode must tolerate unknown slugs: decoding a payload with a nonexistent card slug preserves every other section and flags that card. Verify by decoding a hand-mutated payload in the 3.1 script.

## 4. Deck library page

- [x] 4.1 Add `src/pages/decks/index.astro` reading the deck list from `deck-store`: listing with name/size/updated info, a create flow triggered by entering a name that lands directly in the deck manager. Verify on the dev server: create a deck, reload, it is still listed with the same identity.
- [x] 4.2 Add rename (existing decks) and delete with confirmation. Verify on the dev server: rename persists across reload; cancelling delete keeps the deck; confirming removes only that one.
- [x] 4.3 Surface the storage-unavailable state: a one-time warning banner when `deck-store` reports persistence is off. Verify by force-failing storage (e.g. resolving the storage API during dev) and seeing the banner while building still works.
- [x] 4.4 Extend world navigation with a Decks entry linked to the page. Verify via `npm run build` success and reaching `/decks` from the header on existing pages.

## 5. Deck manager page and browser

- [x] 5.1 Extract the catalog grid payload construction from `src/pages/index.astro` into a shared helper and create `src/pages/decks/build.astro`: five section tracks with target sizes and element stubs, reading the deck id (or share payload) from the hash. Verify via dev server: an open deck shares the exact payload shape with the catalog page (same builder output) and renders all five sections for a fresh deck.
- [x] 5.2 Implement the deck browser controller (deck variant of the grid pattern): search + type/rarity/set filters, windowed rendering with `grid-item.ts` markup, per-card add control showing the current deck copy count. Verify on the dev server: search and filters behave like the catalog, and an entry for a maxed-out card visibly shows its count with the add control not accepting further copies beyond `DECK_RULES`.
- [x] 5.3 Section-scoped filtering: focusing the rune/battlefield/legend sections presets the browser's type filter to that section's card type, and adds from that context enter the focused section. Verify by switching between sections and observing preset filters and add routing (Spec: deck-manager, browser narrows).

## 6. Section interactions and legality wiring

- [x] 6.1 Add/remove/copy-quantity controls in the deck panel sections with per-card and per-section counts updating in place, zero-to-zero row removal, and type-gated section acceptance (runes stay in the rune deck, legends in legend). Verify each interaction on the dev server (Spec: deck-manager, adding/removing copies; deck-library no-divergence).
- [x] 6.2 Render the legality checklist from `validate()`: pass/fail rows with reasons and offending card names, overall verdict badge, recomputed after every mutation. Verify on the dev server by breaking then fixing the 40-count rule and observing two status flips (Spec: deck-legality, live checklist).
- [x] 6.3 Add the share action (copy prepared URL) and the shared-deck experience: opening a `#s/…` link shows the shared deck with a save-as-owned action, and unknown cards are flagged without breaking other sections. Verify by copying the link, opening it in a separate browser/profile, and saving the copy (Spec: deck-library share).
- [x] 6.4 Wire all manager mutations through `deck-store` so no explicit save control exists. Verify: build a deck, reload mid-session, everything is intact without a save click (Spec: deck-library persistence).

## 7. Integration verification

- [x] 7.1 Full dev-server walkthrough: create deck → add legend → add main/rune/battlefield/side cards → break then fix legality → share → open link in a private window → save as own deck → rename → delete the shared copy. Verify the entire flow behaves per specs with no console errors.
- [x] 7.2 Run `npm run build` and confirm the existing catalog/sets/card pages and their windowed grid remain unchanged in behavior. Verify by browsing them post-build and comparing interactions to the pre-change catalog page.

## Workflow follow-up

- Archive the change after implementation review (`/opsx-archive`).
- Confirm the side-deck limit constant against the authoritative tournament rules at archive time and bump `DECK_RULES` if needed (design.md Open Question).

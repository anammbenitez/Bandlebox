# Tasks

## 1. Checker: copy-counted legend/battlefield caps

- [x] 1.1 In `src/lib/deck-rules.ts`, make the structural rules count copies: fail the legend rule when the Legend section's total copies exceed 1 (and name the card), and fail the battlefield rule when any battlefield row's qty exceeds 1 (in addition to the distinctness check). Verify by extending `scripts/verify-deck-core.mjs` with a doubled-legend deck (2-copy slot → legend rule fails naming the card, deck not legal) and a doubled-battlefield deck (2-copy slot → battlefield rule fails naming the card).
- [x] 1.2 While there, keep the `known-cards`/`copy-limit` and rune rules untouched; verify by rerunning the whole Node script (`node scripts/verify-deck-core.mjs`) with all existing assertions passing.

## 2. Checker: neutral domain admitted

- [x] 2.1 In `src/lib/deck-rules.ts`, share one helper (e.g. `isLegalEverywhere(info)`) that returns true when the card's `domains` include `neutral` (empty domains still fail), and use it inside the domain-identity rule so a neutral card never lands in the off-color failures. Verify with a Node script case: a synthetic Neeko-like card (domains `["neutral"]`, domains data present) in a two-color deck passes the domain rule while the known off-color case still fails (both scenarios from the spec).

## 3. Deck manager: neutral visible in the filter, caps on every path

- [x] 3.1 In `src/scripts/deck-builder.ts`, make the Domain filter keep neutral-domain cards visible regardless of chip state (matches() admits a card whose domains include `neutral`); verify on the dev server by searching "Neeko" under a two-color legend preselect (present in results, e.g. showing >0 results) and in an unfiltered view (still present).
- [x] 3.2 Route the section-row `+` mutation through the same cap gate as add/chip/drag (one shared change-quantity helper consulting `canAdd`; refusal flashes the section + shows the reason in the count). Verify on the dev server: pressing "+" on a battlefield row with that battlefield already placed refuses visibly (no second copy), pressing "+" on the legend row with a legend placed refuses visibly, and row "+" for multi-copy sections (main/side/rune) still works up to the copy limit.

## 4. Integration verification

- [x] 4.1 Full dev-server check: Neeko visible + addable in every section it fits while off-color (no domain failure on the checklist), doubled legend/battlefield impossible through any of the four paths on a fresh deck, and a pre-existing doubled battlefield deck (if one exists in storage) shows the named failure on the checklist. Verify no console errors and `npm run build` passing.

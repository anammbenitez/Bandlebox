# Proposal

## Why

The deck pages work functionally (decks persist, legality checks live, cards addable) but the interaction lags what modern TCG deck builders do: the deck list is a text list, creation goes through a plain form, and adding cards is click-only typing work. The user wants the deck library and manager to *look like a card game* — squared deck covers with the chosen Legend front and center, drag-and-drop building, and section-type filters primed by the Legend's own colors.

## What Changes

- **Decks page becomes a square-tile grid** (game-launcher style, like the Yu-Gi-Oh Neuron deck grid): each deck is a tile whose front image is the deck's chosen Legend card art; the current "+" affordance becomes a deck-sized tile in the grid position shown in the reference.
- **Each deck tile carries a Legal / Not legal badge** computed at visit time with the same rules as the manager's checklist.
- **Deck creation via a modal**: the "+" tile opens a modal asking for the Legend to play and the deck name (both required), Cancel discards, Accept creates the deck (Legend pre-seeded) and opens the deck manager.
- **Deck manager browser shows literal cards** — art-only, like "Browse cards" minus the info text.
- **Drag-and-drop building**: browsed cards drag into the sections they are legal for (unit → main/side, rune → rune deck, legend → legend zone, battlefield → battlefields); illegal drop targets refuse. On the browed card, a copy-count chip appears over the art to add/pull copies without a drag.
- **Rune-club sections**: the rune deck section gains per-color count inputs (write "8 Mind + 4 Calm"), which fill the rune deck accordingly.
- **Section pill filters over the collection**: browser gets tab-style generic filters (All / Legend / Main deck / Battlefields / Runes) like the reference pill bar, plus a domain filter where the Legend's two domains come preselected; the Battlefields tab ignores the domain filter (any battlefield is legal).

## Capabilities

### New Capabilities

<!-- None: this change reshapes existing deck capabilities rather than introducing new durable behavior. -->

### Modified Capabilities

- `deck-library`: deck creation becomes a modal flow that fixes the Legend at creation; the deck list presentation becomes cover-image tiles with a legality badge. (These deltas target the spec created by `add-deck-builder`; **archive that change first** — it is complete and un-archived, and these MODIFIED operations require the main specs to exist.)
- `deck-manager`: browser becomes art-only with drag-and-drop section targeting and an on-art copy control; section-type and domain filters (Legend-domain preselect) change the browser-scoping behavior; the rune deck section gains per-color ratio input.

## Impact

- **Code**: `src/pages/decks/index.astro` + `src/scripts/deck-list.ts` (grid tiles, modal, badges), `src/pages/decks/build.astro` + `src/scripts/deck-builder.ts` (card-style browser rows, HTML5 drag-and-drop, section copy chips, rune ratio inputs, pill/domain filters). Rule indexes need to be embedded on the decks page for badge computation (reuse `buildDeckRuleIndexes`).
- **Data**: none — no snapshot changes.
- **Interaction contract**: the existing add buttons remain (click adds are the fallback for drag-unfriendly input); drag adds a card by 1 copy, the on-art chip repeats copy counts and ±.
- **No breaking changes** to persisted deck shape (legend-at-creation is the same legend slot the manager writes).

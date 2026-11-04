# Proposal

## Why

Two defects in the deck manager's legality surface: duplicate copies of a Legend or Battlefield can enter a deck through the section-row copy controls (+/−) that bypass the add-path caps, and the checker's legend rule counts slots rather than copies so a doubled legend slot slips through; separately, generic "neutral domain" cards (Neeko, Blending In is the snapshot's only one today) are wrongly excluded by the Domain preselect filter and flagged off-color by the checker, even though neutral cards are legal in every deck.

## What Changes

- **One copy per Legend and per Battlefield, everywhere**: section-row +/− controls, copy chips, drags, and add buttons all refuse a second copy; the checker fails any Legend or Battlefield slot whose quantity exceeds 1 (slots vs copies bug fixed), in addition to the existing distinctness rule for battlefields.
- **Neutral domain is always playable and always searchable**: the domain-identity checker treats cards with a `neutral` domain (or no domain data... overriding the snapshot-loss rule for this case) as legal in every deck, and the Domain filter keeps neutral cards visible however chips are set, so Neeko is always findable by name.
- Order of verification in the checker: neutral cards never appear under the domain-identity failures.

## Capabilities

### New Capabilities

<!-- None: both behaviors belong to existing deck capabilities. -->

### Modified Capabilities

- `deck-manager`: section acceptance gains the enforced one-copy cap for Legend/Battlefield sections across every mutation path; the domain filter keeps neutral-domain cards searchable.
- `deck-legality`: domain identity admits neutral-domain cards regardless of the Legend; structure rules count copies so doubled Legend/Battlefield slots fail.

## Impact

- **Code**: `src/lib/deck-rules.ts` (copy-counted legend/battlefield rules; neutral handling in the domain rule — and `canAdd`-level caps stay consistent), `src/scripts/deck-builder.ts` (row +/− mutation goes through the same cap check as add/drag/chip; failure flash from the row), node verification cases extended in `scripts/verify-deck-core.mjs`.
- **Data**: none — the snapshot's `neutral` domain enum entry already exists; no schema changes.
- **Persistence**: no shape changes; decks saved today that contain doubled battlefields simply start failing the (existing) distinctness rule, and the caps stop further doubling.

# Proposal

## Why

The site is read-only: a user can browse every card but cannot ask the most useful question a card catalog can answer — "what deck do these cards make?" Building decks is the core activity of a trading card game, and the OpenRift snapshot the site already carries contains everything needed to validate a Riftbound constructed deck (domains, champion tags, copy-limit overrides, Constructed bans). A deck builder turns the catalog from a reference into a tool.

## What Changes

- New **Decks page** listing a user's saved decks; create, rename, delete, and enter one.
- New **deck manager page**: a card browser (reusing the catalog grid pattern) beside deck sections — Legend (1), Main deck (exactly 40), Rune deck (exactly 12), Battlefields (3 distinct), Side deck (≤ limit) — with add/remove/copy-count controls per card.
- A **live legality checklist** in the deck panel that continuously validates the deck against the constructed rules: section sizes, copy limits (including `maxCopiesOverride`), Domain identity from the Legend, champion-unit tag matching, signature cap, battlefield distinctness, and Constructed bans — each rule shown pass/fail with the offending cards named.
- **Client-side deck persistence**: decks live in browser localStorage, automatically saved; no backend is added.
- **Shareable deck URLs**: any deck encodes to a compressed URL hash so a whole deck can be shared as a link; opening a shared link offers "save to my decks".
- World navigation gains a Decks entry alongside Cards and Sets.

## Capabilities

### New Capabilities

- `deck-library`: Saving and organizing decks — deck list state in localStorage, create/rename/delete, automatic persistence, deck schema identity, shared-deck import via URL.
- `deck-manager`: The builder experience — deck manager page and sections, card browser with type-gated filtering, adding/removing cards and copy counts, sharing a deck as a URL.
- `deck-legality`: The constructed-rules validator — the rules it enforces, live status with reasons, and sourcing its facts from the local snapshot (bans, copy overrides, tags, domains).

### Modified Capabilities

<!-- None: the catalog and set pages are untouched. Navigation to the new
     pages is part of deck-manager's requirements. -->

## Impact

- **Code**: new pages `src/pages/decks/index.astro` and `src/pages/decks/build.astro` (or equivalent), new client scripts, a new shared deck-state/validation module, world navigation update. `src/lib/catalog.ts` reused as-is for data access.
- **Data**: none — no changes to `data/` or the OpenRift snapshot; the builder reads only what the snapshot already provides.
- **Architecture**: first user-state in an otherwise purely static site; storage stays client-side (localStorage + URL), no server or API is introduced.
- **Compute**: the manager page embeds a card payload similar to the catalog grid (~all cards with search text), so page weight grows roughly like the existing index page.

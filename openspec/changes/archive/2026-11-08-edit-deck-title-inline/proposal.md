# Proposal

## Why

Renaming a deck on the deck editor goes through a native `window.prompt`, reached only through a "Rename" button. It is a detour out of the page with no sense of "type, then Enter", and the deck's title, the most visible thing about the deck, gives no hint it is the thing to change. Players name and rename decks across many short sittings, so renaming should be as direct as clicking the name and typing.

## What Changes

- The deck title on the deck editor becomes editable in place: click it, type, and the new name is saved on **Enter** or when focus leaves the title (clicking elsewhere). **Escape** cancels and restores the previous name.
- The "Rename" button stays, but no longer opens a prompt: it focuses the title and selects its text, so it is a labelled way into the same editing state.
- Editability is made visible: a text cursor and a faint wash on hover, a gold focus ring and a selected title while editing, and an "Enter to save · Esc to cancel" hint in the deck bar's meta line while editing.
- A saved rename is confirmed: the meta line reads "Saved ✓" briefly and the change is announced through the existing live region.
- Saving a rename touches only the name. It does not rebuild the section, checklist, ratio, chip or champion views, so the click that moved focus away (often a card's "+" stepper) still lands.
- An empty or whitespace-only name is not saved; the previous name returns. Names are limited to 80 characters, the same as the create-deck modal. An unchanged name writes nothing.
- A shared (read-only) deck keeps a plain title: no hover cue, no caret, no Rename button. "Save as my deck" turns editing on.
- **Out of scope:** the deck library's tile "Rename" (`/decks`) keeps its prompt for now; it is a link tile that does not suit an in-place field, and its script has other uncommitted work in progress.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deck-manager`: adds a requirement for in-place deck title editing on the deck editor (commit, cancel and revert rules, how editability is signalled, read-only shared decks, and that a rename does not rebuild the deck views).

## Impact

- `src/pages/decks/build.astro`: the `#deck-name` heading becomes a heading holding an editable name field with an accessible label; the Rename button stays.
- `src/scripts/deck-builder.ts`: replaces the `window.prompt` rename handler with title editing (commit, cancel, revert), a name-only save path that avoids `mutate()`'s full re-render, and read-only handling in `bootDeck` and the "Save as my deck" handler.
- `src/styles/global.css`: title field styling in the deck-editor section (rest, hover, focus, saved states; reduced motion).
- `src/lib/deck-store.ts` / `src/lib/deck.ts`: possibly a small shared name normalizer (trim, length limit, empty rejected) so the rules are testable under Node.
- `scripts/verify-deck-core.mjs`: assertions for the name rules.
- `DESIGN.md`: a short note on the deck title field under Components.
- No new dependencies, no data or storage format change.

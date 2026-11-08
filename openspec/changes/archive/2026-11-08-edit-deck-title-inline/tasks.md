# Tasks

## 1. Name rules

- [x] 1.1 Add `DECK_NAME_MAX = 80` and `cleanDeckName(raw)` (trim, clamp to 80, `''` for blank) to `src/lib/deck.ts`, keeping the module free of DOM and data imports; verify by adding assertions to `scripts/verify-deck-core.mjs` (trim, blank → `''`, 80 kept, 81 clamped, inner spaces kept) and running `node scripts/verify-deck-core.mjs`

## 2. Title markup and styling

- [x] 2.1 In `src/pages/decks/build.astro`, keep `#deck-name` as the `<h1>` and give it a read-only `<span>` plus an auto-sizing shell holding a text `<input aria-label="Deck name" maxlength="80" autocomplete="off" spellcheck="false">` with `title="Rename deck"`; verify `npm run build` still succeeds and the page's only `h1` is `#deck-name`
- [x] 2.2 In the deck-editor section of `src/styles/global.css`, style the title field with tokens only: matches `.deck-title` type, transparent at rest, `cursor: text` and a `slate-100` 7% wash on hover, the global gold focus ring while editing, mirrored-value auto-size, 44px hit area on a coarse pointer, and 140ms transitions removed under `prefers-reduced-motion`; verify with `.opencode/skills/impeccable/scripts/impeccable.cmd detect src/styles/global.css src/pages/decks/build.astro` and a browser check at desktop and 390px

## 3. Editing behaviour

- [x] 3.1 In `src/scripts/deck-builder.ts`, add `setTitleEditable(editable)` and call it from the empty state (off), `bootDeck` (on for owned decks, off for shared) and the "Save as my deck" handler (on), replacing the four `nameEl.textContent` writes; verify a shared link shows a plain title with no Rename button and that saving it turns both on
- [x] 3.2 Add `commitTitle()` as a name-only save (`cleanDeckName`, skip empty or unchanged, set `deck.name`, `saveDeck`, update the input and mirror, no renderer and no `peek.closeForDeckChange()`), driven by the input's `blur`; Enter calls `blur()` unless `event.isComposing`; Escape restores the stored name and sets a one-shot cancel flag; verify Enter, click-elsewhere, Escape, empty (reverts) and unchanged (library order does not change) in the browser
- [x] 3.3 Replace the `window.prompt` handler on `#deck-rename` with `input.focus(); input.select()`, guarded by `!deck || shared`; verify pressing Rename opens no dialog and typing replaces the name
- [x] 3.4 Verify that pressing a card's "+" (and a section stepper) directly after editing the title saves the name and adds the card in one press, and that section contents, checklist verdict and pane scroll positions are unchanged by the rename

## 4. Cues and announcements

- [x] 4.1 Show `Enter to save · Esc to cancel` in `#deck-meta` on focus; after a saved rename show `Saved ✓` for 1.6s and then call `renderCounts()` (not cached text); announce `Deck renamed to <name>` through the existing `#deck-live` region; verify the meta line text at each step, that adding a card during the flash is not overwritten, and that the deck bar's height is unchanged
- [x] 4.2 Document the editable deck title (hover, editing, saved cues; read-only when shared) under Components in `DESIGN.md`; verify the note matches the shipped behaviour

## 5. Integration checks

- [x] 5.1 Run `npm run build`, `node scripts/verify-deck-core.mjs` and the other `scripts/verify-*.mjs` scripts, and confirm all pass
- [x] 5.2 Manual pass in the browser at desktop and 390px: Tab reaches the title, a screen reader names it "Deck name", the Rename button works from the keyboard, the bar stays on one line, reduced motion shows no transitions, a long name scrolls inside the field and truncates when read-only, and the library page's rename is untouched

## Workflow follow-up

- Archive the change after review and sync the `deck-manager` delta into `openspec/specs/deck-manager/spec.md`.
- Follow-up change to consider: bring the library tile's rename in line with the editor.

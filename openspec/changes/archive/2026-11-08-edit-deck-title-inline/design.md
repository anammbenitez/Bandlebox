# Design

## Context

See proposal.md for the motivation and specs/deck-manager/spec.md for the requirements. Constraints from the current code:

- **The title is one heading, written by text.** `#deck-name` (`build.astro`) is an `<h1 class="deck-title truncate">`. `deck-builder.ts` sets `nameEl.textContent` in four places: the empty "Deck manager" state, `bootDeck`, the old rename handler and the "Save as my deck" handler.
- **Rename is a prompt through `mutate()`.** The `#deck-rename` click handler calls `window.prompt`, then `mutate(d => d.name = next)`. `mutate()` closes the card peek and then re-renders sections, checklist, counts, ratio, chips and champion.
- **`mutate()` is the wrong path for a blur.** A blur fires on mousedown. If the user ends an edit by pressing a card's "+" stepper, a full re-render replaces that button before mouseup, and the click is lost. This is new with in-place editing: the prompt could never be dismissed by a click on the page.
- **Every save bumps `updatedAt`.** `saveDeck` → `upsert` stamps a new `updatedAt`, and the library sorts by it. A save that changed nothing would still reorder the library.
- **The meta line is rewritten by `renderCounts()`** (`"N cards · Section focused"`, plus `· shared view`). It is the only free text slot in the deck bar.
- **The deck page is a viewport-height shell that never scrolls** (DESIGN.md, Layout). Any new row in the deck bar takes height from the panes.
- **Shared decks are read-only.** `mutate()` returns early when `shared`; `bootDeck` hides Rename; the "Save as my deck" handler un-hides it.
- **The only global key listener on this page is the card peek's** (`card-peek.ts`), which dismisses an open peek on any key. Typing in the title does not conflict with it.
- **The deck library tile** (`deck-list.ts`) renames through the same prompt. It is not changed here.

## Goals / Non-Goals

**Goals:**
- One editing state with two doors (click the title, press Rename), one commit path, one cancel path.
- A rename that cannot disturb a click in flight.
- Name rules that are pure and checkable under Node, like the other `src/lib` modules.

**Non-Goals:**
- Changing the library page's rename, or the create modal.
- Name uniqueness, name history, or undo beyond Escape.
- A pencil icon or a first-visit coach mark. The visible Rename button already covers touch and keyboard discovery.

## Decisions

### D1. An `<input>` inside the `<h1>`, swapped with a text span when read-only

`#deck-name` keeps the `<h1>` and holds two children: a `<span>` for the read-only title (today's look, with `truncate`) and a text `<input>` (`aria-label="Deck name"`, `maxlength="80"`, `autocomplete="off"`, `spellcheck="false"`) wrapped in an auto-sizing shell. `setTitleEditable(editable)` shows exactly one of them. Editable decks show the input; shared decks and the empty "Deck manager" state show the span.

The input is always in the document for an editable deck, so Tab, the caret, text selection, IME and mobile keyboards are the platform's, and a screen reader hears an edit field named "Deck name" inside the page heading.

*Alternatives:* a button that swaps to an input on click, as in kanban tools (rejected: a second state to build and a focus hand-off to get right, with no gain for a short single-line value); `contenteditable` on the `<h1>` (rejected: pasted rich text, line breaks, and no `maxlength`); a `readonly` input for shared decks (rejected: still a focus stop, which the spec forbids).

### D2. The input grows with its text through a mirrored value

The shell is an inline grid. The input and a hidden mirror (`::after { content: attr(data-value) }`) share one cell, and `input` events copy the value into `data-value`. The width follows the text up to the heading's `min-w-0` limit, past which the value scrolls inside the field. This avoids `field-sizing: content`, which not every supported browser has.

### D3. One commit path, driven by blur

```
 focus --(type)--> dirty --Enter--> input.blur()
                     |                  |
                     |            blur handler  ---> commitTitle()
                     |                  ^
                     +--Esc--> cancel flag + restore value + blur()
```

- **Enter** only calls `blur()` (unless `event.isComposing`, so an IME's Enter confirms the composition and does not save). **Click elsewhere** blurs naturally. Both therefore reach `commitTitle()` the same way.
- **Escape** restores the stored name and sets a one-shot `cancelled` flag, so the blur it triggers does not commit.
- **Rename button** calls `input.focus()` then `input.select()`. If the field already has focus, pressing the button blurs and so commits first; it then refocuses and reselects. This is harmless and left as is.

### D4. A name-only save, never `mutate()`

`commitTitle()` computes `cleanDeckName(value)` and compares it with `deck.name`:
- empty result or unchanged: restore the input from `deck.name` and write nothing;
- otherwise: set `deck.name`, call `saveDeck(deck)`, reassign `deck`, update the input and mirror. No renderer runs and `peek.closeForDeckChange()` is not called.

The only DOM it touches is the title and the meta line, which meets the spec requirement that a pending click still lands. `mutate()` keeps its own guard for card changes; the rename path adds its own `if (!deck || shared) return`.

### D5. Name rules live in `deck.ts`

`deck.ts` gains `DECK_NAME_MAX = 80` and `cleanDeckName(raw)`: trim, then clamp to 80 characters, returning `''` for blank input. It is pure, so `scripts/verify-deck-core.mjs` can assert it. The create modal's `maxlength="80"` in `decks/index.astro` can read the constant later; this change does not edit that page. `renameDeck` in `deck-store.ts` and the library prompt are left alone.

### D6. Cues use the meta line, not new elements

| Moment | Meta line | Other |
|---|---|---|
| Rest, editable | counts (unchanged) | hover: `cursor: text`, 7% wash (`slate-100` mix, as the ghost button's hover), `title="Rename deck"` |
| Editing | `Enter to save · Esc to cancel` | the global gold focus ring on the input |
| Saved | `Saved ✓` for 1.6s | live region: `Deck renamed to <name>` |
| After the flash | `renderCounts()` | |

The timer calls `renderCounts()` rather than restoring cached text, so a card added during the flash is never overwritten by stale counts. If a mutation runs while the flash is showing, `renderCounts()` simply replaces it, which is acceptable. Hover and ring transitions are 140ms, collapsed under `prefers-reduced-motion`.

### D7. Read-only is a display state, set in three places

`setTitleEditable(false)` runs for the shared view and the empty state, and `setTitleEditable(true)` runs at the end of `bootDeck` for an owned deck and in the "Save as my deck" handler, next to the code that already toggles Rename. The Rename button's visibility and the title's editability follow the same `shared` flag, so they cannot disagree.

### D8. Pointer and touch size

Keep the title's visual size (24px display), but make the click zone generous at every pointer, not only a coarse one: the field's padding makes it about 46px high, with 1rem to the left of the text and 3.5rem to the right (1.5rem on a phone, where a long name needs the room more), and a 12rem minimum width so a one-word name is still a wide target. The zone's left edge is the page gutter, the same line as the panels' outer edge below, so it never touches the window; the name is inset by the panels' own rail and padding, so it lines up with the content under it, and the meta line takes the same inset. Vertically the zone reaches up into the bar's top padding (which gives that height back) and a little way down, so the bar keeps its height. The heading is positioned above the meta line, which the zone overlaps, so the whole zone takes the click, and the focus ring has no offset so it neither runs under the hint nor past the gutter.

## Risks / Trade-offs

- [A rename ending with a card press shows no "Saved" for long, because the press re-renders the counts] → The live region still announces it, and the title already shows the new name. Accepted.
- [Blur also fires when the window loses focus, saving a half-typed name] → Acceptable, since the typed text is what the user chose and Escape was not pressed; the name is still validated.
- [Heading containing an input could be announced oddly by some screen readers] → The input has an explicit label and the `<h1>` stays the only top-level heading; checked in the manual pass.
- [A long name scrolls inside the field instead of showing an ellipsis while editing] → The read-only span keeps `truncate`; the editing field is the exception.
- [Two rename experiences remain (editor inline, library prompt)] → Both keep a labelled Rename button; aligning the library is a separate change.
- [`updatedAt` reorders the library on every real rename] → Existing behaviour for any save; unchanged names are skipped.

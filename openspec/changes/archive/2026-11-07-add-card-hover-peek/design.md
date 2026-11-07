# Design

## Context

See proposal.md for the motivation. Constraints from the current code:

- **Faces are rebuilt, not mutated.** Four renderers in `src/scripts/deck-builder.ts` draw card faces: browser tiles (`entryHtml`), deck-section faces and battlefields (`rowHtml`), the Legend (`legendCardHtml`) and the Champion zone. `mutate()` re-renders every section, so the element under a resting pointer is routinely replaced by a new one for the same card. The browser list pools its `li` nodes across filters.
- **A click is an action.** A plain click on a browser card adds it to the deck (`listEl` click handler), faces are `draggable`, and the +/- steppers sit inside the face. A hover popup is therefore in constant competition with real work.
- **Scrolling lives in the panes.** The deck page is a fixed viewport shell; `#deck-browser` and the deck sheet scroll, the page does not.
- **The client does not know the stats.** `deck-card-data` has name, types, rarities, sets, joined search text and art; `deck-rules-data` has types, supertypes, domains, tags, `maxCopiesOverride` and `banned`. Energy, Power, Might, keywords, and the split between effect and rules text exist only in the build-time snapshot (`catalog.ts` is build-time only).
- **Card text is rendered on the server.** `card-text.ts` is pure, but glyph URLs come from `glyphs.ts` (`import.meta.glob`, Vite-only), and the `card-text-rendering` spec requires card text to be static.
- **Native tooltips are on every face** (`title="Name — rarity · types"`), and the copy-count chip has its own.
- Measured on the current snapshot: rules and effect text is about 152 KB raw and about 297 KB once rendered to HTML (before glyph URLs); stats and keywords are about 42 KB. The deck page already ships the joined text once.

## Goals / Non-Goals

**Goals:**
- A stillness rule that is exact, testable without a browser, and survives faces being re-rendered under the pointer.
- One source of truth for rendered card text, stat symbols and domain-identity decisions, shared by the detail page, the checklist and the peek.
- No growth of the deck page's initial payload.

**Non-Goals:**
- Pinning the peek into a true modal, touch long-press, card art inside the peek, a user-tunable dwell setting.
- Using the peek on the catalog grid or the decks library. The fragment endpoint is general, so that stays possible later.

## Decisions

### D1. A non-modal peek, not a modal dialog

The request says "modal". A hover-opened modal with a backdrop would capture the pointer and focus, which is exactly what the stillness rule is meant to avoid: the user would have to dismiss it before the next click or drag. The peek is a `role="tooltip"` element with `pointer-events: none`, no backdrop and no focus capture. The existing `.dialog` styles are for blocking dialogs and are not reused.

*Alternatives:* a real modal on hover (rejected, above); a modal opened by click (rejected, a click on a face already means "add it"). Pin-to-keep is a possible follow-up.

### D2. The stillness rule is a pure state machine

`src/lib/hover-intent.ts` has no DOM and takes its clock and timers by injection, so `scripts/verify-card-peek.mjs` can drive it under plain Node, like the other `src/lib` modules.

States: **idle**, **pending** (a target and an anchor point), **open** (a target). Targets are identified by a **key** = zone + card slug (`browser:ahri-alluring`, `main:ahri-alluring`), never by element, because faces are rebuilt under a resting pointer.

```
                 move > TOLERANCE from anchor
                   (restart, new anchor)
                 +----------------------+
                 v                      |
 idle --enter face--> pending --DWELL_MS elapsed--> open
   ^                    |                              |
   +--- leave / blocking input / blur / deck change ---+
```

Blocking is two independent locks, and arming needs both clear:

| Lock | Set by | Cleared by |
|---|---|---|
| `blockedKey` | press, click, drag start, Escape on that face | the pointer leaving that key, or entering a different key |
| `moveLock` | scroll, wheel, any key, window blur or page hidden, deck change | a pointer move of more than `TOLERANCE_PX` from where it was when locked |

Any input in either row also cancels a pending dwell and closes an open peek.

Rules that make this hold up in a real browser:
- **Zero-displacement events are ignored.** Browsers can fire a synthetic `mousemove`/`mouseover` after a scroll or a re-render with the pointer exactly where it was. Movement is measured in coordinates against the anchor or lock point, so a synthetic event never counts as the user moving. This is what stops the cards sliding under a resting pointer from opening peeks.
- **Entering a face never arms by itself while a lock is set.** A `pointerover` on a re-rendered face is not evidence of movement.
- **Wheel counts as scrolling even when the column cannot scroll,** since the intent is what matters.
- **A scroll caused by focus is not the user scrolling.** Tabbing to a card whose controls start offscreen makes the browser scroll it into view, which fires a `scroll` event a frame later. While a keyboard-focus dwell is pending or open, a plain `scroll` event is ignored and only the wheel cancels it; otherwise keyboard users could never open a peek on any card below the fold. Found by testing with real Tab presses.
- **Touch (`pointerType: "touch"`) is ignored entirely.** Pen is treated like a mouse.
- A press anywhere closes the peek, so every path that re-renders faces (filter, pill, search, drag, add) is already covered by a press, key or scroll input.

Constants live at the top of the module: `DWELL_MS = 500`, `TOLERANCE_PX = 4`.

*Alternatives:* inline timers in `deck-builder.ts` (rejected: untestable and the file is already 1,274 lines); element-identity targets (rejected: breaks on re-render); a single combined block flag (rejected: a click would then clear on a 5px wiggle, or a scroll would need the pointer to leave a face it never left).

### D3. DOM glue in `src/scripts/card-peek.ts`

`initCardPeek({ root, getFit })` is called once by `deck-builder.ts` and returns `{ closeForDeckChange }`. It:
- listens by delegation on `#deck-app` for `pointerover`, `pointermove`, `pointerout`, `pointerdown`, `dragstart`, `wheel` and `focusin`/`focusout`, plus capture-phase `scroll` on `document` (scroll does not bubble), `keydown`, window `blur` and `visibilitychange`;
- resolves a face as `li[data-slug]` inside `#bd-list` (zone `browser`) or inside a `[data-section]` / the Champion zone (zone = section key), and rejects a pointer that is over `.face-bar` (steppers and count chip);
- treats focus on a face's link or its copy controls as the focus source, with the same dwell; any key other than Tab restarts or blocks per the table, and Escape blocks that key;
- feeds the machine and acts on its open/close callbacks.

`deck-builder.ts` calls `closeForDeckChange()` at the start of `mutate()` (a `moveLock`), so counts in an open peek can never be stale. Implementation must confirm the Champion face markup carries `data-slug`; if it does not, it gets one.

### D4. Facts come from per-card static fragments, rendered on the server

A static endpoint (`src/pages/peek/[slug].json.ts`, `getStaticPaths` over `index.cards`) emits `{ "html": "…" }` per card: name, type line, domain labels, the stat row, keyword labels and rendered rules and effect text. It uses `renderCardTextHtml` / `renderKeywordHtml` and `glyphUrl` exactly as the detail page does, so glyphs, keyword colors and fallbacks are identical by construction (satisfies the `card-text-rendering` delta).

Fragments hold only deck-independent facts. The deck-fit block is computed on the client from `deck-rules-data` and the live deck, then appended. A fragment therefore never goes stale when the deck changes, and the client keeps a `Map<slug, Promise<string | null>>` so each card is fetched at most once per visit.

The fetch starts when the dwell completes, not when the pointer enters, so sweeping across the grid costs nothing. The local request is a small static file; when it resolves, the glue checks the machine is still open on the same key and otherwise discards the result. A failed fetch yields `null`: no peek, no error, face unaffected.

*Alternatives considered:*

| Option | Why not |
|---|---|
| Ship stats and raw text inline, render in the browser | About +190 KB on the page; browser-side rendering needs the Vite-only glyph map and contradicts the static card-text rule |
| Ship pre-rendered HTML for all cards inline | About 300 KB+ added, roughly doubling the deck page's data |
| Fetch and scrape `/cards/{slug}` | Fragile, and the page carries every printing |

### D5. Shared pure helpers instead of copies

- `src/lib/card-stats.ts`: the Might / Energy / Power list with each stat's symbol (including the power-domain rune), lifted out of `src/pages/cards/[slug].astro` and used by it and the endpoint.
- `src/lib/deck-rules.ts`: `domainVerdict(info, legendDomains)` (neutral cards and empty-domain handling included) and `legendChampionTag(legendInfo, championTags)`, lifted out of `validate()`, which then calls them. `verify-deck-core.mjs` guards the checklist's behavior.
- `src/lib/deck-fit.ts`: `deckFit(slug, deck, idx)` returns structured data: color verdict (`fits` / `off` / `pending` / `n/a` plus the Legend's colors), champion-tag verdict, copies held per section against `maxCopiesOverride ?? DECK_RULES.maxCopies`, and banned. The DOM glue only renders it. No data imports, so it runs in the verify script.

Battlefields and Legends get no color verdict, per the rule that battlefields are any color.

### D6. Placement

One `#card-peek` element in `build.astro`, `position: fixed`, `width: min(20rem, calc(100vw - 1rem))`, `z-index` above the frames. At open the glue reads the face's `getBoundingClientRect()` and prefers the right side with a small gap, then the left, then below or above if neither fits (narrow viewports). Its top aligns to the face and is clamped inside the viewport with a margin. It never overlaps the face it describes. Text is set at body size or larger (the faces are small; legibility is the point). While open, the face's link or control carries `aria-describedby="card-peek"`, removed on close.

### D7. Styling and motion

Styles go in `global.css` using existing tokens only: surface from the `slate`/`bark` scale, the existing `.kw` and glyph rules for card text, the existing verdict-dot idiom for fit lines (not domain hues, which stay data-only). Entrance is a 140 ms fade and 3 px lift, matching the hover motion in `DESIGN.md`, and nothing under `prefers-reduced-motion`. The native `title` is removed from face `li`s in `entryHtml` and `rowHtml` (both branches); `aria-label`s on links and steppers stay, and the chip's own `title` stays since the peek never opens over `.face-bar`.

### D8. Verification

`scripts/verify-card-peek.mjs` (added to the commands list in `CLAUDE.md`) covers the state machine with a fake clock (every row of D2's table, synthetic-move immunity, restart on drift, tremor tolerance, key identity across re-render) and `deckFit` (off-color, neutral, no Legend, champion tag, copy limit override, banned). Browser behavior is checked by hand in the running app, plus `impeccable detect` on the changed UI as `AGENTS.md` requires.

## Risks / Trade-offs

- [Browsers differ in when they fire synthetic moves or `pointerover` after scroll and re-render] → decisions rest on coordinates, never on event type, and the final check is a manual pass in Chrome and Firefox.
- [Faces are replaced mid-dwell] → keys are zone + slug, so a rebuilt face for the same card keeps its block or its dwell.
- [A pending fetch resolves after the user has moved on] → the glue re-checks the machine's open key before showing.
- [Peek wording or rules drift from the checklist] → both call the same extracted helpers, and `verify-deck-core.mjs` pins the checklist.
- [Refactors in `validate()` and the detail page] → no behavior change intended; verified by the existing verify scripts and a build.
- [About 1,100 extra small build files] → negligible against the 1,106 card pages already built; none are fetched until a dwell completes.
- [Peek covers a neighbouring panel] → accepted: it is non-interactive and closes on the next move, press, key or scroll.
- [500 ms may feel slow or twitchy] → one constant to tune after trying it.

## Open Questions

- Final dwell and tolerance values, after a hands-on pass.
- Whether the catalog grid at `/` should adopt the same peek later.

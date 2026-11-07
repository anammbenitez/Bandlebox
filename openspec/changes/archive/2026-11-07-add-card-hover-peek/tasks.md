# Tasks

## 1. Shared helpers (no behavior change)

- [x] 1.1 Lift the Might / Energy / Power list and its symbols (including the power-domain rune) out of `src/pages/cards/[slug].astro` into a pure `src/lib/card-stats.ts` (explicit `.ts` import extensions, no data imports) and use it from the page; verify `npm run build` passes and the built `/cards/ahri-alluring` page still shows Might 4, Energy 5 and Power 1 with their symbols
- [x] 1.2 Extract `domainVerdict(info, legendDomains)` and `legendChampionTag(legendInfo, championTags)` from `validate()` in `src/lib/deck-rules.ts` and have `validate()` call them; add assertions to `scripts/verify-deck-core.mjs` for neutral cards, a card with no domain data, an off-color card, and the first-champion-tag fallback, and verify `node scripts/verify-deck-core.mjs` passes with every earlier assertion untouched
- [x] 1.3 Add pure `src/lib/deck-fit.ts` with `deckFit(slug, deck, idx)` returning the color verdict (`fits` / `off` / `pending` / `n/a` with the Legend's colors), the champion-tag verdict, copies held per section against `maxCopiesOverride ?? DECK_RULES.maxCopies`, and `banned`; create `scripts/verify-card-peek.mjs` with its assertions (fury card under a fury/chaos Legend, calm card off-color, neutral card, no Legend, champion tag match and mismatch, two copies of three, a card with its own limit, a banned card, a battlefield with no color verdict) and verify `node scripts/verify-card-peek.mjs` passes

## 2. Stillness state machine

- [x] 2.1 Add pure `src/lib/hover-intent.ts` with `DWELL_MS = 500`, `TOLERANCE_PX = 4`, zone-plus-slug keys, injected clock and timers, pending / open states, and the `blockedKey` and `moveLock` locks from design D2; zero-displacement events must never count as movement, and touch must be ignored; verify the module loads under plain Node
- [x] 2.2 Extend `scripts/verify-card-peek.mjs` with fake-clock cases for every rule in the specs: opens after the dwell, nothing when sweeping, drift restarts, tremor under tolerance does not, leaving closes, moving to a neighbour needs its own dwell, press / click / drag / Escape block until leaving that key, scroll / wheel / any key / blur / deck change block until a real move, a synthetic same-coordinate move changes nothing, a rebuilt face for the same key keeps its block and its dwell, and focus opens after the dwell and is cancelled by keys; verify `node scripts/verify-card-peek.mjs` passes
- [x] 2.3 List `node scripts/verify-card-peek.mjs` in the CLAUDE.md commands section with a one-line description, and verify the documented command runs as written

## 3. Card facts fragments

- [x] 3.1 Add the static endpoint `src/pages/peek/[slug].json.ts` (`getStaticPaths` over `index.cards`) returning `{ "html": … }` with name, type line, domain labels, the stat row from `card-stats.ts`, keyword labels, and rendered rules and effect text via `renderCardTextHtml` / `renderKeywordHtml` with `glyphUrl`; verify `npm run build` emits `dist/peek/ahri-alluring.json` with Energy 5, Power 1, Might 4 and the "When I hold, you score 1 point." text
- [x] 3.2 Cover the omissions in the same endpoint and verify them in the build output: a spell has no Might entry, a Legend / battlefield / rune has no cost row, a card without printed text has no text section, and a card with keywords and glyphs carries the same `.kw` and glyph markup as its detail page; verify `node scripts/verify-card-text.mjs` still passes
- [x] 3.3 Add the `/peek/[slug].json` route to CLAUDE.md's routes list with a note that it holds deck-independent facts only, and verify the note matches the built path

## 4. The peek in the deck manager

- [x] 4.1 Add the `#card-peek` element to `src/pages/decks/build.astro` and its styles to `src/styles/global.css`: fixed position, `pointer-events: none`, `width: min(20rem, calc(100vw - 1rem))`, existing tokens only, verdict-dot idiom for fit lines, 140 ms fade and 3 px lift, no motion under `prefers-reduced-motion`; verify with the dev server that a forced-visible peek is readable and animates only when motion is allowed
- [x] 4.2 Add `src/scripts/card-peek.ts`: delegated `pointerover` / `pointermove` / `pointerout` / `pointerdown` / `dragstart` / `wheel` / `focusin` / `focusout` on `#deck-app`, capture-phase `scroll`, `keydown`, window `blur` and `visibilitychange`; resolve faces to zone-plus-slug keys, reject `.face-bar`, ignore touch; fetch `/peek/{slug}.json` on dwell completion into a per-slug promise cache and discard the result unless the machine is still open on the same key; place the peek right, then left, then below or above, clamped to the viewport and never over the face; set and clear `aria-describedby`; append the rendered `deckFit` block; verify `npm run build` passes and the browser console shows no errors on load
- [x] 4.3 Wire it into `src/scripts/deck-builder.ts`: call `initCardPeek` with a `getFit` backed by the live deck and `idx`, call `closeForDeckChange()` at the start of `mutate()`, remove the `title` from face `li`s in `entryHtml` and `rowHtml` (both branches) while keeping the chip's own title, and make sure the Champion face carries `data-slug`; verify in the running app that hovering any browser, Legend, Champion, battlefield, main, rune and side face shows the peek and no native tooltip
- [x] 4.4 Add a short peek entry to `DESIGN.md` (non-modal tooltip, motion, tokens) and verify it matches what shipped; run `.opencode/skills/impeccable/scripts/impeccable.cmd detect` on the changed UI files and verify it reports nothing new

## 5. Integration check

- [ ] 5.1 In the dev server, check each stillness scenario by hand in Chrome and Firefox: resting on a browser tile opens after about half a second; sweeping opens nothing; clicking a tile to add it leaves it quiet until the pointer leaves and returns; starting a drag cancels it; wheel-scrolling the grid under a resting pointer opens nothing, and moving then resting does; typing in search closes it; Escape closes it; a deck change closes it; resting on a stepper opens nothing; Tab-and-pause opens it; a shared deck link behaves the same
- [x] 5.2 Check placement and fallbacks: a face at the right edge flips the peek to the left, a short viewport clamps it, a narrow window (stacked layout) still shows it fully, and a missing `dist/peek/{slug}.json` (rename one) yields no peek and no console error while click-to-add, drag, steppers and the detail link still work
- [x] 5.3 Run `npm run build` and all four verify scripts (`verify-deck-core`, `verify-card-text`, `verify-card-image`, `verify-card-peek`) and verify they all pass; confirm the deck page's inline data islands did not grow and that peeks work with the network offline except for card art

## Workflow follow-up

- Archive the change once reviewed, which syncs the `card-peek` and `card-text-rendering` deltas into the main specs.
- Verify the archived result and that `openspec/specs/card-peek/spec.md` exists.

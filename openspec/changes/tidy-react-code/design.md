# Design

## Context

See proposal.md (Why). State of the code after `migrate-to-react`, as observed:

- **Champion tag.** `domain/deck-rules.ts` exports `legendChampionTag(legendInfo, championTags)`, returning the Legend's first tag that a champion carries, else its first tag. It feeds the `champion-unit` rule and `deck-fit.ts`. `domain/deck-editing.ts` has its own `legendChampionTag(deck, idx)`, returning that tag or `null`, used by `fitsChampionZone`. The original vanilla script had the same split. In the current snapshot all 58 Legends carry a champion tag, so both give the same answer today.
- **Payload reading.** Three places do `JSON.parse(document.getElementById(id).textContent)`: `CatalogGrid` (`grid-data`), `DeckLibrary` (`deck-rules-data`) and `deck-manager/boot.ts` (`deck-card-data`, `deck-rules-data`); `RULES_PAYLOAD_ID` is defined in two files. Each caches in a module variable and is read through `useSyncExternalStore` with a `null` server snapshot.
- **Size.** `CardBrowser.tsx` 483 lines (filters: `q`, `type`, `rarity`, `set`, `chosen`, `shown`, plus a "type follows the focused section" adjustment), `DeckViewer.tsx` 450 lines with `Steppers`, `Row`, `ChampionZone`, `RuneRatio`, `Checklist`, `Section`, `DeckViewer` and `useLegality`. `CardBrowser` imports `SHORT` (the one-letter section codes) from `DeckViewer`.
- **Page reach-ins.** `DeckManager` calls `document.getElementById('deck-browser' | 'deck-viewer')` five times to scroll and focus panes and once `querySelector('[data-champion-face]')`; `DeckLibrary` focuses `#open-create-modal`; `useGridPlace` toggles `data-measuring` on `#grid-list`; `refusals.ts` finds `#deck-live` and `[data-section=…]`. The string `pathname + search + hash` is built in `CardBrowser`, `DeckViewer`, `CardPeek` (and `pathname + search` in `useGridPlace`).
- **Tooling.** ESLint lints `src/**/*.{ts,tsx}` only; the seven ported `*.test.mjs` files (about 1,900 lines) are not linted.

## Goals / Non-Goals

**Goals:**

- One place for each rule or helper that exists twice today.
- Components small enough to read in one screen, each with one job.
- Fewer implicit dependencies on element ids in components that React already controls.
- The whole existing gate passes after every task, with no e2e spec edited.

**Non-Goals:**

- Any visible or behavioral change (the Legend-without-champion-tag edge aside, see D1).
- Moving CSS (decided: `global.css` stays), deleting `deck-fit.ts`, or typing the ported `.mjs` tests.
- A new state library or routing; no new dependencies.

## Decisions

### D1. One `legendChampionTag`, in `domain/deck-rules.ts`

`deck-rules.ts` keeps the function as it is (with the first-tag fallback), because the legality checklist is the authority on what counts as legal and the champion zone must not accept or refuse anything the checklist would judge differently. `deck-editing.ts` deletes its copy and builds `fitsChampionZone` on the shared one, returning `undefined`-aware booleans as before.

*Alternative considered:* make the editing version the single rule (no fallback). Rejected: it would change `deck-rules` and `deck-fit`, which carry the existing verified behavior and their tests.

*Observable effect:* only for a Legend whose tags match no champion, which the snapshot does not contain. A test using a synthetic Legend pins the agreement: for that Legend the champion zone accepts exactly the champions the checklist accepts.

### D2. `readJsonTag` / `useJsonTag` in `ui/hooks`

`ui/hooks/useJsonTag.ts` exports `readJsonTag<T>(id, fallback)` (parse the tag once, cache by id, never throw: a missing or malformed tag gives the fallback) and `useJsonTag<T>(id, fallback)` (`useSyncExternalStore` with `fallback`-independent `null` server snapshot, as today). It knows nothing about decks, so it fits the `ui` rule. The three feature readers become one-line calls. The payload ids move to one module, `domain/payload-ids.ts` (plain string constants shared by the Astro pages that write the tags and the islands that read them), so a renamed tag fails type-check instead of silently reading nothing.

*Alternative considered:* island props. Rejected in `migrate-to-react` (props are HTML-escaped and would be far larger for the 1,106-card payload); unchanged.

### D3. Split by responsibility, not by size

- **`useBrowserFilters(options)`** in `features/deck-manager/` returns `{ filters, setFilters, results, shown, setShown, activeCount, … }` and owns the filter state, the "type follows the focused section" rule, and the derived list. `CardBrowser` renders. The hook is a pure-ish unit that can be tested without DOM (`renderHook`).
- **`DeckViewer` becomes a folder of files**: `DeckViewer.tsx` (ledger and composition), `DeckSection.tsx`, `SectionRow.tsx` (with `Steppers`), `ChampionZone.tsx`, `RuneRatio.tsx`, `LegalityChecklist.tsx`, each with its props typed on their own instead of the shared `props: DeckViewerProps` bag. `useLegality` moves next to `LegalityChecklist`.
- **`SHORT`** (section codes) moves to `domain/deck.ts` as `SECTION_CODE`, next to `SECTION_LABELS`, so `CardBrowser` and the viewer both import it from the domain.

*Alternative considered:* a context for the viewer's `props` bag. Rejected: it hides what each component needs; explicit props are easier to read and to test.

### D4. React refs and one address hook; keep the animations imperative

- `DeckManager` holds refs for the browser and viewer panes (passed down instead of looked up by id): scroll-to-top, remembered scroll, and focus use refs. The champion face flash uses a ref callback from `ChampionZone`.
- `ui/hooks/useCurrentAddress.ts` returns `pathname + search + hash` (a stable string via `useSyncExternalStore`, updating on `hashchange`/`popstate`), replacing the four copies. `useGridPlace` keeps its own `pathname + search` since it deliberately excludes the hash.
- `refusals.ts` keeps its imperative flash and live-region code: they are short animations that restart on every refusal and are clearer imperatively. Its two lookups stay but are named constants with a comment, and the live region becomes a ref-registered element (`registerLiveRegion`) set by `DeckManager`, so there is no id lookup at call time.

### D5. Lint the `.mjs` tests (dropped: already done)

*Correction, found while applying:* ESLint 9 lints `.mjs` files by default, so the ported tests were already covered; no config change was made. The text below is the original plan.

`eslint.config.js` gains `src/**/*.test.mjs` in the base (non-boundary) config. Unused bindings and similar issues found are fixed; no behavior change. Type-checking them stays out of scope (Non-Goals).

## Risks / Trade-offs

- **[Refactoring working UI]** → Every task ends with the full gate; the e2e suite (82 specs, screenshots) is not edited and covers the deck manager, peek, library and grid. Component tests exist for the viewer and browser and move with their components.
- **[Hook extraction changing render timing]** → `useBrowserFilters` keeps the same state updates in the same event handlers; the browser's tile-re-render test (only the changed tile mutates) is the guard.
- **[Refs not yet set on first render]** → Scroll and focus calls run in event handlers (after mount), never during render; refs are optional-chained.
- **[Payload-id module shared by Astro pages and islands]** → It is plain constants in `domain/`, importable by both; a type check fails if a page and an island disagree.

## Migration Plan

Independent tasks in this order, each landing on its own with the gate green: (1) shared champion tag, (2) JSON-tag helper and payload ids, (3) `SECTION_CODE` and the `DeckViewer` split, (4) `useBrowserFilters`, (5) refs and `useCurrentAddress`, (6) lint the `.mjs` tests, (7) update `CLAUDE.md` and run the final gate. Rollback is reverting the last task.

## Open Questions

- Whether `refusals.ts` should become a small React component (a `<RefusalNote>` per section) instead of imperative DOM. It would be cleaner, but it risks the animation timing the e2e suite does not measure; deferred, can be decided after D4.

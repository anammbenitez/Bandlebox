# Tasks

Gate after every task (no e2e spec may be edited): `npm run lint && npm run typecheck && npm test && npm run build && npx playwright test`.

## 1. One champion-tag rule

- [x] 1.1 In `src/domain/deck-editing.ts` delete the second `legendChampionTag`, and build `fitsChampionZone` on the exported one from `deck-rules.ts` (design D1). Add a test in `deck-editing`'s tests (`src/domain/deck-editing.test.ts`) with a synthetic Legend whose tags match no champion: the champion zone accepts exactly the champions that `validate()`'s `champion-unit` rule accepts, and for a normal Legend both agree. Verify: the new test passes, `grep -rn "function legendChampionTag" src` finds one definition, and the gate passes.

## 2. One JSON-tag reader and one place for payload ids

- [x] 2.1 Add `src/domain/payload-ids.ts` (constants for `grid-data`, `deck-card-data`, `deck-rules-data`) and `src/ui/hooks/useJsonTag.ts` (`readJsonTag(id, fallback)` cached by id and never throwing; `useJsonTag` over `useSyncExternalStore` with a `null` server snapshot), with tests (missing tag, malformed JSON, cached read, hydration snapshot is `null`). Verify: the new tests pass and lint accepts `ui` importing `domain`.
- [x] 2.2 Replace the three readers (`CatalogGrid`, `DeckLibrary`, `deck-manager/boot.ts`) with the helper, remove the duplicated id constants, and use the shared constants in the three Astro pages that write the tags (`index.astro`, `decks/index.astro`, `decks/build.astro`). Verify: `grep -rn "JSON.parse(document" src` is empty, `RULES_PAYLOAD_ID` is defined nowhere in `features/`, and the gate passes, including the hydration console-error specs.
  - Done note: `readJsonTag(id)` / `useJsonTag(id)` return `null` for an absent or malformed tag instead of taking a fallback (callers use `?? []` where they want one): simpler than design D2's `(id, fallback)`.

## 3. Split `DeckViewer` and share the section codes

- [x] 3.1 Move `SHORT` to `src/domain/deck.ts` as `SECTION_CODE` (next to `SECTION_LABELS`) and update `CardBrowser` and the viewer; delete the `CardBrowser` → `DeckViewer` import. Verify: `grep -rn "from './DeckViewer" src/features/deck-manager/CardBrowser.tsx` is empty and the gate passes.
- [x] 3.2 Split `src/features/deck-manager/DeckViewer.tsx` into `DeckViewer.tsx` (ledger and composition), `DeckSection.tsx`, `SectionRow.tsx` (with the steppers), `ChampionZone.tsx`, `RuneRatio.tsx` and `LegalityChecklist.tsx` (with `useLegality`), each taking its own typed props instead of the shared `DeckViewerProps` bag (design D3). Keep markup and class names exactly; keep `DeckViewer.test.tsx` passing unchanged. Verify: no file in the folder exceeds about 200 lines, the existing component tests and all e2e specs (screenshots included) pass.

## 4. Browser filters as a hook

- [x] 4.1 Extract `useBrowserFilters` from `CardBrowser.tsx` (query, type with the "follows the focused section" rule, rarity, set, domain chips, reveal depth, the derived list and the active-filter count), and add `renderHook` tests for it (preset type follows the section, reset restores presets, domain chips narrow the list while neutral cards stay, depth resets on any change). Verify: `CardBrowser.tsx` shrinks by about 100 lines, the existing `CardBrowser.test.tsx` (including the only-the-changed-tile-updates test) passes unchanged, and the gate passes.

## 5. Refs instead of element ids; one address hook

- [x] 5.1 Add `src/ui/hooks/useCurrentAddress.ts` (pathname + search + hash, updating on `hashchange` and `popstate`) with a test, and use it in `CardBrowser`, the viewer's Legend row and `CardPeek` instead of the four hand-built strings. `useGridPlace` keeps its own address without the hash. Verify: `grep -rn "location.pathname}\${window.location.search}\${window.location.hash" src` is empty and the gate passes.
- [x] 5.2 In `DeckManager`, replace the `getElementById('deck-browser' | 'deck-viewer')` and `querySelector('[data-champion-face]')` calls with refs and callbacks passed to `CardBrowser`, the viewer and `ChampionZone`; in `refusals.ts` register the live region from `DeckManager` (`registerLiveRegion`) instead of looking it up, and name the one remaining section lookup with a comment (design D4). Verify: `grep -rn "getElementById" src/features/deck-manager` shows only `refusals.ts`'s documented lookup, and the gate passes, including the deck-manager, peek and visual specs.

## 6. Lint the ported tests

- [x] 6.1 Add `src/**/*.test.mjs` to the base config in `eslint.config.js` (not the boundary rules), fix what it reports (unused bindings and similar, behavior unchanged), and document in `CLAUDE.md` that the `.mjs` tests are linted but not type-checked. Verify: `npm run lint` passes and covers the seven `.mjs` files (a deliberately unused variable in one fails lint, then remove it).
  - Done note: **the premise was wrong.** ESLint 9 lints `.mjs` files by default, so the seven ported tests were already linted (a deliberate unused variable in one failed lint; removed). No config change was needed. The earlier review claim that they were skipped was mistaken. What stays true: they are not type-checked. Only the docs change here (7.1).

## 7. Docs and final gate

- [x] 7.1 Update `CLAUDE.md`'s architecture notes (the shared champion-tag rule, `useJsonTag`, `payload-ids`, the split viewer, `useBrowserFilters`, `useCurrentAddress`). Verify: every file, hook and function it names exists (`grep` each), and `openspec validate tidy-react-code` passes.
- [x] 7.2 Run the full gate on a fresh copy of the working tree (without `node_modules`, `dist`, test output; `npm ci`). Verify: lint, typecheck, test, build and `test:e2e` all pass with no e2e spec changed since the start of this change (`git diff --stat tests/e2e` shows nothing from this change).
  - Done note: run on a copy of the working tree (nothing is committed), with `npm ci`: lint, typecheck (0 errors), 288 unit tests, build + bundle check, 82 e2e all passed. No file under `tests/` is newer than this change's proposal, so no e2e spec or screenshot was edited. One e2e failure (the title edit) happened once under load during task 4.1 and did not recur in 3 full runs, 12 repeats and this final run; its cause was not found.

## Workflow follow-up

- Review and commit; archive with `/opsx:archive` (no spec sync, `skip_specs` is set).

# Proposal

## Why

The React migration (`migrate-to-react`) left the code correct and well layered, but a review of the result found places where it is harder to read and change than it should be:

- Two different `legendChampionTag` functions exist (`domain/deck-rules.ts` falls back to the Legend's first tag, `domain/deck-editing.ts` returns nothing). The legality checklist and the champion zone can therefore disagree for a Legend whose tags match no champion. Today every one of the 58 Legends in the snapshot has a champion tag, so nothing shows, but the rule lives in two places.
- "Read a JSON payload from the page" is written three times (`CatalogGrid`, `DeckLibrary`, `deck-manager/boot.ts`), and the `deck-rules-data` id constant is defined twice.
- `CardBrowser.tsx` (483 lines) keeps seven pieces of filter state inline, and `DeckViewer.tsx` (450 lines) holds six components. `CardBrowser` imports a constant from `DeckViewer`, a coupling between siblings.
- Components reach into the page with 13 `document.getElementById` / `querySelector` calls, and the current-address string is built in four places. This is hard to test and breaks silently if an element id changes.

None of this is a defect users see. It is the kind of drift that makes the next feature (accounts, synced decks) slower and riskier, so it is worth fixing now, while the parity suite is fresh.

## What Changes

- **One champion-tag rule.** Keep the version in `domain/deck-rules.ts` (with its fallback), make `deck-editing.ts` and everything else use it, and add a test that the checklist and the champion zone agree.
- **One JSON-tag reader.** A small generic helper in `ui/hooks` replaces the three copies; payload ids live in one place.
- **Smaller components.** Move `CardBrowser`'s filter state into a `useBrowserFilters` hook and split `DeckViewer` into one file per component (`ChampionZone`, `RuneRatio`, `Checklist`, `DeckSection`, `SectionRow`); move the shared `SHORT` section codes to the domain.
- **Fewer reaches into the page.** The deck manager uses React refs and callbacks for its scroll and focus needs; one `useCurrentAddress` hook replaces the repeated address string. The refusal feedback (`refusals.ts`) keeps its small imperative animations but gets its element lookups from one documented place.
- **Honest tooling.** *Correction, found while applying:* ESLint already lints the ported `.mjs` tests (it does by default), so nothing was needed here beyond documenting it. Type-checking them is out of scope: they are about 1,900 lines of untyped ports, and converting them to TypeScript would be a separate, larger change.

Out of scope: any visible change, new features, moving CSS out of `global.css` (decided to stay), the deck-fit module (kept for future use), or touching the backend seam.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Behavior is unchanged and all eight capability specs must keep holding, proven by the existing suites. The one observable edge, a Legend with no champion tag, does not occur in the current snapshot; after this change the champion zone follows the checklist's rule in that case. The change therefore declares `skip_specs: true`.

## Impact

- **Code:** `src/domain/deck-editing.ts`, `src/domain/deck.ts` (section codes), `src/features/deck-manager/*` (browser, viewer, manager, boot, refusals, peek address), `src/features/catalog-grid/*`, `src/features/deck-library/DeckLibrary.tsx`, a new `src/ui/hooks/` pair of hooks, and `eslint.config.js` (to cover the `*.test.mjs` files).
- **Dependencies, routes, data, storage, share links:** unchanged.
- **Verification:** the existing gate (`lint`, `typecheck`, `test`, `build`, `test:e2e` with screenshots) must pass after every task, with no e2e spec edited.

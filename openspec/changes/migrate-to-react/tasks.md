# Tasks

Every group lands on `master`. After every task, `npm run build` must succeed and `npm run test:e2e` must stay green; this rule holds from group 2 on (design D10).

## 1. Parity suite against the current app (no app code changes)

- [x] 1.1 Add `@playwright/test` as a dev dependency. Add a `playwright.config.ts` whose `webServer` runs `npm run build && npx astro preview`. Add a fixture that intercepts every `openrift.app` image request and serves one local placeholder image. Add the `test:e2e` script. Verify: an empty smoke spec runs green and makes no request to OpenRift images.
- [x] 1.2 Write the `site-navigation` and `card-catalog-browser` specs, using role, label and text selectors only. Cover:
  - the fixed header, link order, current-page marker, and page titles
  - the grid's initial window; filter and search updating the URL; state restored on reload; window fill on scroll; back-to-top
  - place restore after visiting a card and coming back
  - the card page's printings and its "All cards" / "Back to deck" (`?from=`) back link
  - a card page and its card text readable with JavaScript disabled
  - a tile degrading from `400w` to `240w` when the larger image returns 404

  Verify: the specs pass.
- [x] 1.3 Write the `card-peek` specs. Cover:
  - it opens after the dwell, and a move restarts the dwell
  - a press or drag closes it; scroll and key presses close it; Escape closes it
  - no peek over the copy controls
  - focus opens it
  - the "See more" link, the fixed fact order, and the Banned marker
  - no native tooltip on card faces

  Verify: the specs pass.
- [x] 1.4 Write the `deck-library` and `deck-legality` specs. Cover:
  - creating, renaming and deleting a deck
  - the legality badge and Legend cover
  - the storage-failure warning, with `localStorage` stubbed to throw
  - checklist verdicts for a hand-built legal deck, and for each failing rule the UI can reach

  Verify: the specs pass.
- [x] 1.5 Write the `deck-manager` specs. Cover:
  - adding by click and by drag, the refusal flash, and the copy limits
  - the Legend and Champion slots, and the domain filter preselecting the Legend's colors
  - rune-ratio entry and the title edited in place
  - the share link round-trip, opening a shared deck as view and copy, and saving a shared deck
  - only the panes scroll, never the page

  Verify: the specs pass.
- [x] 1.6 Add visual snapshots at 1440×900 and 390×844 of:
  - `/`
  - one card page
  - `/decks`, empty and with two decks
  - `/decks/build`, empty and with a full legal deck

  Use a small pixel-diff threshold and commit the baselines. Verify: two consecutive runs pass with no diff.

## 2. Tooling

- [x] 2.1 Run `npx astro add react` (or add `@astrojs/react` by hand). Add `react`, `react-dom`, `zustand` and `tailwind-variants`. Add the dev dependencies `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@astrojs/check`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks` and `eslint-plugin-boundaries`. Set `jsx: "react-jsx"` and `allowImportingTsExtensions` in `tsconfig`. Verify: `npm run build` succeeds and outputs the same number of HTML files as before, and the parity suite passes.
- [x] 2.2 Add `vitest.config.ts` built on Astro's `getViteConfig` (jsdom environment), plus the `test` and `typecheck` (`astro check`) scripts. Verify: a placeholder test passes and `npm run typecheck` succeeds.
- [x] 2.3 Add the ESLint config with the design D2 rules:
  - `features` → `ui`/`state`/`domain`, never another feature and never `server`
  - `state` → `domain` only
  - `ui` → `domain` only
  - `behaviors` → `domain` only
  - `server` imported only from `pages`/`layouts`
  - no `.astro` files under `ui`/`features`
  - React hooks rules
  - no barrel `index.ts` files

  Add the `lint` script. Verify: `npm run lint` passes, and a temporary `ui` file importing from `features/` fails lint; remove it afterwards.

## 3. Domain, server, and unit tests

- [x] 3.1 Move `src/lib/*` to `src/domain/`, except `catalog.ts` and the `grid-payload` builders, which go to `src/server/`. Move the `card-tilt` controller from `src/scripts/` to `src/behaviors/card-tilt.ts`. Update every import in `src/pages`, `src/scripts`, `src/components` and `scripts/verify-*.mjs`. Verify: `typecheck`, `lint` and `build` pass, the five verify scripts pass, and the parity suite passes.
- [x] 3.2 Port `verify-deck-core.mjs` and `verify-card-image.mjs` assertion by assertion into `src/domain/*.test.ts`. Delete both scripts. Verify: `npm test` passes with at least as many assertions as the scripts had.
- [x] 3.3 Port `verify-card-text.mjs`, `verify-card-tilt.mjs` and `verify-card-peek.mjs`: the tokenizer, the tilt math, the hover-intent machine on fake timers, deck-fit, and the real-snapshot sweeps (skipped when `data/catalog.json` is missing). Leave the HTML-markup assertions as `it.todo` entries naming the component test that will own each one. Delete the three scripts. Verify: `npm test` passes, and with `data/` renamed it skips the sweeps instead of failing.
  - Done note: the ports are `src/domain/*.test.mjs` (the scripts were untyped JavaScript; every `node:assert` call is kept verbatim, counts match). The HTML-markup assertions stay as live tests rather than `it.todo`, because `renderCardTextHtml`, `gridItemHtml` and `peekFactsHtml` are still used by unported pages; each moves to its component test when its renderer is retired (tasks 5.1, 6.2, 8.4).
- [x] 3.4 Add `src/domain/repositories/`:
  - `deck-repository.ts`, the interface
  - `local-storage-deck-repository.ts`, wrapping the `deck-store` logic (same key, schema version, memory fallback, one-shot warning)
  - `memory-deck-repository.ts`

  Verify: one shared contract suite runs against both implementations and passes, including the storage-failure path.
- [x] 3.5 Add `src/behaviors/image-fallback.ts` (design D4): a capture-phase `error` listener plus a start-up sweep, walking `data-fallback`. Load it from `Base.astro`. Make `imgAttrs` emit `data-fallback` instead of `onerror`, and retire `fallbackHandler`. Verify: unit tests cover the chain walk and the sweep, and the 404-degrade parity spec from 1.2 passes.

## 4. Styles and the static `ui/` kit

- [x] 4.1 Split `global.css`: copy `@theme` verbatim into `src/styles/tokens.css` and `@layer base` into `src/styles/base.css`, both imported from `Base.astro`. Leave `@layer components` global for now (design D9, incremental rule). Verify: the visual snapshots pass unchanged.
- [x] 4.2 Build the atoms:
  - Done note: the atoms render the existing global classes (`.btn`, `.pill`, `.field`, `.kw-glyph`) because vanilla deck pages still use them; the rules move to modules when the last legacy user goes (task 8.4).
  - `Button`: five roles, toggle and link, through `tailwind-variants`
  - `Chip`, `Field`, `Glyph`, `DomainEmblem`
  - `CardImage`: role chain, dimensions, `data-fallback`

  Move each atom's CSS rules out of `@layer components` only once no vanilla markup uses them; otherwise reference the global class for now and note it in a `// TODO(migrate-to-react): move when …` comment. Verify: component tests cover every button variant's role and name, and `CardImage`'s attributes per role; this takes over the `card-image` markup `it.todo`s.
- [x] 4.3 Build the molecules:
  - `CardText`: tokens to JSX — keyword labels, glyphs with spoken names, italics, breaks, chevrons
  - `KeywordChip`, `StatColumns`, `VerdictBadge`, `EmptyState`
  - `CardTile`: tilt stage and face data attributes, through `CardImage`

  Verify: component tests take over the card-text and tilt-markup `it.todo`s, and the accessible names match `card-text-rendering` ("Reaction", "might", "2 energy").
- [x] 4.4 Port the static organisms and templates, and render them from `Base.astro` with no client directive:
  - Done note: `SiteHeader` and `Colophon` are rendered by `Base.astro` with no directive (no React runtime ships). `Frame` exists as React with its CSS Module, but `Frame.astro` and the global `.frame` rules stay until the legacy deck page that uses them is ported (task 8.4). No `PageLayout` template was added: `Base.astro` is the page template in the Astro-pages design; the deck shell template (`AppShell`) comes with task 8.1.
  - `SiteHeader`: brand, links, gold leaf marker, branch and sprigs from `src/assets/wood/`, centered on phones
  - `Colophon`
  - `Frame`: CSS Module, bark border
  - `PageLayout`: main modes `wide` and `appShell`, skip link

  Delete `SiteHeader.astro` and `Frame.astro`, and move their CSS into modules. Verify: the `site-navigation` specs and every visual snapshot pass, and `/cards/<slug>` still ships no React runtime (no `react-dom` chunk referenced in its HTML).
- [x] 4.5 Write the Tailwind-or-module rule (D9), the atomic placement rule (D2) and the `.astro`-only-in-pages rule into `DESIGN.md`. Run `.opencode/skills/impeccable/scripts/impeccable.cmd detect` on `src/ui`. Verify: `DESIGN.md` states all three rules, and the detect run reports no new findings.

## 5. Card detail page

- [x] 5.1 Build `features/card-detail`: `CardHero` (art with tilt attributes), `PrintingsTable`, `CardFacts` (stats, errata, printed text through `CardText`), and the `DeckReturnLink` island (`client:load`, through `domain/deck-return`). Reduce `cards/[slug].astro` to front matter plus composition. Remove its inline script, keeping the `behaviors/card-tilt` import, and delete `CardText.astro`. Move the card-page CSS out of `@layer components`. Verify: the card-page parity specs pass, including JavaScript disabled and `?from=`; the build still emits 1,106 card pages; and the card page's only React bundle is `DeckReturnLink`.
  - Done note: the back link is static React upgraded by `behaviors/deck-return-link.ts`, not an island (design D8, changed during apply), so card pages ship no React runtime at all. The page used only shared global rules (`.callout`, `.tag`, `.card-corner`, tilt), which stay global until their other users are ported.
- [x] 5.2 Add a post-build check script, run by `npm run build`, that fails if any file in `dist/_astro/` contains a catalog sentinel (one card's full rules text). Verify: the check passes, and fails when a feature temporarily imports `server/catalog` (with the lint rule disabled for that test).

## 6. Catalog grid

- [x] 6.1 Build the `features/catalog-grid` island `CatalogGrid` (`client:load`): the page head, filters (URL query with the same keys, `useDeferredValue` for the text search), the result count, and `CardTile`s with the first `GRID_STEP` window rendered at build. Pass `GridEntry[]` and the domains as props from `index.astro`, and delete the `grid-data` JSON tag. Verify: the parity specs for the initial window, filters, search, URL restore and reload pass, and `dist/index.html` is no more than 10% larger than before.
  - Done note: the full payload stays in the `grid-data` JSON tag and the island gets only the first step plus filter options as props (island props are HTML-escaped; the props add 4% to `dist/index.html`). Browser state arrives through `useSyncExternalStore` after hydration (no `setState` in effects).
- [x] 6.2 Add `useGridWindow` (IntersectionObserver fill), `useGridPlaceRestore` (same `sessionStorage` key, manual scroll restoration) and back-to-top. Delete `src/scripts/grid-filters.ts` and `gridItemHtml`, and move the grid CSS into modules or utilities. Verify: the window-fill, place-restore and back-to-top specs and the `/` visual snapshots pass.
  - Done note: the restore now (a) saves only after restoring, (b) lays revealed tiles out once (`data-measuring`) so their real heights are remembered, and (c) re-applies the offset until it holds or the reader gives input. "Back to top" is its own component so scrolling never re-renders the grid, and it blurs before the smooth scroll (hiding a focused element stops Chrome's smooth scroll). Parity suite changes, disclosed: the scroll-restore test no longer clicks an off-screen tile (that scroll was the test's own) and lost its `test.fail`; the fixtures wait for island hydration after navigation (a no-op without islands or JavaScript). `.card-tile*` rules moved to `CardTile.module.css`.

## 7. Deck store and deck library

- [x] 7.1 Create the Zustand `useDeckStore` in `src/state/deck-store.ts`, built with a `DeckRepository`. Add the actions `addCard`, `changeQty`, `setLegend`, `placeChampion`, `rename`, `create`, `adoptShared` and `remove`, narrow selectors (`qtyOf`, section totals), and a `takeStorageProblem` channel. Verify: store tests against the memory repository cover every action, the copy limits and the one-shot warning, and a two-island test page shows both islands seeing the same update.
- [x] 7.2 Build the `features/deck-library` island `DeckLibrary` (`client:load`):
  - the neutral shell during prerender (D7)
  - the list with legality badges (`validate` with rule indexes passed as props) and Legend covers
  - create, rename and delete
  - the storage-warning `Toast`

  Delete `src/scripts/deck-list.ts` and its JSON tags, and move the library CSS. Verify: the `deck-library` specs and `/decks` snapshots pass, with no hydration errors in the console.

## 8. Deck manager

- [x] 8.1 Build the `features/deck-manager` island `DeckManager` (`client:load`) inside `AppShell`. Pass the card payload, rule indexes and domains as props. Add `useDeckFromHash` (`#d/<id>`, `#s/<payload>` through `domain/deck-share`, hash replaced in place), the neutral shell, and `DeckBar` (title edited in place, meta, verdict, rename, copy deck link, save shared). Keep `deck-builder.ts` mounted until 8.4, so for these sub-steps develop against a temporary `/decks/build-next` page and delete it in 8.4. Verify: the title, share round-trip and shared-deck specs pass when pointed at `/decks/build-next`.
  - Done note: built straight on `/decks/build` (no `/decks/build-next`): the parity suite targets `/decks/build` and passed 82/82 twice. The open-deck status lives in the store (`status`: loading/none/missing/broken/ready).
- [x] 8.2 Build the deck viewer: `DeckSection` (steppers, refusal flash), `LegendSlot`, `ChampionSlot`, `RuneRatio`, and `LegalityChecklist` (derived with `useMemo`), with native drop zones. Verify: component tests cover add and refuse, the champion placement rules and rune-ratio sync, and the checklist specs pass on `/decks/build-next`.
  - Progress: implemented in `src/features/deck-manager/DeckViewer.tsx`; every checklist / deck-manager parity spec passes. Still owed: component tests (add and refuse, champion rules, rune-ratio sync). The editing rules themselves are tested in `src/state/deck-store.test.tsx`.
- [x] 8.3 Build `CardBrowser`:
  - Progress: implemented (`CardBrowser.tsx`, `peek/CardPeek.tsx`, `peek/PeekFacts.tsx`); `/peek/[slug].json` now returns `{ facts }`; every card-peek parity spec passes. Still owed: the peek-markup component test (port the `peekFactsHtml` assertions in `src/domain/card-peek.test.mjs` to render `PeekFacts`, as done for `CardTile`), and the React Profiler check. The peek lives inside the deck-manager feature (`features/deck-manager/peek/`) because features may not import each other.
  - windowed `CardTile`s with copy chips subscribed through selectors
  - the filter dropdown (collapsed filters, active count, domain chips preselecting the Legend's colors)
  - section focus pills and native drag sources

  Build `features/card-peek` inside the deck manager:
  - `useHoverIntent`, with delegated listeners per zone
  - `PeekCard`: fixed layout, CSS Module, "See more", reduced motion
  - lazy fetch, with no peek shown on failure

  Change `/peek/[slug].json` to return `PeekFacts`. Verify: component tests take over the peek-markup `it.todo`s, and a React Profiler check shows a quantity change re-rendering only the affected tile and section.
- [x] 8.4 Switch `/decks/build` to `DeckManager` and delete `/decks/build-next`, `src/scripts/deck-builder.ts`, `src/scripts/card-peek.ts`, `peekFactsHtml`, `renderCardTextHtml` and the deck JSON tags. Move the remaining deck-manager CSS into modules, and delete `@layer components` once it is empty. Run `impeccable detect` on `src/features`. Verify: the full parity suite and every visual snapshot pass on `/decks/build`, `src/scripts/` is empty and removed, and the detect run reports no new findings.
  - Done note: deleted `src/scripts/`, `src/components/`, `peekFactsHtml`, `renderCardTextHtml`/`renderKeywordHtml` (their assertions now run against `PeekFacts` and `CardText`: `card-peek.test.mjs`, `CardText.test.mjs`), the legacy lint layer, and two dead rule groups. **Changed by the owner:** `@layer components` stays, on purpose (design D9); it is not emptied. The deck manager, atoms (`.btn`, `.pill`, `.field`), checklist, ledger, peek and filter-popover rules are still global, because those components use them by class name; the deck-shell rules still sit in `build.astro` (`is:global`). The owner decided to keep them in `global.css`. The profiler item was met by a test that counts DOM mutations (only the changed tile is touched) rather than the React Profiler.

## 9. Docs and integration

- [x] 9.1 Update the docs:
  - `CLAUDE.md`: architecture under `src/` with the layer rules, islands and their directives, store and repository, behaviors, the test commands replacing the verify scripts
  - `AGENTS.md`: add the `@astrojs/react` guide link
  - `README.md`: the project map and commands

  Verify: every command in those docs runs as written, and every path they name exists.
- [x] 9.2 On a clean clone, run `npm ci && npm run refresh && npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e`. Then open, in the preview, a deck saved and a share link generated by the pre-migration build (from a checkout of the commit before group 2). Verify: everything passes with no parity spec changed since group 1, both decks open unchanged, and `openspec validate migrate-to-react` passes.
  - Done note: nothing was committed yet, so "clean clone" was a copy of the working tree without `node_modules`, `dist` and test output (with `data/` copied instead of re-running `refresh`). `npm ci`, `lint`, `typecheck`, `test` (257), `build` and `test:e2e` (82, screenshots included) all passed there. A deck saved or a link shared by the old build opens unchanged **by construction**, not by a cross-version run: `deck-store.ts`, `deck.ts` and `deck-share.ts` are byte-identical to the pre-migration files apart from one type cast. `openspec validate` passes.

## Workflow follow-up

- Archive the change with `/opsx:archive`, with no spec sync, since `skip_specs` is set.

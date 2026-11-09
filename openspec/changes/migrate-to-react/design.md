# Design

## Context

See proposal.md (Why) for the motivation. These facts about the current code shape the approach.

**Build**
- Astro 7, static output, Tailwind v4 through `@tailwindcss/vite`.
- Pages: `/` (grid), `/cards/[slug]` (1,106), `/decks` (library), `/decks/build` (deck manager), and `/peek/[slug].json`.
- `/peek/[slug].json` is a static endpoint returning `{ html }`. `src/scripts/card-peek.ts`, loaded by the deck manager, fetches it lazily.

**Data**
- `src/lib/catalog.ts` is the only module that imports `data/catalog.json` (2.6 MB) and `data/index.json` (1.3 MB).
- Page front matter builds payloads and serializes them into `<script type="application/json">` tags, which the scripts read back:
  - `grid-data` (`buildGridPayload`)
  - `deck-card-data`, `deck-rules-data` (`buildDeckRuleIndexes`)
  - `deck-domains-data` (domains with emblem URLs)
  - `deck-legends-data`

**Client scripts per page**
- `/`: `grid-filters` + `card-tilt`
- `/cards/[slug]`: inline `deck-return` + `card-tilt`
- `/decks`: `deck-list` + `card-tilt`
- `/decks/build`: `deck-builder`, which pulls in `card-peek` and `card-tilt`

`card-tilt` is a delegated controller. It reacts to any `[data-tilt]` stage around a `[data-tilt-face]`, whoever rendered the markup.

**Pure modules (`src/lib/`)**
- All are DOM-free and data-free: `deck`, `deck-rules`, `deck-fit`, `deck-share`, `deck-store`, `deck-return`, `card-text`, `peek-facts`, `card-image`, `card-tilt`, `hover-intent`, `card-stats`, `keyword-styles`, `glyphs`.
- `card-text` is a tokenizer plus an HTML renderer. `peek-facts` is an HTML renderer. `card-image` carries URLs, role chains and an inline `onerror` string. `glyphs` uses `import.meta.glob`.

**Imperative UI**
- `deck-builder.ts` is 1,458 lines.
- `grid-filters.ts` handles URL state, `sessionStorage` scroll restore with `history.scrollRestoration = 'manual'`, and the IntersectionObserver window fill.
- Drag-and-drop uses native HTML5 DnD.

**Persistence**
- `deck-store.ts` exposes a function API over one versioned `localStorage` entry, with an in-memory fallback and a one-shot warning.
- The deck manager selects its deck from the hash: `#d/<id>` for an owned deck, `#s/<payload>` for a shared one.

**Styles**
- `global.css` is 2,494 lines: `@theme` tokens (~50), `@layer base` (~120), and `@layer components` (~2,280).
- Markup adds Tailwind utilities for layout.

**Spec constraints tied to the build**
- Card detail pages and card text are readable without JavaScript.
- The grid's initial window is rendered by the server.
- Peek facts come from local build output.

**Checks today**
- Five `scripts/verify-*.mjs` scripts run under Node type-stripping.
- There is no test framework, no linter, and no end-to-end tests.

## Goals / Non-Goals

**Goals:**

- Same observable behavior: every requirement in `openspec/specs/` holds, proven by a parity suite that stays green after every port.
- One rendering path per piece of UI: React components, no HTML strings built in TypeScript, no markup duplicated between server and client.
- Each layer has one job, and a linter checks the import rules between layers.
- Pages that need no interactivity keep shipping no JavaScript.
- A backend can be added later without restructuring. Data access goes through interfaces and Astro front matter, which can move to on-demand rendering or Actions per route.

**Non-Goals:**

- Visual changes. Pixels should match the current build within a small tolerance, and intentional differences are separate changes.
- Client-side routing, view transitions, or a single-page shell.
- On-demand rendering, adapters, Actions, or anything server-side.
- A component library for use outside this app, or Storybook.

## Decisions

### D1. Astro stays the page and build layer; React owns all UI

`@astrojs/react` is added to `astro.config.mjs`.

**What Astro keeps:** routes, `getStaticPaths`, build-time data loading in front matter, the peek endpoint, and the HTML document.

**What React gets:** every visible component. `.astro` files become thin. Each page's front matter loads data, then its template composes a layout and one or more React components.

React components are used in two ways:

- **Static (no directive):** rendered to HTML at build, with no JavaScript shipped. Examples: `SiteHeader`, the footer, the whole card detail page (`CardHero`, `CardFacts`, `PrintingsTable`, `CardText`, the back link), and the library and manager page chrome around their islands.
- **Islands (`client:*`):** hydrated in the browser.

| Island | Directive | Why |
|---|---|---|
| `CatalogGrid` | `client:load` | Server-rendered first window, then filters and windowing |
| `DeckLibrary` | `client:load` | Reads `localStorage` |
| `DeckManager` | `client:load` | The whole editor, with peek inside it |

*Alternatives considered:*
- Vite + React Router framework mode was the previous plan. It was replaced because it needs a single big merge, adds risk to the `.json` route and to hydrating localStorage pages, and ships React on every page. All of that buys client-side routing the product doesn't need.
- Next.js static export was rejected earlier by the owner.

### D2. Source layout and dependency direction

```
src/
  pages/          Astro routes: front matter loads data, template composes (thin)
  layouts/        Base.astro (document, head, body classes) rendering ui/ templates
  features/<name>/   islands + their hooks, CSS Modules (catalog-grid, card-detail,
                     card-peek, deck-library, deck-manager)
  ui/atoms|molecules|organisms|templates/   feature-agnostic React kit
  state/          client stores shared by several features (deck-store.ts)
  behaviors/      framework-free DOM behaviors loaded by pages (card tilt, image fallback)
  domain/         today's src/lib pure modules (+ repositories/)
  server/         build-time only: catalog.ts, payload builders
  styles/         tokens.css (@theme), base.css
tests/e2e/        Playwright parity suite
```

**Allowed imports:**
- `pages` and `layouts` may import anything.
- `features` may import `ui`, `state` and `domain`, but never another feature and never `server`.
- `state` may import only `domain`.
- `ui` may import `domain` types and pure helpers only.
- `behaviors` may import only `domain`.
- `server` may import only `domain`, and only `pages` may import `server`.

`eslint-plugin-boundaries` enforces these rules. There are no barrel `index.ts` files (react-best-practices `bundle-barrel-imports`). Tests sit next to their code.

**Atomic placement rule:** a component belongs in `ui/` only if it knows nothing about decks, legality, or the catalog as game data.

| Level | Components |
|---|---|
| Atoms | `Button`, `Chip`, `Field`, `Glyph`, `DomainEmblem`, `CardImage` |
| Molecules | `CardTile`, `StatColumns`, `VerdictBadge`, `KeywordChip`, `CardText`, `EmptyState` |
| Organisms | `Frame`, `SiteHeader`, `Colophon`, `Dropdown`, `Toast` |
| Templates | `PageLayout`, `AppShell` |

`LegalityChecklist`, `RuneRatio`, `DeckSection`, `LegendSlot`, `ChampionSlot` and `CardBrowser` belong to `features/deck-manager`.

*Alternative considered:* keeping `src/lib/` as the name. It was rejected because `lib` invites mixing pure and impure code. `domain/` plus `server/` makes the purity rule visible in the path.

### D3. Build-time data reaches islands as props

Page front matter imports `server/` builders, exactly as it does today, and passes the result to islands as props. Astro serializes island props into the page, replacing the `<script type="application/json">` tags. The shapes are unchanged (`GridEntry[]`, `DeckRuleIndexes`, domains, legends), so the payload size stays at parity.

The lint rule that bans `server/` imports from `features/`, `ui/` and `state/` keeps the 3.9 MB snapshot out of island bundles. A build check greps `dist/_astro/` for a catalog sentinel.

### D4. One renderer per piece of UI: tokens to JSX, facts as data

- **Card text:**
  - `tokenizeCardText()` stays in `domain/`.
  - A `CardText` component renders tokens as JSX: keyword labels, glyph images with spoken names, italics, line breaks, ability chevrons.
  - It is static on the card page and inside islands elsewhere.
  - `renderCardTextHtml` is retired once its markup assertions move to component tests.
- **Peek:**
  - `/peek/[slug].json` keeps its URL, but returns `PeekFacts` data instead of `{ html }`.
  - The `PeekCard` component renders the facts in the spec's fixed order.
  - "Built entirely from local build output" is unchanged.
  - `peekFactsHtml` is retired.
- **Grid tile:** `gridItemHtml` is replaced by the `CardTile` molecule, which renders the server window and the client-side window alike.
- **Card image:**
  - `CardImage` takes `(imageId, role)` and uses `imageSources()` and `imageDims()`.
  - It renders the remaining fallback chain as a `data-fallback` attribute.
  - React does not render string `on*` attributes, so the inline `onerror` cannot survive. The degrade-then-remove fallback becomes the delegated behavior `behaviors/image-fallback.ts` (see D8):
    - A capture-phase `error` listener on `document` walks `data-fallback`.
    - On start, it sweeps images that already failed (`complete && naturalWidth === 0`).
  - One mechanism then covers static pages and islands, before and after hydration.
  - It is loaded from `Base.astro` as an inline module script, so it runs before images finish loading on slow paths.
  - `fallbackHandler()` and the `onerror` part of `imgAttrs` are retired.

*Alternative considered:* `dangerouslySetInnerHTML` with the existing HTML renderers. It is quicker to port, but it keeps two vocabularies and puts an XSS-shaped API at the center of the app.

### D5. State: URL for navigation, Zustand for decks, refs for per-frame state

| State | Owner |
|---|---|
| Grid search and filters | URL query, read and written through `URLSearchParams` and `history.replaceState` inside `CatalogGrid` (same keys as today) |
| Which deck is open | URL hash, through `useDeckFromHash` (`#d/<id>`, `#s/<payload>`, replaced in place) |
| Deck library and open deck | Zustand `useDeckStore` in `src/state/deck-store.ts` |
| Short-lived UI | component state (dropdown, refusal flash, title editing) |
| Tilt, hover dwell, drag hints | refs, CSS custom properties, delegated behaviors; never React state |

Store actions (`addCard`, `changeQty`, `setLegend`, `placeChampion`, `rename`, `create`, `adoptShared`, `remove`) call the pure `domain/deck.ts` functions and persist through `DeckRepository`. Components subscribe with narrow selectors, so a quantity change re-renders one tile and its section, not the browser grid.

Derived data (the legality report, counts, the rune ratio) is computed with `useMemo` or selectors, never synced with effects.

Because the store is a module singleton, every island on a page shares it. React context is not used across islands.

### D6. `DeckRepository`: the backend seam

- `domain/repositories/deck-repository.ts` defines the interface: list, get, create, adopt, rename, remove, save, storage status, take-problem.
- `local-storage-deck-repository.ts` wraps the existing `deck-store.ts` logic unchanged: the same `riftbound-deck-library` key, schema version, memory fallback and one-shot warning.
- `memory-deck-repository.ts` serves tests.
- The store receives the repository at creation.
- The interface stays synchronous until a backend exists (see Open Questions).

### D7. Islands that read browser-only state

`DeckLibrary` and `DeckManager` render at build, when there is no `localStorage` and no hash.

- **First render, on the server and on the client:** a neutral shell with the same layout and a loading state, never "deck not found".
- **After hydration:** a `useHydrated()` flag switches to real data (react-best-practices `rendering-hydration-no-flicker`). This avoids hydration mismatches and matches today's behavior, where scripts fill the page after load.

*Alternative considered:* `client:only="react"`, which skips server rendering. It was rejected because the page chrome would then appear only after JavaScript, a visible regression compared with today.

### D8. Delegated behaviors stay framework-free

- **Image fallback** (`behaviors/image-fallback.ts`, see D4) runs on every page from `Base.astro`.
- **Deck return link** (`behaviors/deck-return-link.ts`): the card page's back link is static React reading "All cards"; this behavior upgrades it to "Back to deck" from `?from=`. *Changed during apply (task 5.1):* it was first a `DeckReturnLink` island, but that shipped the 213 KB React runtime to all 1,106 card pages for one link.
- **Card tilt** stays a delegated DOM behavior: the controller moves from `src/scripts/card-tilt.ts` to `src/behaviors/card-tilt.ts`, over `domain/card-tilt`.
  - It works on any markup with `[data-tilt]` and `[data-tilt-face]`, whether that markup is static React output (card page hero) or inside an island (grid, deck tiles).
  - It writes CSS variables per animation frame, so keeping it out of React avoids any re-render per frame (react-best-practices `rerender-use-ref-transient-values`).
  - Pages load it with a `<script>` import, as today. `CardTile` and `CardHero` only render the data attributes.
- **Hover intent** becomes a `useHoverIntent` hook inside the deck manager, because the peek it drives is React. It wraps `domain/hover-intent.ts` (dwell 500 ms, tolerance 4 px, grace 250 ms) with one delegated listener set per zone container.
- **Grid windowing and place restore** become the hooks `useGridWindow` and `useGridPlaceRestore`, with the same `sessionStorage` key and manual scroll restoration.
- **Drag and drop** stays native HTML5 DnD, with the same `dataTransfer` types, and is implemented as props. No DnD library.

### D9. Styling: hybrid (owner decision)

- `styles/tokens.css` holds the existing `@theme` block verbatim, and `styles/base.css` holds `@layer base`. `Base.astro` imports both.
- **Atoms and molecules** use Tailwind utilities. Variants (the five button roles, toggle, link) are expressed with `tailwind-variants`, so the variant table sits next to its component.
- **CSS Modules** are used wherever a style needs pseudo-elements, keyframes, scroll-driven animation, multi-property transforms, or more than about 8 non-layout utilities. That covers:
  - the card tilt stage and face
  - the peek and `Frame`
  - the deck shell and its chrome
  - the header branch and sprigs
  - the verdict dot

  Modules read tokens through `var(--color-…)`, never raw hex.
- **Decision (owner, at the end of the migration):** `global.css` stays as the home of the shared component rules (`@layer components`). Rules that serve one component moved into its module while that component was ported (`Frame`, `CardTile`, the deck library, `VerdictBadge`); the rest (the `.btn`/`.pill`/`.field` atoms, the deck manager, checklist, peek and filter popover) stay global. The earlier plan to empty the layer is dropped.
- The rule for choosing Tailwind or a module is written into `DESIGN.md`.

### D10. Tests: parity first, then units

1. **Playwright parity suite (`tests/e2e/`)**, written and green before the first port. It runs against `astro build && astro preview` with OpenRift image requests intercepted and served one local placeholder.
   - It covers the main flows of each capability:
     - Grid: filter, search, URL restore, window fill, back-to-top, place restore.
     - Card page: printings, back link, `from=`, and reading with JavaScript off.
     - Peek: dwell, the cancel rules, the copy-control exclusion, focus.
     - Deck library: create, rename, delete, badges, storage-failure warning.
     - Deck manager: add by click and by drag, refusal flash, Legend and Champion slots, rune ratio, checklist, title edit, share round-trip, shared deck view and copy, page scroll lock.
     - Site navigation.
   - Selectors use roles, labels and text, never CSS classes.
   - It also takes **visual snapshots** of each page at 1440×900 and 390×844 with a small pixel threshold.
   - Every port task must leave the suite green.
2. **Vitest** uses Astro's `getViteConfig` so aliases and `import.meta.glob` match the build. Every assertion in the five `verify-*.mjs` scripts is ported next to its domain module. Hover-intent and tilt tests use fake timers, and the real-snapshot sweeps skip when `data/catalog.json` is missing. Assertions on markup move to component tests. Each verify script is deleted after its port passes.
3. **Vitest + Testing Library component tests** cover:
   - `Button` variants
   - the `CardImage` chain
   - `CardText` structure and accessible names
   - `PeekCard` layout
   - `LegalityChecklist`, `DeckSection` add and refuse, `RuneRatio`, `FilterChipGroup`
   - the deck store with the memory repository

### D11. Tooling

- `tsconfig` stays on Astro's strict preset, adds `jsx: "react-jsx"`, and keeps `allowImportingTsExtensions` so domain modules keep their `.ts` imports.
- New scripts: `typecheck` (`astro check`), `lint`, `test`, `test:e2e`. The commands `dev`, `build`, `preview` and `refresh` are unchanged.
- **Done** means `typecheck`, `lint`, `test`, `build` and `test:e2e` all pass.

## Risks / Trade-offs

- **[Island prop serialization]** The grid and deck-manager props (about 1,106 entries) are serialized into `astro-island` attributes, roughly the size of today's JSON tags. → Compare the `dist/index.html` size before and after the grid port. If it grows by more than 10%, pass a trimmed payload.
- **[Shared store across islands]** Islands share the store only if Vite emits one module instance. → All islands import `state/deck-store.ts` by the same path, with no dynamic re-imports. A test page with two islands checks that both see the same update.
- **[Visual drift while moving CSS]** → Apply the incremental rule (D9), move rules verbatim, and gate each port on the screenshots.
- **[Hydration mismatch on localStorage islands]** → Use the neutral shell (D7). A parity check loads `/decks/build#d/<id>` cold and asserts no hydration errors in the console.
- **[Mixed vanilla and React during the migration]** The deck manager stays vanilla until group 8 while the grid and library are already React. → Each old script keeps working on its own page. The shared pieces are the tilt behavior, which is delegated and markup-agnostic, and the global CSS, which is kept until its last consumer is ported.
- **[Two file types]** Contributors see `.astro` and `.tsx`. → The rule is that `.astro` is used only in `pages/` and `layouts/`, and all UI is `.tsx`. It is written in `CLAUDE.md` and enforced by lint (no `.astro` under `ui/` or `features/`).

## Migration Plan

Everything lands on `master` in small, independently shippable steps, each keeping the parity suite green:

1. Parity suite and baselines.
2. Tooling.
3. Domain move and Vitest ports.
4. Styles split and static `ui/` kit (header, footer, frame).
5. Card detail page.
6. Catalog grid.
7. Deck store and library.
8. Deck manager with peek.
9. Cleanup and docs.

Rollback is a revert of the last step, because no user data format (`localStorage` key and schema, share-link format) changes at any point.

## Open Questions

- Whether `DeckRepository` should become async before a backend exists, or only when the HTTP implementation arrives. This doesn't affect these tasks.
- Whether to commit the untracked `react-best-practices` skill folders under `.claude/skills/` and `.opencode/skills/`. This is a repo-hygiene choice for the owner.

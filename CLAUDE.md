# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Riftbound Deck Manager is a personal, offline-first site (Astro for pages and the build, React for every UI component, static output, TypeScript strict, Tailwind v4 via `@tailwindcss/vite`) for browsing the English Riftbound card catalog and building rules-checked decks. No server state, no accounts. Also read `AGENTS.md` (shared agent rules), `PRODUCT.md` (users/purpose), and `DESIGN.md` (design system).

## Commands

- `npm run refresh` — fetch the OpenRift catalog into `data/` (`catalog.json`, `etag.txt`, derived `index.json`, `glyphs/`). **Required before dev/build on a fresh checkout**: `data/` is git-ignored and `src/server/catalog.ts` imports the JSON directly, so the build fails without it. Uses ETag revalidation; failures keep the previous snapshot.
- Dev server: run in background mode per `AGENTS.md` — `astro dev --background` (then `astro dev stop|status|logs`). Serves at `http://localhost:4321`.
- `npm run build` — static build into `dist/` (one page per card), then `scripts/check-bundle.mjs` fails the build if catalog text reached a client bundle.
- `npm run preview` — serve `dist/`.
- `npm run typecheck` (`astro check`), `npm run lint` (ESLint layer rules, which also lints the ported `*.test.mjs` tests, plus `scripts/check-structure.mjs`; the `.mjs` tests are linted but not type-checked), `npm test` (Vitest: domain, state, components; real-snapshot sweeps skip when `data/` is missing).
- `npm run test:e2e` — the Playwright parity suite (`tests/e2e/`): functional specs per capability plus visual baselines at 1440×900 and 390×844. It builds and serves the site on **port 4399** (never 4321, where `astro dev` runs). Card-art requests to OpenRift are answered with a local placeholder. Update screenshots deliberately with `npx playwright test visual --update-snapshots`.
- "Done" means `lint`, `typecheck`, `test`, `build` and `test:e2e` all pass.
- UI check: `.opencode/skills/impeccable/scripts/impeccable.cmd detect <path>` (or `impeccable` under `sh`). `AGENTS.md` requires re-running it on changed UI before calling UI work done.

## Architecture

**Astro owns pages and the build; React owns every visual component.** A React component used in an `.astro` page without a `client:` directive renders to plain HTML at build and ships no JavaScript (the header, the footer, the whole card page). Interactive parts are islands (`client:load`): the catalog grid, the deck library and the deck manager.

```
src/
  pages/ layouts/   Astro only: front matter loads data, the template composes components (thin)
  features/<name>/  product logic per capability: catalog-grid, card-detail, deck-library, deck-manager (+ its card peek)
  ui/               feature-agnostic React kit: atoms/ molecules/ organisms/ hooks/
  state/            client stores shared by several features: deck-store.ts (Zustand)
  behaviors/        framework-free DOM behaviors loaded by pages: card-tilt, image-fallback, deck-return-link
  domain/           pure TypeScript (no React, DOM, or data imports): rules, models, share links, card-text tokenizer, repositories/
  server/           build-time only: catalog.ts (the only importer of data/*.json), payload and view-model builders
  styles/           tokens.css (@theme) and base.css; global.css holds the shared component rules (`@layer components`)
tests/e2e/          Playwright parity suite
```

Import rules are enforced by ESLint (`eslint.config.js`): `features` use `ui`, `state` and `domain`, never another feature and never `server`; `state`, `ui`, `behaviors` and `server` use `domain` only (`ui` also its own folders); only `pages`/`layouts` import `server`. `.astro` files live only in `pages` and `layouts`. No barrel `index.ts` files. A component goes in `ui/` only if it knows nothing about decks, legality or the catalog as game data. Keep explicit `.ts` extensions on relative imports in `domain/`.

**Data flow: snapshot → build-time pages → props / JSON tags → React.**

1. `scripts/refresh.mjs` writes the verbatim OpenRift response (`catalog.json`) and a normalized card ↔ printing ↔ set index (`index.json`). Never mirror card art locally — images load remotely via `imageUrl()`.
2. `src/server/catalog.ts` is the only module that imports `data/*.json`. Only Astro pages (and `server/` builders such as `card-detail.ts` and `grid-payload.ts`) may import it, so the 3.9 MB snapshot never enters a client bundle.
3. Small data goes to islands as props. The big payloads stay in `<script type="application/json">` tags (`escapedJson` from `grid-payload.ts`), named once in `domain/payload-ids.ts` (`PAYLOAD_IDS`, used by the Astro page that writes a tag and the island that reads it). Islands read them once after hydration with `useJsonTag(id)` / `readJsonTag(id)` from `ui/hooks/useJsonTag.ts` (`null` while hydrating and for a missing or malformed tag). Island props are HTML-escaped and would be far larger.
4. Pages that depend on browser state (`/decks`, `/decks/build`, the grid's URL state) render a neutral shell at build and during hydration; real data appears after (`useSyncExternalStore` with a `null` server snapshot). Do not set state in effects: the `react-hooks` lint rule rejects it.

Key modules:
- `domain/deck.ts` — deck model, `DECK_RULES`, section keys/targets. `domain/deck-rules.ts` — `validate(deck, indexes)`; indexes come from `buildDeckRuleIndexes`. `domain/deck-editing.ts` — add/refuse rules, natural section, rune ratio, champion pick (pure). The champion tag has one definition, `legendChampionTag` in `deck-rules.ts`: the legality checklist and the champion zone both use it, so they cannot disagree. `domain/deck-fit.ts` — one card's fit facts (no UI uses it today).
- `domain/repositories/` — `DeckRepository` (the backend seam), `local-storage-deck-repository` (wraps `deck-store.ts`: one versioned `localStorage` entry, memory fallback, one-shot warning) and `memory-deck-repository` (tests).
- `state/deck-store.ts` — Zustand store over a `DeckRepository`: library, open deck, `status`, editing actions that return a `Verdict`. Subscribe with narrow selectors.
- `features/deck-manager/`: `DeckManager.tsx` (the island; owns the pane refs and applies the viewer's and browser's intent through the deck store), `CardBrowser.tsx` with its filters in `useBrowserFilters.ts` (pure `filterCards` plus the hook), `DeckViewer.tsx` composing `viewer/` (`DeckSection`, `SectionRow`, `ChampionZone`, `RuneRatio`, `LegalityChecklist`, each with its own typed props), `refusals.ts` (imperative refusal flashes and the polite live region, registered from the manager). Every card counter is the same foot (minus, plain count, plus, and remove in the deck panel) — no section-letter codes. Components get their links back to the deck from `useCurrentAddress()` (`ui/hooks`), not from `window.location`.
- `domain/hover-intent.ts` — the peek's dwell/stillness state machine (injected timers); `ui/organisms/peek/CardPeek.tsx` wires it with delegated listeners.
- `domain/card-tilt.ts` — tilt arithmetic; `behaviors/card-tilt.ts` is the delegated controller on `[data-tilt]` stages (angles live in `global.css`, "card tilt").
- `domain/card-image.ts` — URL scheme, variant per role (`hero` = `full`, `tile` = `400w`, `thumb` = `240w`), dimensions. Use `<CardImage imageId role />`. The smaller variants ride as `data-fallback`; `behaviors/image-fallback.ts` (inlined in `Base.astro`) degrades, then removes, a failing image. React cannot render `onerror`.
- `domain/card-text.ts` — tokenizer; `ui/molecules/CardText.tsx` renders it. `domain/deck-share.ts` — share links in the URL hash. `domain/deck-return.ts` — `?from=` back to the page a card link was opened from (any address inside this site is accepted, nothing else); the card page's Back is the browser's back when the previous page is on this site.

Routes: `/` (grid), `/cards/[slug]`, `/decks` (library), `/decks/build` (manager; deck from the hash), `/peek/[slug].json` (static endpoint, one per card: `{ facts }`, rendered by `PeekFacts`; fetched lazily once a dwell completes; nothing in it depends on the deck).

**Card description = the printing's printed text.** Its `printedEffectText` then `printedRulesText`, rendered through `CardText`; keywords appear inside it as `[Keyword]` labels. The card record's `keywords` array is a search index, never rendered on its own.

**Domain emblems** are OpenRift's `/images/domains/{slug}` images, cached by `npm run refresh` into `data/glyphs/domain-{slug}.*` and resolved with `glyphUrl('domain_{slug}')`. They are distinct from the `rune_*` text glyphs.

## Workflow: OpenSpec

Features are specified with OpenSpec. Current behavior specs live in `openspec/specs/<capability>/spec.md`; each change is proposed in `openspec/changes/<name>/` (proposal, design, delta specs, tasks) and archived to `openspec/changes/archive/YYYY-MM-DD-<name>/`, syncing deltas into the main specs. Code comments reference these (e.g. "design.md D4"). Workflow commands are in `.opencode/commands/opsx-*.md` and skills in `.opencode/skills/openspec-*` — a propose step creates planning artifacts only and stops before implementing.

## Design constraints

Start UI work from `DESIGN.md`. Colors come from tokens in `src/styles/tokens.css` (`@theme`: retuned `slate`/`amber`, plus `bark`, `leaf`, `bloom`) — never raw hex in new rules. Use Tailwind utilities (with `tailwind-variants` for variants) for layout and simple looks, and a co-located `*.module.css` for pseudo-elements, keyframes, scroll-driven animation or heavy transforms (see `DESIGN.md`). Shared component rules (buttons, chips, fields, the deck manager, the checklist, the card peek) live in `global.css` under `@layer components` by decision: keep them there and add new shared rules there. A rule used by one component only may sit in that component's module. Domain and keyword hues are data-only, never decorative. The deck-manager panels use the plain `Frame` bark border — no painted pieces; the only painted detail is the header branch with flowering sprigs (`SiteHeader`, `src/assets/wood/`). The page background is a dusk gradient on `body`. The `slate` scale is bark-brown ink, not green.

## Licensing

Catalog data, card art, and glyphs belong to OpenRift / Riot Games. Keep attribution/links back to OpenRift, never commit `data/` contents, and don't imply official affiliation.

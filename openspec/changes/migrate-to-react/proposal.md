# Proposal

## Why

BandleBox is meant to grow from a static personal tool into a real web app. Accounts, synced decks and public deck pages are the likely next steps, though none of them are part of this change. The current front end cannot carry that growth well. Every interactive surface is vanilla TypeScript that builds HTML strings and patches the DOM by hand. `src/scripts/deck-builder.ts` alone is 1,458 lines of module-level state, `mutate()` callbacks and `render*()` functions. The same card markup is built twice: `grid-item.ts` on the server and on the client, and `peek-facts.ts` for 1,106 JSON files. There is no component model, no test framework and no enforced layering, so each new feature makes the next one harder.

React is the owner's front-end stack and the natural base for a component-oriented architecture. Astro already provides what the specs depend on: static per-card pages readable without JavaScript, build-time data, and the peek endpoint. It also offers a path to server features later (per-route on-demand rendering, adapters, Actions, sessions). So the change keeps Astro as the page and build layer and moves all UI to React components. The move happens now, before any backend work, as a migration that changes no behavior.

## What Changes

- Add React to the existing Astro app through `@astrojs/react`. Astro keeps routing, static output, the 1,106 prerendered card pages, build-time data loading in page front matter, and the `/peek/[slug].json` endpoint. `.astro` files shrink to thin page and layout shells.
- Rebuild all UI as React components. Static parts (header, footer, card detail content, card text) are React components rendered by Astro with no client directive, so they ship as plain HTML with zero JavaScript. Interactive parts become hydrated islands: catalog grid, deck library, deck manager, card peek, card tilt, and the card page's back link and hero art.
- Introduce a layered source structure under `src/`: pure `domain/` (today's `src/lib/`, moved almost unchanged), an atomic `ui/` kit (atoms, molecules, organisms, templates), one folder per capability in `features/`, shared client `state/`, a build-time-only `server/` for catalog access, and thin `pages/` and `layouts/`. ESLint enforces the import boundaries.
- Deck state moves to a **Zustand** store shared across islands, behind a `DeckRepository` interface. Its only implementation for now is the existing versioned `localStorage` entry. That interface is where a backend will plug in later.
- Styling becomes a hybrid. Tokens and base styles stay global in the Tailwind v4 `@theme` block. Atoms and molecules use Tailwind utilities with `tailwind-variants`. Visually complex pieces use co-located CSS Modules that read the same tokens: card tilt, peek, frame, and the deck shell chrome. The 2,280-line global `@layer components` block is dissolved into those components as each one is ported.
- Testing:
  - A **Playwright parity suite** is written first against the current app. It must stay green after every port.
  - The five `scripts/verify-*.mjs` scripts are ported to **Vitest**.
  - Components with behavior get Vitest + Testing Library tests.
- The migration is **incremental on `master`**. Each feature is ported on its own, and the old vanilla script and its CSS are removed only once their last consumer is React. The app works and the suite passes after every step.
- Update the agent and contributor docs (`CLAUDE.md`, `AGENTS.md`, `README.md`, `DESIGN.md`) to the new structure and commands.
- **BREAKING (developer-facing only):** the `verify-*.mjs` scripts are replaced by `npm test` (Vitest) and `npm run test:e2e` (Playwright), and `src/lib/` moves to `src/domain/` and `src/server/`. These stay exactly as they are: URLs, share links (`#d/<id>`, `#s/<payload>`), the `localStorage` entry and its version, and the Astro commands (`dev`, `build`, `preview`, `refresh`). Users' saved decks and shared links keep working.

Out of scope: any backend, accounts, sync, database, on-demand rendering, route changes, client-side routing, visual redesign, or new product features.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a behavior-preserving migration. All eight capability specs must hold unchanged: `card-catalog-browser`, `card-peek`, `card-text-rendering`, `catalog-snapshot`, `deck-legality`, `deck-library`, `deck-manager`, `site-navigation`. That includes the requirements tied to the static build, which Astro continues to satisfy:
- card detail pages and card text readable without client-side JavaScript
- a server-rendered initial grid window
- peek facts served from local build output

The change therefore declares `skip_specs: true`. The parity suite is the evidence that the specs still hold.

## Impact

- **Code:**
  - `src/scripts/` is replaced by React islands under `src/features/`.
  - `src/components/*.astro` become React components under `src/ui/`.
  - `src/lib/` moves to `src/domain/`, and `catalog.ts` and the payload builders move to `src/server/`.
  - `src/pages/` and `src/layouts/` stay as Astro, slimmed to composition.
  - `src/styles/global.css` is reduced to tokens and base styles.
- **Dependencies:**
  - Add: `@astrojs/react`, `react`, `react-dom`, `zustand`, `tailwind-variants`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@playwright/test`, and `eslint` with TypeScript, React hooks and boundary rules.
  - Keep: `astro`, `tailwindcss`, `@tailwindcss/vite`.
- **Scripts:**
  - Unchanged: `dev`, `build`, `preview`, `refresh`.
  - New: `test` (Vitest), `test:e2e` (Playwright), `lint`, `typecheck` (`astro check`).
- **Build output:** still static `dist/`, one HTML file per card, plus the island bundles. Pages without islands ship no React runtime.
- **Data and licensing:** unchanged. `data/` stays git-ignored, card art stays remote through the card-image module, and OpenRift / Riot attribution stays in the footer.

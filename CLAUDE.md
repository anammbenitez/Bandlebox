# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Riftbound Deck Manager is a personal, offline-first Astro site (static output, TypeScript strict, Tailwind v4 via `@tailwindcss/vite`) for browsing the English Riftbound card catalog and building rules-checked decks. No server state, no accounts. Also read `AGENTS.md` (shared agent rules), `PRODUCT.md` (users/purpose), and `DESIGN.md` (design system).

## Commands

- `npm run refresh` — fetch the OpenRift catalog into `data/` (`catalog.json`, `etag.txt`, derived `index.json`, `glyphs/`). **Required before dev/build on a fresh checkout**: `data/` is git-ignored and `src/lib/catalog.ts` imports the JSON directly, so the build fails without it. Uses ETag revalidation; failures keep the previous snapshot.
- Dev server: run in background mode per `AGENTS.md` — `astro dev --background` (then `astro dev stop|status|logs`). Serves at `http://localhost:4321`.
- `npm run build` — static build into `dist/` (one page per card). This is the main correctness gate; there is no lint script and no test framework.
- `npm run preview` — serve `dist/`.
- Verification scripts (plain Node, which strips TS types and imports `src/lib/*.ts` directly):
  - `node scripts/verify-deck-core.mjs` — deck model, store (incl. storage-failure paths), legality rules, share encode/decode.
  - `node scripts/verify-card-text.mjs` — card-text tokenizer/renderer; sweeps the real snapshot if `data/catalog.json` exists.
  - `node scripts/verify-card-image.mjs` — card-image module: URL scheme, per-role variant chains, dimensions, the inline `onerror` fallback, and the markup built on it.
  - `node scripts/verify-card-peek.mjs` — hover card: the dwell/stillness state machine (`hover-intent.ts`, driven on a fake clock) and the deck-fit facts (`deck-fit.ts`) against the real snapshot.
  Each runs as a whole (no per-case filter); add new assertions to the relevant script.
- UI check: `.opencode/skills/impeccable/scripts/impeccable.cmd detect <path>` (or `impeccable` under `sh`). `AGENTS.md` requires re-running it on changed UI before calling UI work done.

## Architecture

**Data flow: snapshot → build-time pages → JSON islands → vanilla TS.**

1. `scripts/refresh.mjs` writes the verbatim OpenRift response (`catalog.json`) and a normalized card ↔ printing ↔ set index (`index.json`). Never mirror card art locally — images load remotely via `imgUrl()`.
2. `src/lib/catalog.ts` is the only module that imports `data/*.json`; it exposes `index`, `snapshot`, and lookup helpers. Only Astro page front matter (server/build time) should import it.
3. Pages serialize what the client needs into `<script type="application/json" id="…">` tags (using `escapedJson` from `grid-payload.ts`), e.g. `grid-data`, `deck-card-data`, `deck-rules-data`. Client scripts in `src/scripts/` (`grid-filters.ts`, `deck-builder.ts`, `deck-list.ts`) read them back with `JSON.parse` — there is no UI framework.

**Pure modules in `src/lib/` must stay free of data imports and DOM/Vite-only APIs** so they run both in the browser and under the Node verify scripts. Keep explicit `.ts` extensions on relative imports in these modules (Node type-stripping needs them). Key ones:
- `deck.ts` — deck model, `DECK_RULES` (constructed limits), section keys/targets.
- `deck-rules.ts` — `validate(deck, indexes)` → per-rule pass/fail/pending report. Indexes come from `buildDeckRuleIndexes(snapshot, index)`, built in page front matter and passed in.
- `deck-fit.ts` — `deckFit(slug, deck, indexes)`: one card's color / champion-tag / copies / ban facts for the open deck, built on `deck-rules.ts`'s `domainVerdict` and `legendChampionTag` so the hover card and the checklist cannot disagree.
- `hover-intent.ts` — the card hover's dwell and stillness rule as a DOM-free state machine (injected timers; targets are `zone:slug` keys, since faces are re-rendered under a resting pointer). Judges movement by coordinates, never event type.
- `card-stats.ts` — a card's Might / Energy / Power with the symbol each carries in card text; shared by the detail page and the hover card.
- `deck-store.ts` — all decks in one versioned `localStorage` entry; falls back to memory and surfaces a one-shot warning when storage fails.
- `deck-share.ts` — stateless share links: deck encoded into the URL hash.
- `card-text.ts` / `keyword-styles.ts` / `glyphs.ts` — tokenize card text into keyword chips and game-glyph images.
- `card-image.ts` — the one place that decides how card art is requested from OpenRift: URL scheme, which variant each surface role uses (`hero` = `full`, `tile` = `400w`, `thumb` = `240w`), the degrade-then-remove fallback, and dimensions. Surfaces call `imgAttrs(imageId, role)`; never hard-code a size or an `onerror`. Payloads carry the `imageId`, not a URL.
- `grid-item.ts` — the grid card HTML shared by server render and client infinite scroll (`GRID_STEP` window).

Routes: `/` (filterable grid), `/cards/[slug]`, `/decks` (library), `/decks/build` (builder; deck selected client-side), `/peek/[slug].json` (static endpoint, one per card: `{ html }` with the hover card's deck-independent facts, rendered by `peek-facts.ts`; fetched lazily once a dwell completes. The deck-aware lines are computed in the browser, so these never go stale).

## Workflow: OpenSpec

Features are specified with OpenSpec. Current behavior specs live in `openspec/specs/<capability>/spec.md`; each change is proposed in `openspec/changes/<name>/` (proposal, design, delta specs, tasks) and archived to `openspec/changes/archive/YYYY-MM-DD-<name>/`, syncing deltas into the main specs. Code comments reference these (e.g. "design.md D4"). Workflow commands are in `.opencode/commands/opsx-*.md` and skills in `.opencode/skills/openspec-*` — a propose step creates planning artifacts only and stops before implementing.

## Design constraints

Start UI work from `DESIGN.md`. Colors come from tokens in `src/styles/global.css` (`@theme`: retuned `slate`/`amber`, plus `bark`, `leaf`, `bloom`) — never raw hex in components. Domain and keyword hues are data-only, never decorative. The deck-manager panels use the plain `Frame.astro` bark border — no painted pieces; the only painted detail is the header branch with flowering sprigs (`Base.astro`, `src/assets/wood/`). The page background is a dusk gradient on `body`. The `slate` scale is bark-brown ink, not green.

## Licensing

Catalog data, card art, and glyphs belong to OpenRift / Riot Games. Keep attribution/links back to OpenRift, never commit `data/` contents, and don't imply official affiliation.

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
  - `node scripts/verify-card-peek.mjs` — hover card: the dwell/stillness state machine (`hover-intent.ts`, driven on a fake clock) the facts fragment (`peek-facts.ts`: fixed places for every card, domain emblems, printed-text-only description, ban marker) and the deck-fit facts (`deck-fit.ts`) against the real snapshot.
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
- `deck-fit.ts` — `deckFit(slug, deck, indexes)`: one card's color / champion-tag / copies / ban facts for the open deck, built on `deck-rules.ts`'s `domainVerdict` and `legendChampionTag` so it and the checklist cannot disagree. The hover card no longer prints these (it describes the card, not the deck), so nothing in the UI imports it today; it is kept, with its checks, for any surface that wants a card's fit.
- `hover-intent.ts` — the card hover's dwell and stillness rule as a DOM-free state machine (injected timers; targets are `zone:slug` keys, since faces are re-rendered under a resting pointer). Judges movement by coordinates, never event type. Also the reach-the-peek rule: a short grace after the pointer leaves the face, and `hold()` while it is on the peek.
- `deck-return.ts` — the way back from a card page to the deck: the deck manager links to `/cards/{slug}?from=<its own address>` (the peek's "See more", the Legend face), and the card page turns its back link into "Back to deck". `from` is untrusted input: only an address inside `/decks/build` is accepted.
- `card-stats.ts` — a card's Might / Energy / Power with the symbol each carries in card text; shared by the detail page and the hover card.
- `deck-store.ts` — all decks in one versioned `localStorage` entry; falls back to memory and surfaces a one-shot warning when storage fails.
- `deck-share.ts` — stateless share links: deck encoded into the URL hash.
- `card-text.ts` / `keyword-styles.ts` / `glyphs.ts` — tokenize card text into keyword chips and game-glyph images.
- `card-image.ts` — the one place that decides how card art is requested from OpenRift: URL scheme, which variant each surface role uses (`hero` = `full`, `tile` = `400w`, `thumb` = `240w`), the degrade-then-remove fallback, and dimensions. Surfaces call `imgAttrs(imageId, role)`; never hard-code a size or an `onerror`. Payloads carry the `imageId`, not a URL.
- `grid-item.ts` — the grid card HTML shared by server render and client infinite scroll (`GRID_STEP` window).

Routes: `/` (filterable grid), `/cards/[slug]`, `/decks` (library), `/decks/build` (builder; deck selected client-side), `/peek/[slug].json` (static endpoint, one per card: `{ html }` with the hover card's facts, rendered by `peek-facts.ts` in one fixed order for every card (name + domain emblems in the corner / type line + ban marker / Energy, Power, Might in three fixed columns, a dash for a figure the card lacks / printed description); fetched lazily once a dwell completes. Nothing in it depends on the deck).

**Card description = the printing's printed text.** A card's description is its representative printing's `printedEffectText` then `printedRulesText`, rendered through `card-text.ts`; the keywords appear inside it as `[Keyword]` labels. The card record's `keywords` array is a search index, not printed content (the card never shows it as a row), so no surface renders it on its own.

**Domain emblems** are OpenRift's `/images/domains/{slug}` images (WebP, colorless is SVG), cached by `npm run refresh` into `data/glyphs/domain-{slug}.*` and resolved with `glyphUrl('domain_{slug}')`. They are distinct from the `rune_*` text glyphs; neutral and colorless have no rune, only an emblem.

## Workflow: OpenSpec

Features are specified with OpenSpec. Current behavior specs live in `openspec/specs/<capability>/spec.md`; each change is proposed in `openspec/changes/<name>/` (proposal, design, delta specs, tasks) and archived to `openspec/changes/archive/YYYY-MM-DD-<name>/`, syncing deltas into the main specs. Code comments reference these (e.g. "design.md D4"). Workflow commands are in `.opencode/commands/opsx-*.md` and skills in `.opencode/skills/openspec-*` — a propose step creates planning artifacts only and stops before implementing.

## Design constraints

Start UI work from `DESIGN.md`. Colors come from tokens in `src/styles/global.css` (`@theme`: retuned `slate`/`amber`, plus `bark`, `leaf`, `bloom`) — never raw hex in components. Domain and keyword hues are data-only, never decorative. The deck-manager panels use the plain `Frame.astro` bark border — no painted pieces; the only painted detail is the header branch with flowering sprigs (`Base.astro`, `src/assets/wood/`). The page background is a dusk gradient on `body`. The `slate` scale is bark-brown ink, not green.

## Licensing

Catalog data, card art, and glyphs belong to OpenRift / Riot Games. Keep attribution/links back to OpenRift, never commit `data/` contents, and don't imply official affiliation.

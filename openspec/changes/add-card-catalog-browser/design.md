# Design

## Context

Greenfield personal tool, fully decided in exploration: local web app, latest Astro, Tailwind v4, no accounts, `npm run dev` as the daily-use command. See proposal.md — Why.

Facts captured from a live API fetch that shape everything below (as of exploration date):

- `/api/v1/catalog?langs=EN` returns one JSON document (~2.6 MB, 1,106 cards / 2,491 printings / 13 sets). `cards` and `printings` are maps keyed by UUID, not arrays.
- Card = game object (slug, types, stats, keywords, errata, bans). Printing = physical version (FK `cardId` + `setId`, rarity, finish, artVariant, `imageId`s, language, distribution channels, `side2` token twin).
- Images live at `/media/cards/{imageId}-{120w|240w|400w|full}.webp`, hosted by OpenRift; art is Riot-owned, bulk mirroring disallowed.
- Every response carries `max-age=3600` + `ETag`; the docs ask for a User-Agent with contact details and for responses to be cached at least an hour.

## Goals / Non-Goals

**Goals:**
- One-command refresh with a derived index keyed on `cardId`/`printingId` that later phases must be able to build on unchanged.
- Instant, offline browsing: snapshot read at render time, zero client JS on detail pages, one small vanilla island for grid filtering.
- Data/art separation: our snapshot on disk, their art via URL.

**Non-Goals:**
- No collection/deck features or their persistence — the index must not anticipate behaviors for them yet (it only defines the keys they will identify printings by).
- No SQLite/database layer in this phase; the snapshot stays their verbatim JSON plus one derived index file.
- No bulk image caching; no UI theming ambitions beyond a readable Tailwind card grid.

## Decisions

### D1: Snapshot file, not live API, not SQLite (yet)

A Node `scripts/refresh.mjs` fetches `?langs=EN` with a descriptive User-Agent, writes `data/catalog.json` + `data/etag.txt`, and rebuilds `data/index.json` (derived card↔printing↔set map). Conditional revalidation via stored `If-None-Match`; `304` = no-op.

Alternatives: live fetch per view (slow, offline-hostile, still needs caching — re-inventing the snapshot) and SQLite + migrations now (phase 1 only ever reads; earned in the collection phase when we have writes). The snapshot also acts as the *replace boundary*: refresh overwrites only OpenRift-owned files, so later app-owned data lives beside it safely (spec: refresh never touches app-owned data).

### D2: Astro SSG with dev server as runtime, Tailwind via Vite integration

Catalog JSON is imported at build/dev time — pages render from disk state. Detail pages are prerendered `/cards/[slug]` routes (~1,100 pages, no client JS); the grid page carries one `<script>` island (vanilla TS) that filters the snapshot's cards in-browser. Tailwind v4 through `@tailwindcss/vite`.

Alternatives: full server-rendered runtime (loses instant detail pages, re-renders per keystroke over a snapshot that is small enough to hold in browser memory anyway) and full-client-SPA (pays a JSON parse + render per detail visit; Astro SSG gives these pages away mostly free). Dev mode is chosen as the daily command because data only changes when `refresh` runs — the dev server re-reads on data change; `build && preview` stays valid for the same sources, zero migration cost.

### D3: Grid is card-level; detail is card-with-its-printings

The grid lists the 1,106 *cards* (avoiding a 2,491-row wall): one canonical printing per card as the visual representative, with a variants-count chip. Detail aggregates printings grouped by set; rare given that most cards have ≤3 EN printings. Images use `240w` grid representative / `400w` detail with `loading="lazy"`.

Alternative: a printing-level grid (fine for collectors, but denser to scan and phase 2 handles printings anyway) — kept behind a single derived-index filter flag if it's ever wanted.

### D4: Derived index shape (the phase-2 contract)

`data/index.json` = `{ meta(fetchedAt,etag,langs), sets[], cards[]: { cardId, slug, name, types, printings: [{ printingId, setId, setSlug, language, rarity, finish, artVariant, imageIds, isToken/side2PrintingId }] } }`.

Rationale: exactly what grid/detail pages render, and what a future collection row (keyed on `printingId`) must identify. The card's verbatim snapshot and the index stay separate files (their data vs. our normalization); re-deriving is always possible from `catalog.json`.

### D5: Attribution and image honor (not a feature)

Card name links on detail pages pointing to OpenRift card pages are a courtesy; source file comments encode the non-mirroring rule. Images require being online — noted honestly as a limitation, with an on-demand per-printing cache as a possible later, explicitly-not-bulk personal extension only if needed.

## Risks / Trade-offs

- [OpenRift response shape can change (young API)] → snapshot is swapped wholesale by refresh, no versioned local schema to migrate; the docs announce breaking changes with our UA. Cards and sets are large but the index is tolerant to additive fields.
- [Dev mode as daily runtime can surprise when data loading behaves differently from production] → keep a `build && preview` check in tasks so both paths are exercised once; both render from the same sources, so flipping the default later is free so both paths are exercised; flip defaults is free.
- [1.1k prerendered detail pages could slow a cold dev-server page request](page-load cost per card) → dev renders on-demand; acceptable for 1–3 cards per session. If a power browse hurts, batch-rendering is opt-in later, no spec change.
- [Offline art is a visible gap] → accepted; snapshot data is all offline, art is not. Local image cache deliberately deferred (policy/memory of not-mirror rule).

## Migration Plan

New repo, no migration. Rollback after any apply step: delete the generated files listed in tasks (nothing else owns them); `catalog.json` can be deleted and re-fetched by rerunning refresh at any time.

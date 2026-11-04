# Proposal

## Why

The Riftbound deck and collection manager starts with nothing that can be shown or used. Phase 1 of the agreed phased plan produces the first usable vertical slice: a personal, local, offline-capable browser for every available Riftbound card, sourced from the OpenRift API (`https://openrift.app/developers`). It also lays the data foundation (catalog snapshot plus a derived card/printing/set index) that the later phases — collection tracking and deck building — will build on.

## What Changes

- Add a refresh script that fetches the OpenRift catalog once into a local snapshot file (`catalog.json`, English-only via `?langs=EN`), using a proper User-Agent and ETag/`If-None-Match`, so repeated runs are 304-cheap and respect the API's caching guidance.
- Add a derived index emitted alongside the snapshot, mapping cards ↔ printings ↔ sets — the normalized shape later phases key on — with `cardId`, `printingId`, and set slug as its keys.
- Add a latest-Astro static web app (Tailwind v4, vanilla-JS client island, no framework runtime) that reads the snapshot at render time:
  - Set index and per-set pages.
  - A browseable/filterable card grid (type, rarity, set, name/search text) filtered client-side.
  - One detail page per card (`/cards/[slug]`, statically rendered, no client JS) listing its printings: rarity, finish, art variant, set, distribution channel, doublesided token side, artist, signatures/overnumber markers.
- Card images load remotely from OpenRift (`/media/cards/{imageId}-{size}.webp`), lazy-loaded (`240w` in the grid, `400w`/`full` on detail); never mirrored locally.
- The daily-use run command is the Astro dev server (`npm run dev`); `astro build && preview` remains a test path over the same code.
- No accounts, no auth, no server-side state. Collection tracking and deck building are explicitly out of scope for this phase.

## Capabilities

### New Capabilities

- `catalog-snapshot`: Acquiring and maintaining the local OpenRift catalog snapshot and derived card/printing/set index — English-only fetch, User-Agent etiquette, ETag-based conditional refetch, and the guarantee that a refresh only replaces OpenRift-owned data and never touches app-owned data.
- `card-catalog-browser`: Browsing all available cards locally — set index, set pages, filterable card grid, per-card detail with its printings, and remote lazy-loaded card images; works offline after a refresh, except for card art.

### Modified Capabilities

- (none — the project has no existing specs; this is its first change)

## Impact

- New greenfield code (no existing implementation): Astro project skeleton, one Node refresh script, one derived-index module, set/grid/detail pages, Tailwind styling.
- Dependency surface: latest Astro + Tailwind v4 (`@tailwindcss/vite`); no database, no auth, no server of our own beyond the dev server.
- External: depends on OpenRift API availability only during `refresh`; browsing is offline after a refresh, except card art, which requires connectivity to `openrift.app`.
- Constraints observed from the API terms (carried into design rather than new behavior): card text and images belong to Riot Games; this tool only displays them locally without mirroring; OpenRift attribution is courtesy, not required.

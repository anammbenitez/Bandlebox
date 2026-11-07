# BandleBox

A personal, local web app for browsing every available Riftbound trading card, offline-first.

Card data comes from the OpenRift catalog API (`https://openrift.app/developers`). A one-command refresh downloads the English-only catalog into a local snapshot; the app renders entirely from that snapshot. Card data, set pages, and filtering work with no network at all — only card art is loaded remotely (lazy, never mirrored locally). No accounts, no server state.

## Stack

- [Astro](https://astro.build) (latest, static output) with TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite`
- A small vanilla-TS island for client-side grid filtering; everything else is static HTML
- One Node script (`scripts/refresh.mjs`) for data acquisition

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | **Daily-use command.** Serves the app at `http://localhost:4321`. Reads the local snapshot from `data/`; re-reads when the data changes. Run `npm run refresh` first if `data/` is empty. |
| `npm run build` | Static build into `dist/` (prerenders the grid and one page per card from the snapshot). |
| `npm run preview` | Serves the production build from `dist/`. Test path over the same code/data as `dev`. |
| `npm run refresh` | Fetches the English catalog from OpenRift and writes `data/catalog.json` (the verbatim snapshot) + `data/etag.txt`, then rebuilds the derived index `data/index.json`. Also caches the nine card symbols used in card text under `data/glyphs/`, even when the catalog itself is unchanged. Sends the stored ETag as `If-None-Match` on later runs, so an unchanged catalog is a cheap `304` no-op. Failures keep the previous snapshot and exit non-zero; a glyph download failure only warns. |

## Data directory layout

Local data lives in `data/` and is intentionally not committed (see `.gitignore`):

- `catalog.json` — the OpenRift response, kept verbatim (OpenRift-owned content)
- `etag.txt` — the response ETag used for conditional revalidation
- `index.json` — derived card ↔ printing ↔ set index (our normalization, rebuilt from the snapshot on every successful refresh)
- `glyphs/` — the card symbols used inside card text (might, exhaust, the six domain runes, rainbow), downloaded from OpenRift's glyph paths and kept as a local cache. `glyphs/NOTICE.md` records their origin and ownership. Like the rest of `data/`, this directory is ignored by git and never committed, so Riot-owned artwork is not published with the repository.

A refresh only ever replaces these OpenRift-owned files — never any other local data.

## Layout of the app

- `/` — browseable card grid over all cards (filter by type, rarity, set, free text; client-side)
- `/cards/{slug}` — one static page per card with all of its printings

Card art is loaded from OpenRift's media paths (`/media/cards/{imageId}-{size}.webp`) with smaller variants in the grid and larger ones on detail pages. Attribution: catalog data and images belong to OpenRift / Riot Games; card names on detail pages link back to OpenRift.

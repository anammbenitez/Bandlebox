# Tasks

## 1. Project skeleton

- [x] 1.1 Scaffold the latest Astro project in the repo root (`npm create astro@latest` with the minimal/static template), TypeScript, and add Tailwind v4 via `@tailwindcss/vite`; verify `npm run dev` serves a starter page at localhost and `npm run build` completes
- [x] 1.2 Create `data/` (local data, not committed) and write `README.md` (what `dev`, `build`, and `refresh` do); verify `npm run build && npm run preview` also serves the starter page

## 2. Catalog snapshot (`scripts/refresh.mjs`)

- [x] 2.1 Implement the refresh script: fetch `/api/v1/catalog?langs=EN` with a User-Agent of `RiftboundDeckManager/0.1 (<contact>)`, write `data/catalog.json` and `data/etag.txt`; verify running it produces a parseable `catalog.json` with `sets`, `cards`, `printings` maps and the sets count matches the live API (13 at planning time)
- [x] 2.2 Add conditional revalidation: send stored `If-None-Match` on subsequent runs; on `304` leave files untouched and report "up to date"; on `200` replace both files; verify by running refresh twice in a row (second run gets `304`) and confirming `catalog.json` mtime does not change on the second run
- [x] 2.3 Handle failure modes: offline/no network and malformed response keep the previous snapshot valid, with a clear console message and non-zero exit; verify by running against an unreachable host after a successful fetch

## 3. Derived index (`data/index.json`)

- [x] 3.1 Implement the index builder (same script run): emit `data/index.json` with `meta {fetchedAt, etag, langs}`, `sets[]`, and `cards[]` each carrying `cardId, slug, name, types, printings[]{printingId, setId, setSlug, language, rarity, finish, artVariant, imageIds, side2PrintingId}`; verify card and printing counts equal snapshot counts and a spot-checked card (`abandon`) maps to its real printing(s) with correct set and rarity
- [x] 3.2 Verify the index is re-derivable and complete: index card count == snapshot cards size, printing count == snapshot printings size, no printing appears under two cards, all `setSlug`s resolve to `sets[]`

## 4. Set index and set pages

- [x] 4.1 Build the set index page listing all sets from the index (slug, name, type, release date) linking to `/sets/[slug]`; verify every set from `index.json` appears and links resolve
- [x] 4.2 Build `/sets/[slug]` pages listing that set's cards (representative printing thumbnail, name, rarity, card type) linking to `/cards/[slug]`; verify a set page count matches that set's card count in the index

## 5. Card grid with client-side filtering

- [x] 5.1 Build the grid page: server-rendered initial list of all cards with representative printing (`240w` image, `loading="lazy"`), name, type, rarity, set chip, variants count; verify page renders all 1,106 cards' data from `data/index.json` with zero OpenRift data requests
- [x] 5.2 Add the vanilla-TS filter island (type, rarity, set, free text) client-side over the in-memory index; verify filtering updates the grid instantly with no navigation/network round-trips (check dev-tools network tab) and empty-result and reset states behave

## 6. Card detail pages

- [x] 6.1 Build `/cards/[slug]` statically rendered pages from the index: canonical card data (name, types, stats, keywords, errata when present, `maxCopiesOverride` when present) and a printings table/sections grouped by set; verify a multi-printing card shows every printing with rarity, finish, art variant, artist, language, channel/markers
- [x] 6.2 Render doublesided token info: printings with `side2PrintingId` show the counterpart short code/name linkage; verify on a known two-sided token printing
- [x] 6.3 Images on detail use `400w` (fallback `full`) with `loading="lazy"` and alt text; missing images degrade to a placeholder without breaking the page; verify with image requests blocked

## 7. Attribution and OpenRift courtesy links

- [x] 7.1 Link card names on detail pages to `https://openrift.app/cards/{slug}` and note OpenRift in the footer as the data source; verify the links point at real pages for a couple of slugs

## 8. Integration check

- [x] 8.1 Run the full loop once end-to-end: `refresh` → `npm run dev` → browse sets/grid/detail with the network blocked → `npm run build && npm run preview` renders the same pages; verify all card data renders with only image requests hitting the network
- [x] 8.2 Validate the change: `openspec validate add-card-catalog-browser --strict` passes, and every spec scenario traces to built behavior

## Workflow follow-up

- Archive the change after review of the running app (`/opsx-archive`).

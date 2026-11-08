# BandleBox

*A desk at dusk in the Bandlewood: a lantern lit, a branch across the window, a fan of cards under the lamp, and a quiet voice checking your count.*

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**BandleBox is a free, open-source card catalog and deck builder for Riftbound.** Browse the full English card pool, build a deck against the real constructed rules, see at a glance whether it is legal, and send it to someone as a link. It is a static site: no server, no accounts, no database. The catalog is a local snapshot, so everything except card art works offline.

INDEX:

[Quick start](#quick-start)

[The rules](#the-rules-are-the-product)

[How it works](#how-it-works)

[Contributing](#contributing)

[Using Riot content](#data-ownership)

[License](#license)

## What you can do

**Browse the catalog** (`/`, `/cards/[slug]`)

- Filter the grid by type, rarity, set and free text. Filters live in the URL, so a reload or a back-navigation puts you where you were. The grid reveals 60 cards at a time as you scroll.
- Open any card for its stats, its printed text and every one of its printings.
- Card text is formatted, not raw: keywords appear as labels in the card game's colors, and the game's symbols (might, exhaust, the domain runes) render as artwork.

**Build decks** (`/decks`, `/decks/build`)

- Click a card or drag it onto a section to add a copy. Each section only accepts the right card type: a Legend zone for legends, battlefields for battlefields, a rune deck for runes, and main and side decks for units, spells and gear.
- Section pills (All, Legend, Main deck, Battlefields, Runes) narrow the browser to the section you are filling. Once a Legend is chosen, the Domain filter starts on that Legend's two colors.
- Write your rune ratio as a count per color and the rune deck fills to match.
- Give the deck a Champion beside the Legend; its copies live in the main deck.
- Pause on any card in the deck manager (or focus it with the keyboard) and a quiet peek shows its name, domain emblems, type, cost and printed text. It never opens while you are clicking, dragging or scrolling.
- Your deck library keeps every deck in the browser, with a live legal / not-legal badge and a Legend cover on each tile.

**Share a deck**

- One button turns a deck into a link. Whoever opens it sees the deck and can save a copy to their own library. No account on either side.

## The rules are the product

A count, a color requirement or a legality verdict is only useful if it is correct and current. The checker (`validate()` in `src/lib/deck-rules.ts`) runs after every edit and reports each rule as it stands.

| Check | What it enforces | Driven by |
| --- | --- | --- |
| Legend | Exactly 1 Legend, one copy | `DECK_RULES.legends` |
| Main deck | Exactly 40 cards, counted by copies | `DECK_RULES.mainSize` |
| Rune deck | Exactly 12 rune cards | `DECK_RULES.runeSize` |
| Battlefields | Exactly 3, all different, one copy each | `DECK_RULES.battlefieldCount` |
| Side deck | At most 10 cards | `DECK_RULES.sideLimit` |
| Copy limit | At most 3 copies of any card name in the main and side decks. A card's own limit in the snapshot replaces the 3, and a limit of 0 keeps it out of the deck. | `DECK_RULES.maxCopies`, snapshot |
| Domain identity | Every main, side and rune card sits inside the Legend's colors. Neutral-domain cards are legal in every deck. | Legend, snapshot |
| Champion unit | At least one champion unit in the main deck sharing the Legend's champion tag | Legend, snapshot |
| Signature cards | At most 3 copies per champion tag, across the main and side decks | `DECK_RULES.maxCopies` |
| Constructed bans | Nothing banned in Constructed, in any section | snapshot |
| Cards match this snapshot | Every card in the deck exists in your local snapshot | snapshot |

The constants live in one place, `DECK_RULES` in [`src/lib/deck.ts`](src/lib/deck.ts). When the rules change, change them there.

**How a verdict is reached**

- Every check is *pass*, *fail* or *pending*. Domain identity and Champion unit stay *pending* until the deck has a Legend, because the Legend's colors and tag decide them.
- A deck is **legal only when every check passes**. A pending check is not a pass, and a deck that is one rule short is simply not legal.
- Battlefields are not judged by color. The rune deck has no per-name cap: any mix of the Legend's two colors is fine as long as there are 12.
- The Legend's champion tag is its first tag that appears on a champion unit anywhere in the snapshot, falling back to its first tag. Only a main-deck champion *unit* satisfies the champion check; a signature spell with the same tag does not.
- Unknown data is never a silent pass. A card with no domain data fails the domain check as unclassifiable, and only a neutral domain that is actually present widens legality.
- Bans and copy limits come from the snapshot, not from a list baked into the app, so a refresh picks up new bans.
- A shared deck that names cards your snapshot does not have keeps them in the deck and fails *Cards match this snapshot*. It is never quietly trimmed.

The checks are specified in [`openspec/specs/deck-legality/spec.md`](openspec/specs/deck-legality/spec.md).

## Quick start

You need Node.js 22.23.4 or newer and a network connection for the first refresh (and later for card art).

```bash
git clone https://github.com/anammbenitez/Bandlebox.git
cd Bandlebox
npm install
npm run refresh
npm run dev
```

Then open `http://localhost:4321`.

**Run `npm run refresh` before the first `dev` or `build`.** The `data/` directory is git-ignored and the app imports the snapshot directly, so on a fresh clone the build fails until `refresh` has run.

| Command | What it does |
| --- | --- |
| `npm run dev` | Serves the app at `http://localhost:4321` from the local snapshot in `data/`. |
| `npm run build` | Static build into `dist/`: the grid, the deck pages and one page per card. The main correctness gate. |
| `npm run preview` | Serves the production build from `dist/`. |
| `npm run refresh` | Fetches the English catalog from OpenRift into `data/` and rebuilds the derived index. Also caches the card symbols and domain emblems under `data/glyphs/`, even when the catalog itself is unchanged. |

There is no lint script and no test framework. Correctness is the build plus four plain-Node scripts that import `src/lib/*.ts` directly. Each runs as a whole:

| Script | What it checks |
| --- | --- |
| `node scripts/verify-deck-core.mjs` | The deck model, the library store (including storage-failure paths), the legality rules, and share-link encode and decode. |
| `node scripts/verify-card-text.mjs` | The card-text tokenizer and renderer. Sweeps the real snapshot when `data/catalog.json` exists. |
| `node scripts/verify-card-image.mjs` | The card-image module: URL scheme, per-surface size chains, dimensions and the fallback markup. |
| `node scripts/verify-card-peek.mjs` | The hover peek: the dwell and stillness state machine (on a fake clock), the facts fragment, and the deck-fit facts, against the real snapshot. |

## How it works

```text
OpenRift API ──refresh──▶ data/ snapshot ──build──▶ static pages ──JSON islands──▶ vanilla TypeScript
```

1. `scripts/refresh.mjs` writes the OpenRift response verbatim (`data/catalog.json`) and a normalized card ↔ printing ↔ set index (`data/index.json`).
2. At build time, Astro pages read the snapshot through `src/lib/catalog.ts`, the one module that imports the data files, and render the grid and one page per card.
3. Pages serialize what the browser needs into `<script type="application/json">` tags. Small scripts in `src/scripts/` read them back. There is no UI framework.

### Refresh

- Sends the stored ETag as `If-None-Match`, so an unchanged catalog is a cheap `304` and nothing is rewritten.
- Validates the response shape before touching disk, builds the new index in memory first, and writes each file by temp file then rename, so a half-finished refresh cannot leave a torn snapshot.
- Any failure keeps the previous snapshot and exits non-zero. A symbol or emblem that fails to download only warns, and card text falls back to readable text.
- Re-syncs the symbol and emblem cache on every run, even on a `304`, so a fresh clone with an intact snapshot fills a missing cache.
- `OPENRIFT_BASE` overrides the host. Refresh only ever replaces OpenRift-owned files in `data/`.

What lives in `data/` (none of it is committed):

- `catalog.json`: the OpenRift response, kept verbatim.
- `etag.txt`: the response ETag used for revalidation.
- `index.json`: the derived card ↔ printing ↔ set index, rebuilt on every successful refresh.
- `glyphs/`: the card symbols used in card text (might, exhaust, the six domain runes, rainbow) and the domain emblems (fury, calm, mind, body, chaos, order, neutral, colorless), with a `NOTICE.md` recording their origin and ownership.

### Share links

A deck link carries the deck itself in the URL hash, so it never reaches a server:

```text
/decks/build#s/d<base64url(deflate(json))>
/decks/build#s/b<base64url(json)>             used when compression is unavailable
```

The JSON is compact: `{ v, n, s, c? }` for schema version, deck name, sections as `[slug, qty]` pairs (keys `l`, `b`, `m`, `r`, `y` for legend, battlefields, main, rune, side) and an optional Champion pick. Decoding is tolerant. Unknown slugs are kept and fail validation later, garbage becomes an empty deck flagged as broken instead of an exception, and older links without a Champion pick open unchanged. A link carries card addresses, not card data, so it is read against whatever snapshot the opener has.

### Deck library

All decks live in one versioned `localStorage` entry (`riftbound-deck-library`), saved after every change. When storage is unavailable or full, the store falls back to memory and warns once that decks are not being saved. A deck saved from a shared link becomes a new deck with its own identity.

### Card art

Art is never mirrored. The browser requests OpenRift's media paths when it needs a card, and `src/lib/card-image.ts` is the one place that decides which size: the largest (`full`) for a card's hero image, `400w` for tiles and card faces, `240w` for thumbnails. A failed size degrades to a smaller one, then to a quiet no-art state, never a broken-image icon.

## Project map

```text
scripts/
  refresh.mjs          catalog, symbol and emblem sync; derived index
  verify-*.mjs         the four plain-Node checks above
src/
  lib/                 pure modules: deck model, rules, share, store, card text and image
  scripts/             DOM glue: grid-filters, deck-builder, deck-list, card-peek
  pages/               routes: /, /cards/[slug], /decks, /decks/build, /peek/[slug].json
  components/ layouts/ styles/ assets/
openspec/
  specs/               current behavior, one folder per capability
  changes/             proposed changes and their archive
data/                  local snapshot, git-ignored
```

The split that matters: modules in `src/lib/` stay free of data imports and DOM or Vite-only APIs, and keep explicit `.ts` extensions on relative imports. That is what lets the same code run in the browser and under the verify scripts.

## Contributing

Issues and pull requests are welcome.

- Run `npm run build` and the four verify scripts before sending a change. Add new assertions to the relevant script.
- Behavior is specified with [OpenSpec](https://github.com/Fission-AI/OpenSpec) (installed separately; it is not an npm dependency here). Current behavior lives in [`openspec/specs/`](openspec/specs). A change is proposed in `openspec/changes/<name>/`, implemented from its tasks, then archived with its deltas synced into the specs.
- If you change `DECK_RULES` or a check in `validate()`, update the rules table in this README in the same change.
- Start interface work from [`DESIGN.md`](DESIGN.md). Colors come from the tokens in `src/styles/global.css`, never raw hex. Domain and keyword hues are data-only, never decoration. The painted branch is a corner accent, not a border. Check changed UI with `.opencode/skills/impeccable/scripts/impeccable.cmd detect <path>` (or `impeccable` under `sh`).
- [`PRODUCT.md`](PRODUCT.md) says who this is for and what it will not become. [`CLAUDE.md`](CLAUDE.md) and [`AGENTS.md`](AGENTS.md) hold the working rules for coding agents.

## Principles

1. **No backend, ever.** Every feature works as static files plus browser storage. A feature that needs a server is a different product.
2. **Offline browsing is the baseline.** Card data is readable from the local snapshot; the network is only for art.
3. **The rules are the product.** Closeness is failure.
4. **Nothing to sign up for.** State lives in the browser and in the URL.
5. **The cards are the only ornament.** The interface stays out of the way of reading a card or judging a deck.

## Data ownership

BandleBox is an unofficial fan project. It is not affiliated with, endorsed by, or sponsored by Riot Games or OpenRift.

- Card data comes from the OpenRift catalog API. Card text, card art, the card symbols and the domain emblems belong to Riot Games, and OpenRift cannot grant rights to them.
- This repository contains none of it. `data/` is git-ignored: `npm run refresh` downloads the catalog and the symbols onto your machine only, and card art is requested from OpenRift when a card is shown, never stored.
- In the app, the footer credits OpenRift and card names on detail pages link back to openrift.app.
- **If you publish a build, you publish Riot Games content.** `npm run build` bakes the snapshot's card text, and the cached symbols and emblems, into `dist/`. Hosting that publicly is your responsibility, and the license below does not give you the right to do it.
- Be a good API citizen. `refresh` sends the stored ETag so an unchanged catalog costs a `304`. If you fork it and run it on a schedule, put your own contact in `CONTACT` in `scripts/refresh.mjs`.

## License

BandleBox's own code and documents are released under the [MIT License](LICENSE).

That license covers this repository's files only. It does not cover, and cannot grant rights to, Riftbound card data, text, art, symbols or names. Those stay with Riot Games and OpenRift; see [Data ownership](#data-ownership).

# Design

## Context

The site is a purely static Astro build over a local OpenRift snapshot (`data/catalog.json` + derived `data/index.json`), served through `src/lib/catalog.ts`. There is no backend, no user state anywhere, and the catalog grid already solves "browse 1000+ cards client-side" — an embedded JSON payload, in-memory filtering, windowed rendering via `src/scripts/grid-filters.ts` and the shared `src/lib/grid-item.ts` markup. See proposal.md for motivation and the spec deltas for the behavior contract.

Deck-legality facts are already in the snapshot: per-card `domains`, champion/signature distinction via `superTypes` (`champion` ×181, `signature` ×60), Champion-tag names on card tags, per-card copy-limit `maxCopiesOverride` (Spiderling = 0), and `bans[]` entries scoped to the Constructed format with dates.

## Goals / Non-Goals

**Goals:**
- Deck state fully client-side, deployable as-is to any static host.
- The legality checker as a pure, testable function of (deck, snapshot indexes).
- Maximal reuse of the catalog browser machinery; the deck builder should look and feel like the rest of the site.
- Deck structure and rule constants defined in one place so rules updates (like the 2026-07 side-deck change) stay cheap.

**Non-Goals:**
- No server, accounts, sync, or database; decks are local by construction.
- No per-printing selection; decks reference cards, art comes from the representative printing like everywhere else on the site.
- No import of external decklist formats, deck statistics (curve, rune-ratio advice), or editing a shared deck in place (shared decks are viewed and saved as a copy).

## Decisions

### D1. Storage: one versioned localStorage entry holding all decks
A single entry with a schema `version` field and each deck carrying its own `id` (generated at creation). Save-after-mutation; storage-failure path per spec (in-memory fallback + one-time warning).

*Alternatives:* IndexedDB (over-engineered for decks that are hundreds of bytes), one key per deck (key explosion, no atomic list), file-in-repo (not a user artifact, changes with every build).

### D2. Card references are slugs with quantities
Deck sections store `{ card: <slug>, qty: n }` pairs, plus the deck `name`, `id`, `updatedAt`, `schemaVersion`. Slugs are the site's own stable addressing everywhere else and keep share URLs human-inspectable.

*Alternatives:* internal UUIDs (opaque, but resolvable only against one snapshot; slugs survive snapshot refreshes better for humans), embedding full card objects (bloated, duplicates snapshot).

### D3. Deck rules live in one constants module
`DECK_RULES = { legend: 1, mainSize: 40, runeSize: 12, battlefields: 3, sideLimit: 10, maxCopies: 3 }`, with side-deck limit 10 (the 2026-07 tournament-rules update; the user's brief said 8 from the original rule). UI copy and the checker both read this module; no rule number is hardcoded in components.

### D4. Legality checker: pure function, snapshot-driven classification
`validate(deck, indexes) → { perRule: RuleResult[], legal: boolean }` where `indexes` are snapshot-derived maps (banned, copyLimits, superTypes, domains, tags). Classification comes straight from the snapshot — no tag-name heuristics:
- champion unit = unit card with `superTypes` containing `“champion”`, one unit satisfying the legend's tag match;
- signature = card tagged with a champion name, `superTypes` containing `“signature”`;
- domain legality = every card domain contained in the legend's domains;
- copy limits (≤ 3 per name, including snapshot overrides) bind the **main deck and side deck**; the rune deck is uncapped per name — official rules allow any ratio of the Legend's two rune colors, bounded only by the exactly-12 rule;
- unknown/unclassifiable card data fails the affected rule explicitly (spec'd).

*Alternatives:* checking directly in presentation code (untestable), heuristics from champion-name tags (the snapshot's `superTypes` make them unnecessary and wrong-prone).

### D5. Share links: canonical JSON → compression → base64url in the hash
The deck serializes compactly (section lists of `[slug, qty]` pairs), deflates via the native `CompressionStream` API when available, and lands in the URL hash so it never touches a server. Route space: `#d/<id>` opens a saved deck; `#s/<payload>` opens a shared one with "save as my deck".

*Alternatives:* uncompressed base64 (URLs several KB long and visibly ungainly), `lz-string` dependency (avoidable if CompressionStream covers the need; detect and fall back to uncompressed base64).

### D6. Two Astro pages + a shared deck controller module
`decks/index.astro` (deck list) and `decks/build.astro` (manager, deck id from the hash) with a shared `deck-store` client module owning deck state + persistence, used by both pages to avoid divergent save logic.

*Alternatives:* dragging full routing into the page (unnecessary for five sections), state in component-local scripts (duplicates save paths, breaks the no-divergence rule in deck-library).

### D7. Deck manager card browser reuses the grid payload pattern, new controller
The manager page embeds a payload built like the catalog's (same fields, same `<script type="application/json">` escaping, same `grid-item.ts` markup) so behavior matches — but the controller is a deck variant: add-buttons and inline copy affordances instead of plain links. `content-visibility` reuse keeps reveal cost proportional.

*Alternatives:* reusing `grid-filters.ts` unchanged (its interactions are link navigation, not adds; extension would mangle the catalog page's controller).

## Risks / Trade-offs

- [Doubled page weight: the manager payload repeats the index page's JSON] → share the payload builder, ship the same shape, verify against the existing page's size before adding optimizations; the catalog page evidently finds the trade acceptable.
- [localStorage quota ~5 MB, warn-level] → decks are hundreds of bytes; cap the deck list at a generous count and surface a quota error as the spec'd storage warning rather than failing silently.
- [Rules drift] → all limits in `DECK_RULES`; classification reads snapshot enums/superTypes, so snapshot refreshes keep legality current without code changes.
- [Shared links outlive snapshot changes] → unknown slugs render as affected-but-preserved decks (spec'd); no silent loss of the rest of the deck.
- [Copy-limit interpretation: per-section enforced here; some sources read main+side copies as combined] → encoded in `DECK_RULES` with per-section accounting now; the arena is a one-constant change if the combined ruling matters (see Open Questions).

## Open Questions

- Whether official constructed rules count the 3-copy limit across main deck + side deck combined (community guides read it per deck). Per-section is implemented; if the authoritative ruling turns out combined, only the checker's accounting changes.
- Whether the champion-unit search should consider champion superType cards in the side deck (they matter only for play, not deck legality; assumed main-deck only per rule 103.2).

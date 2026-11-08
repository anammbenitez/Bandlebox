# Design

## Context

The current `README.md` (about 40 lines) documents only data acquisition and two routes. The project has since grown a deck builder, a rules engine, share links, a card peek and card-text rendering, plus eight capability specs under `openspec/specs/` (`card-catalog-browser`, `card-peek`, `card-text-rendering`, `catalog-snapshot`, `deck-legality`, `deck-library`, `deck-manager`, `site-navigation`).

Facts that constrain the rewrite (all observed in the repo):

- `PRODUCT.md` fixes the product name ("BandleBox"), the principles (no backend, offline browsing baseline, rules are the product, nothing to sign up for, cards are the only ornament) and a list of absences future work must not fabricate: testimonials, usage metrics, pricing, partnerships, editorial card commentary.
- `CLAUDE.md` / `AGENTS.md` / `DESIGN.md` are written for agents and designers. The README is for humans arriving from GitHub, so it summarizes and links to them instead of copying them.
- `data/` (catalog, ETag, derived index, cached glyphs) is git-ignored. The repository therefore contains no Riot Games / OpenRift card data, art or glyphs. A built site, however, embeds card text from the snapshot.
- There is no `LICENSE` file, no CI, no screenshots, and no `CONTRIBUTING.md`. The git remote is `git@github.com:anammbenitez/Bandlebox.git`; the git author is Ana Benítez.
- The business rules live in code and specs: constants in `src/lib/deck.ts` (`DECK_RULES`), the checks in `src/lib/deck-rules.ts` (`validate`, `domainVerdict`, `legendChampionTag`), per-card fit in `src/lib/deck-fit.ts`, links in `src/lib/deck-share.ts`, persistence in `src/lib/deck-store.ts`, acquisition in `scripts/refresh.mjs`.

## Goals / Non-Goals

**Goals:**

- A reader who has never heard of Riftbound's deckbuilding rules can see what the checker enforces and why a deck gets a given verdict.
- A contributor can get from clone to a running, verified build without guessing (Node version, `refresh` before `dev`/`build`, the verify scripts).
- Every statement in the README is traceable to code or a spec, so it can be audited line by line.
- The legal edges are explicit enough that a fork or a host cannot reasonably misread what the license does and does not cover.

**Non-Goals:**

- Changing behavior to make the README easier to write. Where the README and the code disagree, the README describes the code and the disagreement is reported (see Decision 4).
- Replacing `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md` or the specs. The README points to them.
- Automating README accuracy (a README linter or a script that diffs numbers against `DECK_RULES`). Noted as a possible follow-up, not built here.

## Decisions

### 1. Voice: one in-world opening, then plain facts

The README opens with two or three sentences in the project's world (a desk at dusk in the Bandlewood, cards fanned under a lamp), and everything after that is direct and scannable: headed sections, tables for rules and commands, short paragraphs. The character comes from the opening, the section names (for example "The rules are the product") and a few well-placed lines of copy; it never replaces a fact.

Alternatives considered: a fully themed README (every heading in character) was rejected because a stranger scanning for "how do I run this" should not have to decode it. A dry, purely technical README was rejected because the request is explicitly for a creative one, and the product has a real identity (`DESIGN.md`).

### 2. Business logic is presented as a rules table, sourced from `DECK_RULES` and `validate()`

The checks are shown as a table: rule, what it enforces, the constant that drives it. Numbers are copied from `DECK_RULES` at apply time, never from memory, and the table names `src/lib/deck.ts` as the single place to change a limit. The table also states how verdicts compose: each check is pass, fail or pending (domain identity and champion unit are pending until a Legend is chosen), and a deck is legal only when every check passes, so pending is not legal.

Subtleties worth a sentence each because they are the product's real logic, not trivia:

- Neutral-domain cards are legal in every deck, but a card with no domain data at all fails as unclassifiable rather than passing.
- Battlefields are not judged by color. The rune deck has no per-name copy cap (any ratio of the Legend's two colors), while main and side cap copies per card name, honoring snapshot overrides.
- The Legend's champion tag is its first tag that appears on a champion unit anywhere in the snapshot (else its first tag), and only a main-deck unit that is a champion counts.
- `deck-fit.ts` computes one card's fit against the open deck from the checklist's own `domainVerdict` and `legendChampionTag`, so it cannot disagree with the checklist. At planning time `CLAUDE.md` and the `card-peek` spec say the hover card describes the card, not the deck, and that no surface imports `deck-fit.ts`; the README therefore does not say the peek reports deck fit, and describes the peek only as a card's facts.
- Bans come from the snapshot, not a hard-coded list; a shared deck that references cards missing from the local snapshot fails "Cards match this snapshot" instead of being silently trimmed.

Alternatives considered: prose only (hard to audit against code) and linking to `openspec/specs/deck-legality/spec.md` alone (readers would have to leave the README to learn the headline feature). The table plus a link covers both.

### 3. How-it-works sections describe mechanisms, not file listings

Three mechanisms get a short explanation because each embodies a design choice a contributor must not break:

- **Refresh**: ETag revalidation (`If-None-Match`, a `304` is a no-op), validate the response shape before touching disk, build the derived index in memory first, write atomically (temp file then rename), keep the previous snapshot and exit non-zero on any failure, and re-sync the cached card symbols and domain emblems even on a `304` (state the set as `refresh.mjs` defines it when apply runs, not a count from this document). `OPENRIFT_BASE` overrides the host.
- **Share links**: the deck is compacted to `{ v, n, s, c? }` with `[slug, qty]` pairs, deflated through `CompressionStream` when available, base64url-encoded, and carried in the URL hash as `#s/` + `d…` (deflate) or `b…` (plain JSON). The hash is never sent to a server. Decoding is tolerant: unknown slugs are kept and fail validation later, structural garbage yields an empty deck flagged as broken, and older links without a champion pick open unchanged.
- **Library**: all decks live in one versioned `localStorage` entry (`riftbound-deck-library`); if storage is unavailable the store falls back to memory and raises a one-shot warning; saving a viewed shared deck adopts it with a new identity.

A short "project map" separates `src/lib/` (pure, Node-verifiable modules with explicit `.ts` import extensions, no data or DOM imports) from `src/scripts/` (DOM glue) and `src/pages/` (the only code that imports the snapshot). That boundary is what makes the verify scripts possible, so it earns README space.

### 4. Report, do not resolve, the one spec/code wording difference found

`openspec/specs/deck-legality/spec.md` defines the signature cap over "tagged cards that are not units and not the legend (signature cards)". `validate()` in `src/lib/deck-rules.ts` identifies them by `superTypes.includes('signature')` and groups by the card's first tag. These agree on real data as far as the specs' scenarios go, but they are not the same definition. The README says "signature cards, at most 3 per champion tag" and does not repeat either definition. This is flagged as a follow-up for the owner (align the spec wording to the code or the reverse); it is not fixed in this change because it would change a spec, and this change changes none.

### 5. License: MIT, with an explicit scope statement

The owner chose MIT over Apache-2.0 and the other options (asked and answered during planning). The README's License section says MIT covers BandleBox's own source, and states in the same place that it does not cover card data, card art, glyphs or the names and marks of Riftbound / Riot Games, which stay with their owners. A `LICENSE` file is added (MIT, "Copyright (c) 2026 Ana Benítez", taken from the git author and the current year; the owner can correct the holder line before merging) and `package.json` gets `"license": "MIT"` so the metadata cannot contradict the file.

Alternatives considered: Apache-2.0 (explicit patent and trademark language, but heavier for a small static site whose main dependencies, Astro and Tailwind, are MIT) and AGPL-3.0 (copyleft; rejected by the owner's choice). No license at all was rejected: "open source" without a license grants no reuse rights.

### 6. Legal and attribution wording stays conservative and factual

The README states only what is true of the repository and the app: card data comes from OpenRift; card text, art and glyphs belong to Riot Games; art is loaded remotely and never mirrored; `data/` is never committed; card names link back to OpenRift in the app. It adds that the project is an unofficial fan project, not affiliated with or endorsed by Riot Games or OpenRift, and that anyone who publishes a built site is publishing card text from their snapshot and is responsible for their own rights to it. It does not quote Riot's legal policy, make claims about OpenRift's terms beyond what `refresh.mjs` and the spec already say, or assert trademark registrations it has not been able to check.

### 7. No fabricated social proof or visuals

Following `PRODUCT.md`, the README contains no testimonials, usage counts, star counts, "trusted by" lines, or CI/coverage badges (there is no CI). No screenshots are included because none exist in the repository; a short note can mark where one would go if the owner adds one later. The only badge allowed is a static MIT license badge, and only because the `LICENSE` file is added in the same change.

## Risks / Trade-offs

- **README drifts from the rules** → The numbers table names `DECK_RULES` as the source and the apply task copies values from the file, not from memory. A future change that edits `DECK_RULES` or a rule in `validate()` should update the table; this is called out in the README's contributing section and in the tasks. An automated check is a possible follow-up, not part of this change.
- **Creative tone reads as marketing** → One in-world opening, then facts. Review pass: remove any sentence that does not carry information or character the project already has in `DESIGN.md`.
- **Legal overreach or underreach** → Wording is limited to what the repo demonstrably does, and the license scope sentence separates code from Riot / OpenRift content. The owner should read the Data ownership and License sections before merging; this change cannot give legal advice.
- **Repo clone URL assumes a public repository** → The README uses the `origin` remote (`github.com/anammbenitez/Bandlebox`). If the repository is renamed or not yet public, the URL line is the only thing to change.
- **Two pre-publication notes in code now contradict "open source"** → `scripts/refresh.mjs` sets `CONTACT = 'personal local tool'` (its own `TODO(user)` asks for a real contact so OpenRift can reach the project) and `GLYPH_NOTICE` says "If this project is ever published, revisit the asset source before going live." Neither is a README problem and neither is changed here. Both are reported as follow-ups; the README's data-ownership section is written so it stays true whether or not they are changed.
- **Spec/code wording difference on signature cards** → Reported as a follow-up (Decision 4).
- **Other work is uncommitted in the same tree** → At planning time `git status` showed edits that are not part of this change (among them `README.md`, `scripts/refresh.mjs`, `src/lib/glyphs.ts`, the `card-peek` and `card-catalog-browser` specs, `CLAUDE.md` and `DESIGN.md`; the README edit extends the glyph cache to the eight domain emblems). The facts in this design were read from the tree as it stood and may move again. Apply must re-read each source file when it writes the matching README section, build on the current `README.md` rather than the committed one, and leave those other edits untouched. Counts and file lists (glyphs, emblems, verify scripts, routes) are stated from the code at apply time.
- **Adding `LICENSE` and a `package.json` field is more than "edit the README"** → Both are one-line, reversible, and required for the README's license statement to be true. If the owner prefers a README-only change, drop those two tasks and change the License section to point at a LICENSE file to come.

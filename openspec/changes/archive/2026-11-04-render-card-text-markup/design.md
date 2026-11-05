# Design

## Context

See proposal.md — Why.

Current state, verified against the local snapshot and OpenRift's own source:

- `src/pages/cards/[slug].astro` prints `printing.printedEffectText`, `printedRulesText`, `flavorText`, and `errata.corrected*Text` as raw strings. The keyword row prints `card.keywords` as plain pills; stats are plain numbers.
- The snapshot's text uses one markup language, measured across all 6,665 text values: `:rb_*:` glyph tokens (might 904, runes 730, energy 858 in levels 0–12, exhaust 327), `[Keyword]` labels (~1,300), `[>]`/`[>>]` shape markers (240), `_(...)_` italic runs (973), and hard newlines.
- Square brackets carry keyword parameters, sometimes glyphs themselves (`[Empower :rb_energy_2: :rb_rune_rainbow:]`), and `[>]`/`[>>]` are *shape* markers that attach to the neighbouring label — not labels of their own.
- The snapshot's `keywords` map has names, `costKeyword`/`cardModifier` flags and translations, but **no colors**. Keyword colors exist only in OpenRift's site bootstrap payload (`/api/v1/init`, undocumented in the developer docs).
- Riot's official Riftbound API (`riftbound-content-v1`) exposes art URLs, description, flavor text, stats, keywords and tags. It has **no glyph endpoint**, so no API-key path produces these symbols.
- Constraints: static output, detail pages must read without client JS, the repository is public, and publishing the site later would change the asset-distribution posture.

## Goals / Non-Goals

**Goals:**

- One tokenizer that understands the whole markup language, reusable by any future surface that shows card text.
- Build-time rendering with no new runtime dependency and no client JavaScript.
- Glyphs available offline, without committing Riot-owned artwork to a public repository.
- Graceful degradation at every unknown input: unknown keyword, unknown glyph, missing file.

**Non-Goals:**

- Changing the detail page layout, typography scale, or information hierarchy.
- Rendering card text in the grid, deck views, or search results.
- Solving publishing compliance (Riot API key, asset migration, hosting); the code only keeps that door open.
- Editing the snapshot or index formats.

## Decisions

### D1: Port the markup grammar into a pure tokenizer, not regex replacement

`src/lib/card-text.ts` exports `tokenizeCardText(text): CardTextToken[]` with `text | glyph | keyword | paren | italic | newline` tokens, plus `pointedRight`/`pointedLeft` on keywords.

Rationale: string replacement cannot handle three cases that are common in the data — glyphs nested inside a label, `[>]`/`[>>]` attaching shape to an adjacent label, and `_` italic runs that contain glyphs. The token order is load-bearing (glyphs before italics, parens before italics), which is exactly why an ordered pattern is used rather than successive replaces.

Alternatives: a Markdown library (wrong grammar, no keyword semantics), or per-token regex replaces (fails the nested cases above).

### D2: Tokenize to data, render to HTML in one pure function

`src/lib/card-text.ts` also exports `renderCardTextHtml(text): string`. Text nodes are HTML-escaped; keyword labels, glyphs, energy discs and italics become markup. `CardText.astro` is the only consumer and renders the string with `set:html`.

Rationale: the snapshot is third-party content, so escaping must be explicit and in one place. A pure string function is directly testable by a small Node verification script, matching the existing `scripts/verify-deck-core.mjs` precedent; component recursion in Astro would be harder to test and easy to get subtly wrong on nesting.

Alternative: a recursive Astro component per token type. Cleaner templating, but no tests without a DOM harness.

### D3: Keyword colors are a local table with a neutral fallback

`src/lib/keyword-styles.ts` holds the 34 `name → color/darkText` entries, keyed without trailing numbers (`Assault 3` → `Assault`), falling back to `#707070` in a muted chip style.

Rationale: the catalog does not carry colors, `/api/v1/init` is undocumented and could change without notice, and the project already owns a fixed color table for the six domains in `deck-builder.ts` with the same fallback pattern. A keyword OpenRift adds later renders correctly-but-neutral instead of breaking, and the gap is visible enough to notice.

Alternative: fetch `/api/v1/init` during refresh. More faithful to OpenRift's editorial colors, but adds a second API family and a new data file for 34 constants. Deferred until the endpoint is documented.

### D4: Glyphs are fetched by refresh into `data/glyphs/`, never committed

`scripts/refresh.mjs` downloads the nine SVGs the text needs — `might`, `exhaust`, `rune-{body,calm,chaos,fury,mind,order}`, `rune-rainbow` — into `data/glyphs/`, which is git-ignored like the snapshot. Glyph acquisition runs even on a `304` catalog response so a fresh clone fills the cache. Failure to fetch glyphs does not fail the refresh.

`src/lib/glyphs.ts` resolves names to build-time URLs through `import.meta.glob('../../data/glyphs/*.svg', { eager: true, query: '?url', import: 'default' })`; a name with no entry returns `undefined` and the renderer falls back to readable text. Energy is not a file: it renders as a styled disc containing the number.

Rationale: this is the only option that satisfies all four constraints at once — offline rendering, no Riot-owned file in a public repo, no dependency on OpenRift at page load, and no change to the card-art rule. Hotlinking fails offline and shifts bandwidth; committing into `public/` publishes Riot's artwork; there is no Riot API source to prefer. Keeping the resolver behind one module means a future approved-asset migration touches one file.

Trade-off accepted: a clone with no `data/` still needs `npm run refresh` before glyphs appear — exactly as it already needs it for the catalog.

### D5: Chip and glyph presentation follow the card, implemented as design tokens

Chips use a CSS custom-property pair (`--kw-color`, `--kw-ink`) set inline from the keyword table, with the card's slanted edge via `clip-path`; the marker shapes add a pointed left and/or right edge. Energy is a filled disc with a dark numeral; mono glyphs (`might`, `exhaust`) sit as white-on-dark images; rune glyphs keep their own colors. Styles live in `global.css` under `@layer components`, like the existing `.tag`/`.pill`/`.callout`, and the chip text is uppercase italic at ~0.78em to read as a label without competing with the 14px body.

Rationale: this was the visual direction settled in exploration (card-faithful colors, not a single-toned badge), and it keeps the color meaningful — keyword families are data, in the same spirit as domain colors.

Alternative: one neutral chip style for all keywords. Calmer, but discards information the physical card encodes.

### D6: Accessibility is part of the renderer, not a later pass

Keyword chips are real text, so their labels are exposed as text. Glyphs get an `alt` naming the concept ("might", "exhaust", "fury rune"); the energy disc gets an accessible name ("2 energy") while showing the numeral. All output is static HTML.

Rationale: image-only glyphs would otherwise be silent to screen readers; and because rendering is a pure function, accessibility attributes are trivial to assert in the verification script.

## Risks / Trade-offs

- [Keyword palette drifts from OpenRift's editorial colors] → neutral fallback keeps output correct; a later change can source `/api/v1/init` behind the same table.
- [OpenRift renames or adds glyph names] → resolver returns `undefined`, renderer prints readable text; no page failure.
- [OpenRift stops serving glyph files] → refresh keeps whatever is cached; new clones lose glyphs but text stays intact.
- [Riot-owned artwork in a public repo] → cache stays under git-ignored `data/`; a `NOTICE` in `data/glyphs/` records provenance, and the footer wording is corrected to say card *images* are not mirrored.
- [Chip density on text-heavy cards] → labels are smaller than body text and only chip-shaped; verify against the longest texts in the snapshot (multi-ability cards with several keywords).
- [`clip-path` shapes degrade in unusual browsers] → shape is decorative; the label stays readable without it.

## Migration Plan

No data migration. `npm run refresh` populates `data/glyphs/`; existing snapshots keep working and simply render without glyphs until the cache exists. Rollback: revert the touched files and delete `data/glyphs/`; nothing else owns that directory.

## Open Questions

- Whether a published site later moves to Riot-provided assets is a product decision, not a design one; `glyphs.ts` isolates the swap either way.

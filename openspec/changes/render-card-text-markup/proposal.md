# Proposal

## Why

Card detail pages print OpenRift's card-text markup verbatim, so players read `[Reaction] _(Play any time…)_` and `+3 :rb_might:` instead of the card's actual keyword labels and game symbols. The page is the app's reading surface, and right now it is the least faithful thing in it.

## What Changes

- Add a card-text renderer that takes the catalog's markup and produces readable HTML: keyword labels with their official colors, inline glyphs for might/exhaust/runes, energy as a numbered disc, real italic reminder text, hard line breaks, and the `[>]` / `[>>]` pointed edges that chain abilities.
- Use it on card detail pages for printed rules text, printed effect text, flavor text, and errata text. The keyword summary row and the Energy/Might/Power stats reuse the same chips and glyphs.
- Acquire the glyph artwork during `npm run refresh` into a locally cached, version-control-ignored folder, and emit it at build time. No client JavaScript is added, and no Riot-owned artwork is committed to the repository.
- Add a provenance note next to the cached glyphs and correct the footer wording so the attribution stays accurate once symbols are cached locally.
- Degrade gracefully: a missing glyph or unknown keyword must never blank or break the rendered text.

Out of scope: publishing/hosting the site, applying for a Riot API key or migrating the catalog source, rendering card text in any surface other than the card detail page, and any redesign of the detail page layout.

## Capabilities

### New Capabilities

- `card-text-rendering`: turns Riftbound card-text markup into faithful, accessible HTML (keyword labels, glyphs, italics, line breaks, ability pointer shapes) and owns the keyword color table and glyph mapping it depends on.

### Modified Capabilities

- `card-catalog-browser`: the card detail page must render card text as formatted content instead of raw markup, and its keyword/stats summaries must use the same visual language.
- `catalog-snapshot`: refresh must also cache the card glyph artwork locally, and the "refresh never touches app-owned data" rule must name that new OpenRift-owned cache.

## Impact

- New: `src/lib/card-text.ts` (tokenizer), `src/components/CardText.astro` (renderer), `src/lib/keyword-styles.ts` (keyword colors), `src/lib/glyphs.ts` (glyph name → asset URL, missing-file fallback).
- Modified: `src/pages/cards/[slug].astro`, `src/styles/global.css` (chip/glyph/energy styles), `src/layouts/Base.astro` (footer wording), `scripts/refresh.mjs` (glyph fetch), `.gitignore` (glyph cache path).
- Data: new `data/glyphs/` cache written by refresh, ignored by git; nine SVG files today (might, exhaust, six runes, rainbow).
- Dependencies: none added. Rendering is build-time only; card text stays searchable exactly as it is today.

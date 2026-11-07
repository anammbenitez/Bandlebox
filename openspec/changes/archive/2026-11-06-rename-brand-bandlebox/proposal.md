# Proposal

## Why

The app is named "BandleBox" but the header still reads "Riftbound Deck Manager". The current-page marker in the nav is a chunky, glowing, tilted leaf that is louder than the quiet forest chrome around it; it should be a refined, discreet gold leaf.

## What Changes

- The header brand shows the name **BandleBox** (replacing the "Riftbound" + "Deck Manager" two-part wordmark). The home link's accessible name and the browser tab titles use BandleBox too.
- The current-page marker beside the active nav link is redrawn as a small, slender gold leaf with a fine midrib and a short stem, upright-leaning rather than the current heavy tilted blob, with no glow halo.
- Gold only: the marker uses the existing amber token, never raw hex.

Assumptions (minor, recorded): page-title suffixes ("Browse cards — BandleBox") and the default `<title>`/aria-label are renamed along with the header; the brand medallion icon, favicon, and card-data attribution text are unchanged.

## Capabilities

### New Capabilities

### Modified Capabilities
- `site-navigation`: the brand is named BandleBox, and the current-page entry is marked with a discreet gold leaf.

## Impact

- `src/components/SiteHeader.astro` (brand text, aria-label, marker SVG)
- `src/styles/global.css` (`.nav-brand-sub` removal, `.nav-mark` sizing/glow)
- `src/layouts/Base.astro` and page `<Base title>` strings (title text)
- `DESIGN.md`/`PRODUCT.md` mentions of the old name, if any

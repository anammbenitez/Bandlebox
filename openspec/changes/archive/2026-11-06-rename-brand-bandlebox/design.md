# Design

## Context

`SiteHeader.astro` renders the brand (medallion SVG + "Riftbound" + a `nav-brand-sub` "Deck Manager" hidden below `sm`) and, for the active link, an inline 14px leaf SVG inside `.nav-mark` (rotated -14deg with an amber drop-shadow glow). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Brand reads BandleBox; marker is a refined, quiet gold leaf.

**Non-Goals:**
- No new brand medallion, favicon, or logo artwork; no layout changes to the header; no change to nav entries or order.

## Decisions

- **Single wordmark span.** Replace the two spans with one `<span>BandleBox</span>` and delete the now-unused `.nav-brand-sub` rules. Alternative (keep a subtitle like "Riftbound decks") rejected: the request names the app simply BandleBox.
- **Leaf redraw in the same inline SVG slot.** A lanceolate (pointed almond) leaf on a 14x14 viewBox, base at lower-left with a 2px stem, blade curving to a tip at upper-right, midrib stroked in `--color-bark-950` at ~0.7 width. Fill is `currentColor` (amber-400 via `.nav-mark`). Alternative: an image asset — rejected; inline SVG keeps tokens and needs no build step.
- **Quieter treatment.** Drop the `filter: drop-shadow` glow and reduce rotation to ~-8deg (the shape already leans), keep size at 14px or 12px so it fits the text line.
- **Titles.** Change the default in `Base.astro` and each page's `title` string to BandleBox; keep `Page — BandleBox` format.

## Risks / Trade-offs

- [Tiny leaf loses the midrib at 12-14px] → Use stroke width >= 0.8 and check on a high-DPI and a 1x screenshot.
- [Missed string leaves old name somewhere] → grep `Riftbound Deck Manager` across `src/` and docs after the edit.

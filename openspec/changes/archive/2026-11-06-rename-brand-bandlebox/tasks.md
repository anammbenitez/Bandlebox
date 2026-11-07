# Tasks

## 1. Brand name

- [x] 1.1 In `src/components/SiteHeader.astro`, replace the "Riftbound" / "Deck Manager" spans with a single "BandleBox" span and update the brand `aria-label`; verify the header shows only "BandleBox" at desktop and phone width in the dev server.
- [x] 1.2 Remove the unused `.nav-brand-sub` rules from `src/styles/global.css`; verify no remaining references with a grep for `nav-brand-sub`.
- [x] 1.3 Rename the default title in `src/layouts/Base.astro` and the `title` props in `src/pages/index.astro`, `src/pages/decks/index.astro`, `src/pages/decks/build.astro` and `src/pages/cards/[slug].astro`; verify with a grep that no `Riftbound Deck Manager` title remains in `src/`, and `npm run build` passes.

## 2. Gold leaf marker

- [x] 2.1 Redraw the `.nav-mark` SVG in `SiteHeader.astro` as a slender gold leaf with stem and midrib using `currentColor` and tokens only; verify visually on Decks and Browse cards that it sits within the text line height.
- [x] 2.2 Update `.nav-mark` in `src/styles/global.css`: remove the glow `filter`, reduce rotation; verify the marker shows on the active link only and reads as discreet.
- [x] 2.3 Run `.opencode/skills/impeccable/scripts/impeccable.cmd detect src/components/SiteHeader.astro` and `npm run build`; verify no new findings.

## 3. Docs

- [x] 3.1 Update any mention of the old name in `DESIGN.md`/`PRODUCT.md`/`README`; verify with a grep for "Riftbound Deck Manager" that only intentional attribution mentions remain.

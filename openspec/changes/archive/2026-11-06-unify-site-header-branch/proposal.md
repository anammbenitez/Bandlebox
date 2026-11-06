# Proposal

## Why

The app header's underside is meant to be one painted branch. On the card browser, deck library and card pages, an extra vertical sprig also hangs from the header's left end and crosses the bough, reading as a stray "cross" branch. The deck editor hides that sprig, so its header looks right and the rest do not. The header should look like the deck editor's, everywhere, from a single source.

## What Changes

- Remove the hanging vertical sprig (`bough-hang`) from the header on every page, so all pages show the deck editor's header: the horizontal bough with its two flowering sprigs, and nothing crossing it.
- Delete the now-unused hang asset (`sprig_vertical_left.png`) and the `bough-hang` styles, including the `.is-wide` override that only existed to hide it.
- Extract the header (skip link target, brand, nav links, bough, sprigs) from `Base.astro` into one `SiteHeader.astro` component that is the sole definition of the header for the whole site, with no per-page variant.

## Capabilities

### New Capabilities

### Modified Capabilities
- `site-navigation`: adds a requirement that the header, including its branch decoration, is identical on every page.

## Impact

- `src/layouts/Base.astro`: header markup moves out; asset imports for the hang removed.
- New `src/components/SiteHeader.astro`.
- `src/styles/global.css`: remove `.bough-hang` rules and the `.is-wide .bough-hang` override.
- `src/assets/wood/sprig_vertical_left.png`: deleted.
- `DESIGN.md` / `CLAUDE.md`: no stale mention of the hanging sprig (checked: none today); header description stays accurate.

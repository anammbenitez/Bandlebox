# Proposal

## Why

The Browse cards grid currently renders every card of the snapshot as static HTML in one page. The catalog grows every ~2 months as new sets of 150+ cards are released (1,106 cards today, ~2,000 within a year, ~5,500 within five). The "all cards at once" page scales linearly with the catalog — DOM size, initial HTML weight, and inline payload all degrade year over year — and the goal is that this page never needs revisiting because of card-count growth.

## What Changes

- The grid switches from rendering all cards to **windowed infinite scroll**: the server statically renders a first window of cards; the remaining cards are revealed in fixed-size steps as the user scrolls, driven by an IntersectionObserver sentinel, with no network round-trips and no card data change.
- The filter/search island keeps working as it does today (in-memory filtering over the embedded payload); it now operates over an unbounded rendered window.
- Browsing state becomes URL-recoverable: search text and filter selections are reflected in the page URL and restored on load.
- Back-navigation into the page restores the pre-click scroll position by re-inflating the window above the fold before scroll restoration, without jumping.
- A "Back to top" affordance appears after more than one screenful of grid.
- Grid items use `content-visibility: auto` so layout/paint work stays proportional to what is on screen.
- Out of scope: virtual DOM recycling below the rendered window, splitting the embedded payload into a fetched file, classic pagination, and any change to card data, detail pages, or set pages.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `card-catalog-browser`: the grid requirement changes from "lists every card in the snapshot" to "serves a first static window and reveals more on scroll, with no network traffic"; new requirements cover reveal-on-scroll behavior, filter-state and scroll restoration, browsing state in the URL, and the back-to-top affordance.

## Impact

- `src/pages/index.astro` — server-rendered grid becomes first-window only; adds sentinel element, back-to-top control, and filter-state serialization into the URL.
- `src/scripts/grid-filters.ts` — grows into the grid controller: window sizing/reveal, IntersectionObserver, filter/search state synced with the URL, back-navigation scroll restore, back-to-top.
- `src/lib/catalog.ts` — unchanged except for reading choices (no new network access; grid art URLs continue to lazy-load from OpenRift).
- No dependency changes, no API changes, no snapshot/index format changes; the `catalog-snapshot` requirements are untouched.

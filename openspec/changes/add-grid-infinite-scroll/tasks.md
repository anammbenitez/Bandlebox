# Tasks

## 1. Shared card-item rendering

- [x] 1.1 Extract one shared `<li>` card-item builder (art rotation for battlefields, representative printing, image URL, name/rarity/set line) used by both the server-rendered first window and client-side reveals; the SSR'd first window must keep the exact same markup as today's static list. Verify: `astro build` + manually inspect the served HTML — the first grid items match the previous markup.
- [x] 1.2 Add `content-visibility: auto` with a matching `contain-intrinsic-size` to grid items, and update the page copy that implies "every card is listed at once". Verify: computed style in the browser panel shows `content-visibility: auto` and the grid still lays out with no visible shift.

## 2. Windowed reveal controller

- [x] 2.1 Rework `src/scripts/grid-filters.ts` into the grid controller over the embedded payload: it tracks the current filtered sequence and appends a fixed step of 60 cards when an end sentinel enters the viewport (IntersectionObserver), with no navigation and no card-data request. Verify: scroll near the rendered end appends exactly the next 60 matching cards; devtools network shows no card-data fetch.
- [x] 2.2 Wire filtering/search into the controller: a filter or search change recomputes the sequence, renders its first step, returns the page to the top, and resumes reveal-on-scroll; keep the count line reporting full match count ("Showing X of Y cards") and the empty state. Add a reveal on scroll while offline (no network needed for reveals). Verify: typing a query resets the view to its first step and the count line stays accurate; offline (connection throttling) reveals keep rendering new steps.
- [x] 2.3 Sync browsing state to the URL: `q`, `type`, `rarity`, `set` params written via `history.replaceState` on every filter change (reveal depth as a recorded param for restore), with no new history entries. Verify: applying filters rewrites the URL without adding a history entry, and history length stays 1 after several filter changes.

## 3. Pre-render restore on navigation

- [x] 3.1 Set `history.scrollRestoration = 'manual'`; persist the scroll offset in sessionStorage (keyed by URL, throttled) and record the reveal depth reached. Verify: navigating deep, clicking a card, and going back re-renders enough of the previous session before restoring scroll, and the viewport lands near the card without a visible jump (root cause of jump = restoring before the DOM exists, per design.md).

## 4. Back-to-top control

- [x] 4.1 Add a back-to-top control that appears after more than one screenful of scroll, scrolls to the top, and hides at the top. Verify: visible on deep scroll, hidden at top, activation returns to the top and the filters are in view.

## 5. Integration verification

- [x] 5.1 Run the full regression pass: default view, each filter (type, rarity, set), combined filters, empty state reset, deep-link restore after reload, back-navigation restore from a card page, and reveal behavior at 2/3/4/5 column widths. Verify: every scenario in the delta spec passes; note any browser-specific scroll-restore lag.
- [x] 5.2 Confirm `astro build` and TypeScript typecheck are clean. Verify: build exits 0.

## Workflow follow-up

- Archive the change after review requirements are satisfied.
- Archive order matters with the pending `add-card-catalog-browser`: it must be archived first so `card-catalog-browser` exists as a main spec before this change's delta applies.

# Design

## Context

The browse grid (`src/pages/index.astro` + `src/scripts/grid-filters.ts`) currently SSRs all cards and filters by toggling a `hidden` class on each static `<li>`. The card data is fully client-side via an inline JSON payload (`#grid-data`, ~145 KB today), per the `card-catalog-browser` spec — no network round-trips for data, art lazy-loaded from OpenRift. That model is being replaced by a render window because the catalog grows ~75 cards/month. Filter-aware set pages (`/sets/...`) are unaffected.

Archive order note: the main spec for `card-catalog-browser` does not exist yet — it is created by the completed, unarchived change `add-card-catalog-browser`. This change's delta targets that same capability path, so archive order matters: `add-card-catalog-browser` first, then this change.

## Goals / Non-Goals

**Goals:**
- Runtime and initial-HTML costs become O(rendered window), never O(catalog). The page must not need rearchitecting as the catalog passes several thousand cards.
- Preserve today's interaction qualities: instant filtering, offline browsing after a refresh, lazy art, count line, empty state, no-JS readability of a first screenful.
- Recovery of browsing position: reload-safe filter state, back-navigation scroll restore.

**Non-Goals:**
- Virtual DOM recycling below the rendered window (only needed at tens of thousands of cards; the payload scan stays cheap).
- Moving the payload out of the inline `<script>` (a later, independent step once it passes ~1 MB).
- Classic pagination; changes to card data structures, detail pages, or set pages.

## Decisions

1. **Window memory instead of "hidden-toggle everything" is the new source of truth.** The controller rebuilds incremental steps from the JSON payload; the SSR'd first window and payload-built items share one `<li>` builder so markup stays identical. *Alternative rejected:* keep SSRing all `<li>`s but hide them with `content-visibility` — it preserves filtering simplicity but keeps initial HTML O(catalog), which is the growth this change exists to stop.

2. **Window size 60, step 60.** 60 divides evenly into every grid column count the layout uses (2/3/4/5 → 30/20/15/12 rows), so rows never break mid-step. SSR renders the first step; each reveal appends one step to the *current filtered sequence*. *Alternative rejected:* smaller steps (feel responsive but trigger observers too often) or offsetting step boundaries to the viewport (more state, no observable benefit).

3. **Filter changes reset the reveal and scroll to top.** A filter change recomputes the filtered sequence, renders its first step, scrolls to 0, and further reveal resumes on scroll. Predictability beats "keep my depth while filtering" (rarely the intent).
4. **URL carries filter state; sessionStorage carries scroll offset.** On every filter change the controller writes `?q=&type=&rarity=&set=` via `history.replaceState` (no history entries); on load it reads them back. `history.scrollRestoration = 'manual'`: on `pageshow` (including back/forward), the controller pre-renders `r` reveal steps recorded through the same replaceState, reads the last committed scroll offset from sessionStorage (keyed by URL, throttled updates), renders to cover it, then `scrollTo(offset)`. Keeping reveal depth in the URL makes back/restore work even when only the URL (not storage) is the surviving record. *Alternative rejected:* native scroll restoration — it races the JS that must build the DOM first, causing a visible jump.

5. **Reveal driver: IntersectionObserver on an end sentinel.** Universal in Astro's supported browsers; a sentry threshold of one viewport keeps reveals just ahead of the reader. No scroll-event fallback — IO coverage is effectively universal for this audience; adding one is YAGNI.

6. **`content-visibility: auto` on grid items** with `contain-intrinsic-size` approximating the item's rendered box, so steps already in the DOM but off-screen cost near-zero layout. This is free perf on stage one and stays valid after step 2 of the reveal work.

## Risks / Trade-offs

- [Ctrl+F can only find rendered cards] → Accept: the search box is the primary finder (searches card *text*, which Ctrl+F can't), and it's filterable. Documented in the spec-shaping session as the accepted cost.
- [Scroll restore race or mismatch on odd browsers] → Commit restore data (`r` in URL, offset in storage) *before* navigating away (replaceState fires on reveal, not on unload); restore synchronously in one paint after pre-render.
- [Reveal bursts trigger 60 image fetches] → `loading="lazy"` keeps requests viewport-gated; revealed-but-offscreen images stay unpended.
- [Reveal churn and URL writes on numerically near filters] → Debounce search replaceState to the same cadence as the existing filter `apply()`; replaceState is cheap.
- [URL length with long search text] → Bounded by one param; no pagination params accumulating.

## Migration Plan

Single static-frontend change; no data migration, no snapshot/index changes. Rollback = revert the commit; the snapshot, index, and all other pages continue to function. Feature is safe to ship incrementally: `content-visibility` + back-to-top land first as pure wins if the windowed reveal split is desired, but the change as planned lands whole.

## Open Questions

- None blocking. (The payload-externalization decision is deferred by existing non-goal; it becomes relevant if the payload approaches ~1 MB raw.)

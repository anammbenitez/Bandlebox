# Design

## Context

The deck manager (`src/pages/decks/build.astro`) lays its two working areas out as a CSS grid on `#deck-app`:

```
lg:grid-cols-[minmax(0,1fr)_380px]
xl:grid-cols-[minmax(0,1fr)_440px]
```

The viewer column (sections + checklist) is therefore fixed; below `lg` the grid stacks single-column. Section card rows inside the viewer are hardcoded `grid-cols-5 xl:grid-cols-6` on `ul[data-rows]` in the Astro template and re-rendered wholesale by `renderSections()` in `src/scripts/deck-builder.ts` (`rows.innerHTML = …`), so any reflow must come from CSS reacting to width, not from scripted column counts.

Everything interactive lives in `src/scripts/deck-builder.ts`; it already uses `localStorage` behind a storage-availability guard (`deck-storage-warning`), pattern to reuse for the width preference.

## Goals / Non-Goals

**Goals:**
- User-resizable viewer width via a drag grip, bounded, on `lg`+ layouts only.
- Viewer contents reflow to the actual panel width (container-driven column counts).
- Chosen width persists across visits with sane fallbacks.

**Non-Goals:**
- Touch/general pointer-chasing on small viewports: no sort-by-drag on the section rows, no movable splits on stacked layouts.
- Any change to deck state, share payloads, legality, or the browser's own grid.
- Split layout saved per-deck (one global preference is enough for v1).

## Decisions

- **CSS custom property drives the viewer width** — `#deck-app` gets `grid-template-columns: minmax(0,1fr) var(--deck-viewer-w, 380px)` at `lg`, with `--deck-viewer-w` set as an inline style on `#deck-app` from stored/default width. The grip is an element with `cursor: col-resize` placed between the grid columns; drag handling (`pointerdown`/`setPointerCapture` on the grip, pointermove computes `width = window-width - pointer-x`, clamped to bounds via `requestAnimationFrame`) writes the variable. Rationale: keeps the browser column automatically `1fr`, needs no library, and the same variable survives re-layout of either column. Alternative rejected: fixed grid with JS pixel math per breakpoint — duplicates the breakpoints and breaks when the page scrolls/zooms.
- **Bounds in CSS, clamped in JS** — minimum ≈ 280px (one rune-ratio row + 4 thumbnails stay legible), maximum ≈ 720px or half the viewport, whichever is smaller (the browser grid must keep at least a couple of its own columns). Enforce both in the drag clamp (px), and let the CSS grid clamp keep `minmax()` safety if the variable is ever off (`min(var(--deck-viewer-w, 380px), 50vw)` on the column track).
- **Reflow with `repeat(auto-fill, minmax(4rem, 1fr))` on section rows** — containers stop spelling out `grid-cols-5 xl:grid-cols-6`; thumbnails size to a sensible minimum and the browser computes the column count from actual panel width. Rationale: zero ResizeObserver wiring for the rows themselves, works for the re-rendered `innerHTML` since reflow is decided by CSS on `ul[data-rows]`, not the markup. The card browser's `#bd-list` stays breakpoint-based — its width changes as a *consequence* of the viewer drag, and its existing breakpoints already adapt; container-izing it is out of scope (Non-Goal).
- **Note on entry rendering** — browser and thumbnail impressions render full printed card faces (art files carry name/text), which is why raster card size drives legibility and why the viewer's 9-tiny-columns state (auto-fill at 4rem) feels too small; the follow-up redesign raises the floor.
- **Persistence via a single namespaced key** (`riftbound-deck-viewer-width`) following how the deck library already keys local storage: read once on init, clamp to bounds (stale stored values from older bounds), skipped silently when storage is unavailable. Write throttled through the same `rAF` path as the drag. Alternative considered: persistence only per-session — rejected; the user's expectation is that a chosen width sticks.
- **Viewport fit with sticky columns (user decision: sticky, not a locked page)** — at `lg`+ both the browser column and the viewer aside become `position: sticky; top` near the viewport top with `max-height: calc(100vh - offset)` and their own `overflow-y-auto`, so each stays within the visible screen and scrolls internally while the other stays pinned; `overscroll-contain` stops wheel chaining between the two scroll areas. Rationale: needs no height math against the site nav (which scrolls away), keeps warnings/footer reachable by the page scroll, and leaves the browser's IntersectionObserver sentinel working (IO accounts for nested scrollers). Alternative rejected: locking the whole page height at lg (overlay footer, header pinning, breakage risk across window sizes). The grip also caps to the viewport so the divider stays reachable.

## Risks / Trade-offs

- [Drag interacts with text selection / card drag-and-drop] → Grip handlers call `preventDefault` and capture the pointer; the grip sits in the grid gap column, not over the browser or drops targets, so `dragstart` from cards never reaches it.
- [Viewport fit: the columns ride up with the page when the user scrolls the page itself] → Accepted (sticky-columns design choice): page scroll only exists below the workspace (warnings/footer); wheeling inside either column never chains to it (`overscroll-contain`), and each column stays ≤ the viewport height, so the workspace body never overflows the screen.
- [Stored width outside new bounds after future bound changes] → Clamp reads on init.
- [Narrow min width squeezes the Rune ratio row] → The ratio row already wraps inputs; verify it still fits at the minimum and raise the bound if not (tasked validation step).
- [auto-fill minmax may off-by-one the row count versus the current 5-across look at default width] → Choose the `minmax` floor so default ≈ 5 columns, tuned in one place (template constant).

## Migration Plan

Single-page UI change; no data migration. Ship with grip hidden below `lg` exactly as today, so regression risk is confined to the two-column layout. Rollback = revert; stored width key is inert in the old code.

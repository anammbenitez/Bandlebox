# Design

## Context

The deck manager's desktop workspace is a three-track grid on `#deck-app`: the card browser (`minmax(0,1fr)`), a 12px `#deck-grip`, and the deck viewer (`min(var(--deck-viewer-w,520px),50vw)`). `deck-builder.ts` makes the grip a pointer-only resize handle on `lg`+, clamps the viewer between 280px and half the viewport, and persists the chosen width under `riftbound-deck-viewer-width`. Below `lg` the same grid collapses to one column and the panes swap via `data-view`, so the grip is hidden.

Both panels are independent `Bough` frames (`quiet` browser, `lit` viewer). `Bough.astro` paints only the four corners; the gutter between the panels is bare page ink. `DESIGN.md` still records the 12px grip and the 520px default. The vertical sprig `src/assets/wood/sprig_vertical_left.png` (155×380, transparent) is already converted to WebP by `Base.astro` for the nav's hanging vine, and `BoughSprite.astro` exposes the `#bough-run-v` vector billet used by the frame's vertical arms.

See `proposal.md` for motivation and `specs/deck-manager/spec.md` for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Make the desktop split fixed and equal: the browser and viewer each take half of the space left by the seam.
- Remove every path that can change one column's width independently: grip markup, drag handlers, bounds, persistence, and the CSS variable.
- Turn the former grip gap into a decorative center seam built from the existing painted sprig and vector billet, so the middle reads as part of the Bandlewood desk without becoming a third panel or a frame edge.
- Keep viewport confinement, independent scrolling, the below-`lg` pane swap, and all deck interactions unchanged.
- Record the new layout and seam rules in `DESIGN.md` and the deck-manager spec so the adjustable split is not reintroduced.

**Non-Goals:**

- Changing browser filters, card sizing, section structure, drag-and-drop, sharing, or deck data.
- Adding a new painted asset or regenerating the wood pack.
- Building a reusable splitter component, per-deck layout preferences, or any remaining resize affordance.
- Altering the nav's hanging sprig or the corner-only treatment of either panel.

## Decisions

### 1. Equal `1fr` panel tracks with one fixed seam track

At `lg`+, `#deck-app` becomes:

```
grid-template-columns: minmax(0, 1fr) var(--deck-seam-w) minmax(0, 1fr);
```

Both panel tracks are `1fr`, so they are equal at every window width; `minmax(0, 1fr)` keeps long content from forcing a track wider. The seam track is the only fixed width. `--deck-viewer-w` and its `xl` fallback are deleted, along with the `min(var(--deck-viewer-w,520px),50vw)` clamp.

`--deck-seam-w: clamp(4rem, 4vw, 6rem)` is set on `#deck-app`, with `lg:gap-x-2` between the tracks. The seam is therefore 64–96px wide plus 8px on each side: wide enough to hold the sprig at the nav's visual scale, while staying a gutter rather than a third panel at 2560. Exact values are visual tuning constants; they do not change the equality contract.

At the narrow end of the split the deck sheet's content box can be smaller than the ledger's five full labels at their 5.25rem floor. A container query on `.sheet` switches the ledger to its short labels and a 4rem floor below 27rem of sheet width, so the Side count stays visible instead of being clipped; the existing phone rules remain tighter still. This is a layout adaptation to the equal width, not a change to the equality.

Why grid: it makes the two panels equal without JavaScript measurement, keeps the existing one-row working-height shell, and leaves the below-`lg` single-column layout untouched. Alternative rejected: a flex row with `flex: 1 1 0`; it would work, but the grid is already the layout and the seam needs its own track. Alternative rejected: keep the grip but snap it to 50/50; it would still advertise a resizing affordance the request removes and leave a dead control in the gutter.

### 2. Delete the grip interaction and its persistence completely

Remove the `#deck-grip` element and its grid column, the `#deck-grip` rules in `build.astro`'s global style (including the below-`lg` display rule), and the whole resize block in `deck-builder.ts`: `gripEl`, `VIEWER_WIDTH_KEY`, bounds, clamp, `applyViewerWidth`, `readStoredViewerWidth`, `storeViewerWidth`, the rAF throttle, and the pointer handlers. `appEl` stays because it drives the pane swap and section queries.

Do not read, delete, or rewrite `riftbound-deck-viewer-width`. The old key becomes inert; removing it would add a storage write with no user-visible behavior and another failure path. Alternative considered: a one-time cleanup on load; rejected as unnecessary state mutation for an orphaned key.

The deck manager also stops exposing any pointer affordance in the gutter: no `col-resize` cursor, no hover highlight, no drag state. This is a deliberate removal of a user-facing capability, marked breaking in the proposal.

### 3. The seam is a gutter ornament, not a panel edge

Add `src/components/BoughSeam.astro`, rendered once between the two frames. Its root is a decorative `div` with `aria-hidden="true"`, `pointer-events: none`, and `hidden lg:flex`; it has no tabindex, role, or handlers. Inside the seam:

- **Painted sprig** — `sprig_vertical_left.png` through `getImage` (WebP, quality 88, full 155px source width for retina), placed near the top, centered, at roughly 70% of the seam width, with height driven by the source aspect ratio. Nothing is stretched, rotated, mirrored, or recolored.
- **Top billet** — a `#bough-run-v` `<use>` in a narrow SVG anchored to the top, sitting under the sprig so its cut stem has something to emerge from; its mask fades downward and is gone before 40% of the seam height.
- **Bottom billet** — the same sprite anchored to the bottom, masked to fade upward, ending before the seam's midpoint.

The two billets never meet, so the middle stays bare; there is exactly one sprig, no tiling, and no continuous center vine. The sprig is the existing nav cutting, which is the only asset in the pack designed to hang vertically. Alternative rejected: reuse a corner crop; each crop is registered for a specific elbow and would need rotation, mirroring, or re-cropping, all of which break the undistorted-paint rule and would read as a floating corner. Alternative rejected: run a full-height vine down the middle; that is the tiled vine the design record explicitly retired and would make the gutter a border.

The seam uses the default bough variables (`--bough-bark-1`, `--bough-bark-2`, `--bough-bark-lit`, `--bough-rim`) from the root, not the `lit`/`quiet` frame grades. It is page chrome between the two tones, so it should not lean toward either panel. The sprig keeps the nav's slight brightness/saturation reduction for consistency. No domain or keyword colors are introduced.

### 4. Responsive behavior stays aligned with the painted frames

- **`lg` and up** — three tracks, equal panels, seam visible.
- **Below `lg`** — one column; the seam is `display: none`; the existing `data-view` browser/viewer swap remains. No equal-split promise is made for the stacked panes.
- **Height ≤ 32rem** — the painted corners are already dropped so short windows keep a usable pane. Hide the seam in the same media query; a lone painted sprig without its frames would be the only ornament left and would crowd a 512px-tall workspace.
- **Reduced motion** — the seam is static, so no additional rule is needed.

### 5. Update the design record and spec together

`DESIGN.md` changes in two places:

- **Layout** — replace "12px resize grip, viewer column (`--deck-viewer-w`, default 520px)" with the equal two-column split and the center seam; keep the note that both frames fill the working height and scroll inside.
- **The bough** — add a short center-seam note: one painted sprig and dissolving billets in the gutter, a gutter ornament rather than a panel edge, never tiled or joined, hidden below `lg` and in short windows. Keep the corner rules unchanged.

The spec delta removes the adjustable-width and chosen-width requirements, adds the equal-split, seam, and panel-width reflow requirements, and rewrites the drag/default-width wording in the card-impression and field-zone requirements. Archived changes remain historical and are not edited. `AGENTS.md` already points UI work at `DESIGN.md`, so no new pointer is needed.

## Risks / Trade-offs

- **Equal halves shrink the browser on very wide screens** → The browser no longer absorbs all surplus width; its container-driven grid keeps impressions at the minimum comfortable size and adds columns more slowly. The deck sheet gains the room. The seam width is the only new fixed cost; tune it down before touching the equality.
- **The viewer at 50% on a 1024px desktop is slightly narrower than the old 520px default** → Verify the field zones at 1024, 1280, 1440, and 1920 with a full deck: Legend and Champion side by side, Battlefields horizontal, and a comfortable main-deck grid. If it does not fit, adjust the frame inset or thumbnail floor, not the equality.
- **A painted sprig in the gutter could read as a frame edge** → Keep it singular and top-anchored, fade both billets before the middle, and hide the seam when the panes stack or the window is short. The spec scenarios enforce those limits.
- **The reused vector billet may render too thick or thin at seam scale** → The sprite scales with the SVG box; tune the box width and mask stops against screenshots at 1024, 1440, and 2560. Do not add a second painted edge to compensate.
- **The transparent sprig can halo over the dark page** → Convert to WebP as the nav does and verify at 1x and 2x; the source already has clean alpha.
- **Stale local storage from the old grip** → The key is ignored and documented. No migration is needed, and no failure path is introduced.
- **Old comments and docs mention the grip** → Grep for `deck-grip`, `deck-viewer-w`, and "resize grip" after removal; update `build.astro`, `global.css`, `deck-builder.ts`, and `DESIGN.md`. Archived OpenSpec changes stay untouched.
- **The seam leaks into the stacked layout** → `hidden lg:flex` plus the single-column grid; verify at 1023px and 1024px.

## Migration Plan

Pure UI and documentation change; no data migration. Remove the grip code, styles, and variable, add the seam component and styles, then update `DESIGN.md` and the spec in the same pass. Rollback is a revert of the commit: the old resizable behavior returns, and the old stored width key becomes meaningful again if it is still present. The seam component can be removed independently without touching deck behavior.

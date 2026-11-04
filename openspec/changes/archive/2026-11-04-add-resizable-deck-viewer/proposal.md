# Proposal

## Why

The deck manager's deck viewer (the sections panel beside the card browser) is locked to a fixed column width (380px at `lg`, 440px at `xl`). Users cannot widen or narrow it to suit how they like to work — for example, larger deck thumbnails for legibility, or a narrower viewer to give the card browser more room. Now that the deck builder layout is otherwise settled (redesign-deck-pages is complete), making the viewer width user-controlled is a contained, high-value interaction improvement.

## What Changes

- Add a draggable grip between the card browser and the deck viewer panel on the deck manager page, letting users drag the viewer's width to any size within defined minimum/maximum bounds.
- Make the deck viewer's contents respond to the chosen width instead of the current fixed breakpoints: section card grids reflow their column count based on the space actually available in the panel.
- Persist the chosen width across visits (local browser storage), falling back to the current defaults when nothing is stored.
- Keep the change desktop-scoped: resizing applies only to the two-column (`lg` and wider) layout. Below `lg` the page already stacks the viewer full-width, where a drag grip adds no value and conflicts with touch scrolling; the grip is not offered there. (Assumption recorded per the request's "consider whether the approach fits smaller devices".)

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `deck-manager`: Add a requirement that the deck viewer panel width is user-adjustable via a drag grip on the two-column layout, with contents reflowing to the chosen width and the preference persisting; small-viewports are explicitly excluded.

## Impact

- `src/pages/decks/build.astro` — the `#deck-app` grid becomes a resizable split (CSS variables for the viewer column width, a grip element between the columns); section row grids stop hardcoding `grid-cols-5`/`xl:grid-cols-6`.
- `src/scripts/deck-builder.ts` — grip drag handling, width clamping/persisting in local storage, and any resize-observer wiring so re-rendered section rows reflow with the panel.
- No API, data-model, storage-schema, or dependency changes. Deck state, share payloads, and legality behavior are untouched.

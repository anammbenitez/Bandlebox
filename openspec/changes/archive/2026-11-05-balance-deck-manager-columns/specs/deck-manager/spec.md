# Spec Delta

## ADDED Requirements

### Requirement: Deck manager desktop split is equal

On large screens, the deck manager SHALL lay the card browser and deck viewer out as equal-width columns separated by a fixed decorative seam. The split SHALL be fixed: no grip, handle, or drag interaction SHALL resize either column, and no stored width preference SHALL alter the split. Both panels SHALL still fill the working height and scroll their own contents.

#### Scenario: Equal halves at desktop width

- **WHEN** the deck manager opens at a large-screen width
- **THEN** the card browser and the deck viewer occupy equal widths apart from the fixed center seam, and neither column can be resized by dragging

#### Scenario: Window resize keeps parity

- **WHEN** the desktop window is widened or narrowed
- **THEN** both panels grow or shrink together and remain the same width as each other

#### Scenario: No resize affordance

- **WHEN** a pointer moves between the card browser and the deck viewer
- **THEN** no resize grip appears, the cursor stays in its default state, and no drag behavior starts

#### Scenario: Stale width preference is ignored

- **WHEN** a viewer-width value from an earlier visit exists in local browser storage
- **THEN** the deck manager still renders the equal split and never applies the stored width

### Requirement: Center seam decorates the desktop split

On large screens, the deck manager SHALL place a decorative center seam in the fixed gutter between the card browser and deck viewer. The seam SHALL use the project's painted woodland assets — one hanging sprig and dissolving bough billets — and SHALL be purely decorative: it SHALL not accept pointer, drag, or focus interaction, host no resizing control, and SHALL be absent when the panes stack below the large-screen breakpoint.

#### Scenario: Seam appears between the panes

- **WHEN** the desktop layout renders the card browser and deck viewer side by side
- **THEN** a decorative seam sits centered between them for the full working height

#### Scenario: One sprig, dissolving billets

- **WHEN** the center seam renders
- **THEN** it shows a single painted hanging sprig and thin vertical billets that fade before reaching the middle, with no tiled vine, repeated ornament, or continuous border

#### Scenario: Seam is not a control

- **WHEN** a user points at or clicks the center seam
- **THEN** the cursor stays in its default state, no drag starts, and the browser and viewer keep their sizes

#### Scenario: Seam is hidden when panes stack

- **WHEN** the deck manager is viewed below the large-screen breakpoint
- **THEN** no center seam is rendered and the browser and viewer swap as full-width panes

#### Scenario: Seam stays out of working content

- **WHEN** the center seam renders at any desktop width
- **THEN** it stays within the gutter and covers no browser filter, card, ledger cell, deck row, or control

### Requirement: Deck viewer contents reflow with the panel width

The deck viewer's contents SHALL reflow to the panel's actual width rather than a fixed column count: each section's card rows SHALL present more cards per row when the viewer's equal column is wider and fewer when it is narrower, and no deck viewer content SHALL overflow or be cut off at any desktop window width.

#### Scenario: Wider window shows more cards per row

- **WHEN** the desktop window widens so the equal viewer column has room for more thumbnails
- **THEN** the section rows show more cards per row without changing card or copy behavior

#### Scenario: Narrower window keeps rows usable

- **WHEN** the desktop window narrows so the viewer column approaches the stacked breakpoint
- **THEN** the section rows reflow to fewer cards per row while thumbnails, copy counts, and controls stay usable, and nothing overflows or is clipped

#### Scenario: Stacked viewer still reflows

- **WHEN** the layout stacks below the large-screen breakpoint and the viewer becomes a full-width pane
- **THEN** its section rows still size from the pane's actual width without overflow

## MODIFIED Requirements

### Requirement: Card impressions size with their container

The deck editor's browsed-card grid SHALL lay out from its container's actual width rather than fixed breakpoints: the column count SHALL reflow as the container's width changes with the window, and each card impression SHALL not shrink below a minimum size whose printed name and labels remain comfortably readable.

#### Scenario: More width, more columns

- **WHEN** the desktop window widens so the browser's equal column gets wider
- **THEN** the card grid reflows to more columns of at least the minimum comfortable size

#### Scenario: Narrow width respects the minimum size

- **WHEN** the browser column gets too narrow to fit another column
- **THEN** the column count drops and the cards stay at no smaller than the minimum comfortable size, without clipping the printed labels

### Requirement: Deck viewer presents the field zones

At desktop sizes, the deck viewer SHALL present the deck zones in a field-like layout within its panel: the Legend and the Champion zone side by side at the top, a horizontal row for Battlefields, and a main-deck grid of comfortably sized cards that reflows with the panel width instead of many tiny columns. The viewer's equal half of the desktop workspace SHALL be wide enough for this layout.

#### Scenario: Legend and Champion share the top row

- **WHEN** a deck with a Legend opens in the viewer at desktop width
- **THEN** the Legend card and the Champion zone appear side by side as the first zone, the champion side showing the placed champion or its empty placement state

#### Scenario: Battlefields lie horizontally

- **WHEN** the Battlefields zone has cards
- **THEN** the battlefields show in a horizontal arrangement with each card's landscape orientation respected

#### Scenario: Main deck reads large

- **WHEN** a deck with a full main deck opens on a standard desktop PC
- **THEN** the main-deck cards render at a comfortable size with several per row, and keep this size as the window narrows toward the stacked breakpoint

## REMOVED Requirements

### Requirement: Deck viewer width is user-adjustable

**Reason**: The user asked for the card browser and deck viewer to stay the same size; the draggable split and its persisted width preference are replaced by an equal, fixed two-column layout.

**Migration**: No user action is required. The stored `riftbound-deck-viewer-width` value is ignored and may remain inert in browser storage; the deck manager always opens with equal columns.

### Requirement: Deck viewer contents respond to the chosen width

**Reason**: There is no user-chosen viewer width after the split becomes fixed; content reflow is now tied to the equal column's actual width as the window changes.

**Migration**: Reflow behavior is preserved by the added requirement "Deck viewer contents reflow with the panel width"; no deck data or preference migration is needed.

# Spec Delta

## ADDED Requirements

### Requirement: Deck viewer width is user-adjustable
On the deck manager's two-column layout (large screens), the deck viewer panel's width SHALL be adjustable by dragging a grip between the card browser and the deck viewer. The drag SHALL resize the viewer within defined minimum and maximum bounds, the browser column SHALL absorb the remaining width, and the chosen width SHALL persist across visits in local browser storage until changed or unavailable.

#### Scenario: Dragging the grip resizes the viewer
- **WHEN** a user drags the grip between the card browser and the deck viewer
- **THEN** the viewer's width follows the pointer within the allowed bounds, the browser column takes the remaining width, and the grip stays between the columns

#### Scenario: Dragging clamps at the bounds
- **WHEN** a user drags the grip past the minimum or maximum viewer width
- **THEN** the viewer stops at that bound and does not collapse, overflow the window, or stretch past it

#### Scenario: Chosen width survives a reload
- **WHEN** a user resizes the viewer and later reloads the deck manager on the same large-screen layout
- **THEN** the viewer opens at the width they last chose

#### Scenario: No grip on smaller viewports
- **WHEN** the deck manager is viewed below the large-screen breakpoint, where the card browser and deck viewer stack full-width
- **THEN** no grip is rendered and the stacked layout behaves as before

### Requirement: Two-column layout fits the screen
On the deck manager's two-column layout (large screens), the card browser and the deck viewer SHALL each be confined within the visible screen height rather than extend the page, and each side SHALL scroll its own contents independently: the deck viewer within its panel and the card grid within the browser column. Working one side SHALL not scroll the other side's contents, and the deck sections or browser content that exceed the screen remain reachable through each side's own scrolling.

#### Scenario: Sections beyond the screen scroll inside the viewer
- **WHEN** a deck holds enough cards that the deck viewer's sections exceed the screen height
- **THEN** the viewer stays confined to the visible screen and its contents scroll inside the panel as the user moves through the sections

#### Scenario: The browser scrolls its own card grid
- **WHEN** a user scrolls through the browsed cards
- **THEN** the cards scroll within the browser column only, the deck viewer stays confined to the visible screen, and its position is not scrolled by the browser's scrolling

#### Scenario: Appended cards stay reachable
- **WHEN** new cards load into the browser grid while the user keeps scrolling the browser column
- **THEN** the appended cards remain reachable through that column's own scrolling

#### Scenario: Smaller viewports keep the stacked layout
- **WHEN** the deck manager is viewed below the large-screen breakpoint
- **THEN** the layout stacks as before and the page scrolls through both parts normally

### Requirement: Deck viewer contents respond to the chosen width
The deck viewer's contents SHALL reflow to the panel's actual width rather than a fixed column count: each section's card rows SHALL present more cards per row when the viewer is widened and fewer when narrowed, and no deck viewer content SHALL overflow or be cut off at any width within the allowed bounds.

#### Scenario: Widening shows more cards per row
- **WHEN** a user widens the deck viewer so a section's card rows have room for more thumbnails
- **THEN** the rows show more cards per row without changing card or copy behavior

#### Scenario: Narrowing keeps rows usable
- **WHEN** a user narrows the deck viewer toward the minimum width
- **THEN** each section's card rows reflow to fewer cards per row while thumbnails, copy counts, and controls stay usable, and nothing overflows or is clipped

#### Scenario: Missing stored width falls back gracefully
- **WHEN** no stored width is available (first visit, or browser storage is unavailable)
- **THEN** the viewer uses the current default width and the page works as before

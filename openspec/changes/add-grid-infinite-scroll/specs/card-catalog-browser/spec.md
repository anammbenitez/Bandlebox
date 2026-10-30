# Spec Delta

## MODIFIED Requirements

### Requirement: Card grid with local filtering
The app SHALL provide a browseable grid of cards in the snapshot, showing at minimum name, card type, set, and printing rarity for each entry. The grid SHALL be served as a statically rendered initial window of cards, not every card at once. It SHALL support filtering by card type, rarity, and set, and free-text search over card names and text, entirely client-side.

#### Scenario: Default grid view
- **WHEN** the grid page opens with no filters applied
- **THEN** it lists an initial static window of cards rendered by the server, without any network request to the OpenRift API, and makes further cards reachable by scrolling

#### Scenario: Filters narrow the grid
- **WHEN** the user applies a type, rarity, or set filter, or types in the search box
- **THEN** the grid updates immediately in the browser, with no navigation and no server round-trips

## ADDED Requirements

### Requirement: Windowed reveal on scroll
The grid SHALL reveal additional cards beyond the initially rendered window as the user approaches the end of the rendered cards, in fixed-size steps, with no page navigation and no card-data network request. Revealed cards SHALL come from card data already in the browser. The count of matching cards shown to the user SHALL reflect the filter result, independent of how many cards have been revealed.

#### Scenario: Scrolling reveals more cards
- **WHEN** the user scrolls so that the end of the currently rendered cards comes near the viewport
- **THEN** the next fixed-size step of cards from the current filtered result is rendered, and no request for card data or page navigation occurs

#### Scenario: Filtering starts a fresh window
- **WHEN** the user changes the search text or any filter
- **THEN** the rendered window restarts from the first cards of the new filtered result, the page returns to the top of the grid, and the count line reports the full number of matching cards

#### Scenario: Reveal works offline
- **WHEN** the app is opened offline after a completed refresh and the user scrolls through several reveal steps
- **THEN** card data keeps appearing in fixed-size steps; only card images may fail to load

#### Scenario: Scroll ends at the last card
- **WHEN** every card of the current filtered result has been revealed
- **THEN** no further reveal occurs regardless of further scrolling, no blank placeholder space is left after the last card, and the page ends directly with the footer

### Requirement: Browsing state survives reload via URL
The page URL SHALL encode the current search text and each applied filter. Opening such a URL, including after a reload, SHALL restore that browsing state without requiring the user to re-enter it. A URL without browsing-state parameters SHALL open the default unfiltered view.

#### Scenario: Reload restores filters
- **WHEN** the user has applied filters, copies the URL, and opens it later
- **THEN** the page opens with those filters applied and the matching result

### Requirement: Scroll restoration on back-navigation
When the user returns to the grid page after following a card link, the page SHALL restore their previous browsing position: the same filters, the same amount of revealed content above their prior scroll position, and a scroll position close to where they left off, without a visible jump.

#### Scenario: Returning from a card page
- **WHEN** the user opened a card detail page from a deeply scrolled grid and returns via the browser back navigation
- **THEN** the page re-renders enough of the prior browsing session before restoring scroll, and the viewport lands near the card they came from

### Requirement: Back to top control
The grid page SHALL provide a control that scrolls back to the top of the page. It SHALL be shown once the user has scrolled more than one screenful beyond the top, and hidden when the page is at or near the top.

#### Scenario: Control appears on deep scroll
- **WHEN** the user has scrolled the grid more than one screenful
- **THEN** a back-to-top control is visible, and activating it returns the page to the top and hides the control

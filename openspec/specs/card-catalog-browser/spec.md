# card-catalog-browser Specification

## Purpose

Renders the entire available Riftbound card catalog as a local, personal web UI: set index, filterable card grid, and per-card details with all their printings. Content comes from the local snapshot; card art is loaded from OpenRift without local mirroring.

## Requirements

### Requirement: Card grid with local filtering

The app SHALL provide a browseable grid of cards in the snapshot, showing at minimum name, card type, set, and printing rarity for each entry. The grid SHALL be served as a statically rendered initial window of cards, not every card at once. It SHALL support filtering by card type, rarity, and set, and free-text search over card names and text, entirely client-side.

#### Scenario: Default grid view

- **WHEN** the grid page opens with no filters applied
- **THEN** it lists an initial static window of cards rendered by the server, without any network request to the OpenRift API, and makes further cards reachable by scrolling

#### Scenario: Filters narrow the grid

- **WHEN** the user applies a type, rarity, or set filter, or types in the search box
- **THEN** the grid updates immediately in the browser, with no navigation and no server round-trips

### Requirement: Card detail pages are statically rendered

The app SHALL render one statically generated page per card, reachable at `/cards/{card-slug}`, requiring no client-side JavaScript to read. Each detail page SHALL show the card's canonical data (name, types, stats, keywords, errata where present) and all of its printings, including for each: set, rarity, finish (normal/foil), art variant, artist, language, distribution channel or promo markers, and the doublesided token side where one exists.

#### Scenario: Detail page with all printings

- **WHEN** a card with several printings (e.g. a base printing, promo, and foil variant) is opened at `/cards/{slug}`
- **THEN** the page lists every printing in the snapshot for that card with its distinguishing attributes, without requiring client-side JavaScript for the content

#### Scenario: Doublesided token shown

- **WHEN** a printing belongs to a double-sided token pair
- **THEN** its token counterpart (the `side2` printing) is identifiable on that page

### Requirement: Card art loads remotely without mirroring

The app SHALL display card images by lazy-loading them from OpenRift's media paths at appropriate sizes (smaller variants in the grid, larger variants on detail pages). It MUST NOT download, store, or serve card image files in bulk locally.

#### Scenario: Images appear without blocking browsing

- **WHEN** the grid or a detail page loads, with or without image connectivity
- **THEN** card data renders immediately and image requests are lazily issued per visible card, so browsing never waits on art

### Requirement: Set index and set pages

The app SHALL provide an index page listing all sets in the snapshot (slug, name, type, release dates), and one page per set listing its cards, navigable to card detail pages.

#### Scenario: Navigating by set

- **WHEN** the user opens the set index
- **THEN** all sets from the snapshot are listed, and each set page links to the cards it contains, each linking onward to `/cards/{slug}`

### Requirement: Browsing is offline after a refresh

The app SHALL serve all card content from the local snapshot when browsing. A network connection MUST NOT be required to render card data, sets, or filtering — only card art retrieval contacts OpenRift.

#### Scenario: Offline browsing

- **WHEN** the app is opened offline after a completed refresh
- **THEN** all card data, detail pages, set pages, and filtering work; only card images may fail to load

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

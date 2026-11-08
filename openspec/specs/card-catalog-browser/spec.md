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

The app SHALL render one statically generated page per card, reachable at `/cards/{card-slug}`, requiring no client-side JavaScript to read. Each detail page SHALL show the card's canonical data (name, types, stats, errata where present, and the printed text, in which its keywords appear as labels) and all of its printings, including for each: set, rarity, finish (normal/foil), art variant, artist, language, distribution channel or promo markers, and the doublesided token side where one exists.

#### Scenario: Detail page with all printings

- **WHEN** a card with several printings (e.g. a base printing, promo, and foil variant) is opened at `/cards/{slug}`
- **THEN** the page lists every printing in the snapshot for that card with its distinguishing attributes, without requiring client-side JavaScript for the content

#### Scenario: Doublesided token shown

- **WHEN** a printing belongs to a double-sided token pair
- **THEN** its token counterpart (the `side2` printing) is identifiable on that page

### Requirement: Card art loads remotely without mirroring

The app SHALL display card images by loading them from OpenRift's media paths at a size suited to where they appear: the largest available variant as the main image on a card's detail page, loaded immediately, and a smaller variant for every other card image, lazily per visible card. It MUST NOT download, store, or serve card image files in bulk locally.

#### Scenario: Images appear without blocking browsing

- **WHEN** the grid or a detail page loads, with or without image connectivity
- **THEN** card data renders immediately and grid image requests are lazily issued per visible card, so browsing never waits on art

#### Scenario: Detail page shows the sharpest available art

- **WHEN** a card's detail page loads with image connectivity
- **THEN** its main image is the largest variant OpenRift offers (`full`), requested immediately rather than deferred until scrolled into view

#### Scenario: Detail art degrades gracefully

- **WHEN** the largest variant fails to load on a detail page
- **THEN** the mid-size variant is tried next, and if that also fails the "no art" placeholder remains visible without a broken-image icon

#### Scenario: Detail art does not shift the layout

- **WHEN** the detail page main image loads
- **THEN** its slot already reserves the card's aspect ratio (portrait for most cards, landscape for battlefields), so surrounding content does not move

### Requirement: Card art resolution follows display size

Every card image the app shows SHALL be requested at the smallest OpenRift variant that stays sharp at its displayed size: the mid-size variant (`400w`) for card faces and tiles, the small variant (`240w`) only for small thumbnails, and the largest (`full`) for the detail hero. A failed variant SHALL degrade one step to a smaller one and finally to the surface's no-art state, never a broken-image icon.

#### Scenario: Grid tiles use the mid-size variant

- **WHEN** the card grid renders tiles at roughly 200-230 CSS px wide
- **THEN** each tile's art is the mid-size variant (`400w`), not the small one

#### Scenario: Deck manager faces use the mid-size variant

- **WHEN** the deck manager shows card faces in its card browser or deck viewer (Legend, Champion, battlefields, main/rune/side faces)
- **THEN** each face's art is the mid-size variant

#### Scenario: Small thumbnails keep the small variant

- **WHEN** a surface shows many small images, such as the Legend picker in the new-deck modal or the printings list on a card's detail page
- **THEN** those images use the small variant (`240w`), since a larger file would add weight without a visible gain

#### Scenario: Any surface degrades the same way

- **WHEN** an image's preferred variant fails to load on any surface
- **THEN** the next smaller variant is tried, and when none remain the image element is removed so the surface's existing placeholder shows, without a broken-image icon

#### Scenario: Weight stays proportionate

- **WHEN** a page with many cards loads
- **THEN** only images near the viewport are requested at the larger variant, and the card data payload does not carry a prebuilt URL per image variant

### Requirement: Browsing is offline after a refresh

The app SHALL serve all card content from the local snapshot when browsing. A network connection MUST NOT be required to render card data or filtering — only card art retrieval contacts OpenRift.

#### Scenario: Offline browsing

- **WHEN** the app is opened offline after a completed refresh
- **THEN** all card data, detail pages, and filtering work; only card images may fail to load

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

### Requirement: The card page's back link returns to the deck it was opened from

The card detail page SHALL have a back link that, by default, reads "All cards" and goes to the card grid. When the page is opened with the deck manager's address as its return address (the deck manager's card peek and the links on its card faces carry one), the back link SHALL instead read "Back to deck" and return to that deck manager address. An address that is not the deck manager's SHALL be ignored.

#### Scenario: Opened from the deck manager

- **WHEN** a card page is opened from the deck manager with its return address
- **THEN** the back link reads "Back to deck" and returns to the deck being built

#### Scenario: Opened any other way

- **WHEN** a card page is opened with no return address or one that is not the deck manager's
- **THEN** the back link reads "All cards" and goes to the card grid

### Requirement: Card detail page renders card text as formatted content

The card detail page SHALL render the selected printing's printed rules text, effect text, flavor text, and any errata text as formatted content, not raw catalog markup. A card's keywords SHALL appear only where its printed text prints them, as labels inside that text; the page SHALL NOT list them again as a separate row, because the card does not. Its Energy, Might, and Power figures SHALL use the same symbol treatment as the text, so a reader sees one visual language for the card.

#### Scenario: Opening a card with markup

- **WHEN** a card whose printed text contains keyword terms, reminder text, and symbols is opened
- **THEN** the page shows colored keyword labels, glyphs for game symbols, and italic reminder text, and no `[ ]`, `_( )_`, or `:rb_*:` syntax is visible anywhere in the card text

#### Scenario: Keywords appear only inside the text

- **WHEN** a card whose data lists keywords is opened
- **THEN** each keyword shows as a label inside the printed text where the card prints it, and no separate keyword row appears

#### Scenario: Stats use the card's symbols

- **WHEN** the card has Energy, Might, or Power values
- **THEN** each figure is presented with the same symbol or numbered indicator used for that concept in the card text

#### Scenario: Errata uses the same rendering

- **WHEN** a card has errata with corrected rules or effect text
- **THEN** the corrected text is rendered the same way as the printed text

### Requirement: Browse cards page description

The card grid page SHALL present the short description "Catalog of all the cards in the game." beneath its title, replacing any longer explanatory text.

#### Scenario: Reading the page intro

- **WHEN** the Browse cards page opens
- **THEN** its title is followed by exactly that description

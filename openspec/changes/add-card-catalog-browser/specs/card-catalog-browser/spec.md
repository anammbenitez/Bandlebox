# Spec Delta

## Purpose

Renders the entire available Riftbound card catalog as a local, personal web UI: set index, filterable card grid, and per-card details with all their printings. Content comes from the local snapshot; card art is loaded from OpenRift without local mirroring.

## ADDED Requirements

### Requirement: Card grid with local filtering

The app SHALL provide a browseable grid of all cards in the snapshot, showing at minimum name, card type, set, and printing rarity for each entry. It SHALL support filtering by card type, rarity, and set, and free-text search over card names and text, entirely client-side.

#### Scenario: Default grid view

- **WHEN** the grid page opens with no filters applied
- **THEN** it lists every card in the snapshot without any network request to the OpenRift API

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

# site-navigation Specification

## Purpose

Owns the app-wide top navigation shell: what it contains for system behavior purposes and how it behaves while the page scrolls, independent of any single feature page.

## Requirements

### Requirement: Main navigation stays fixed on scroll

The app's header navigation SHALL stay fixed in place while the page scrolls, on every page of the app, with page content laid out so the fixed bar does not permanently cover or hide content underneath it.

#### Scenario: Long page keeps the nav visible

- **WHEN** a user scrolls down any page with content taller than the screen
- **THEN** the header navigation remains visible at the top, and its links stay usable without scrolling back up

#### Scenario: Content is not hidden under the bar

- **WHEN** any page loads or the user scrolls to its top
- **THEN** the topmost content of the page sits below the fixed navigation and nothing becomes permanently unreachable beneath it

### Requirement: Navigation links sit at the left of the header on every page

The header navigation SHALL present the brand followed by the navigation links, aligned to the left edge of the header, on every page of the app. The header SHALL span the full window width on every page, as it does on the deck manager.

#### Scenario: Links beside the brand on any page

- **WHEN** a user opens any page (card grid, card detail, deck library, deck manager) on a desktop-width screen
- **THEN** the navigation links appear immediately after the brand at the left of the header, not centered or pushed to the right

### Requirement: Navigation centers on phone-width screens

On phone-width screens the header navigation SHALL center its content horizontally, on every page, with all links remaining visible and usable without horizontal scrolling.

#### Scenario: Phone-width header

- **WHEN** any page is opened on a phone-width screen (narrower than 640px)
- **THEN** the brand and navigation links are centered in the header and every link is reachable without horizontal scrolling

### Requirement: Navigation entries and order

The navigation SHALL offer exactly these destinations, in this order: Decks, Browse cards. The entry for the current page SHALL keep its current-page indication. There SHALL be no Sets entry.

#### Scenario: Order of entries

- **WHEN** a user looks at the navigation on any page
- **THEN** the links read, left to right, Decks then Browse cards, and no other destinations are listed

#### Scenario: Current page indication

- **WHEN** the user is on the deck library, deck manager, or card grid
- **THEN** the corresponding entry is marked as the current page

### Requirement: One identical header on every page

The app SHALL render the same header, including its branch decoration, on every page. No page SHALL add, hide or vary decorative pieces of the header, and no decoration SHALL cross or hang over the header's bottom branch.

#### Scenario: Card browser matches the deck editor

- **WHEN** a user compares the header of the card browser with that of the deck editor
- **THEN** the header looks identical, and no vertical branch crosses the header's bottom border on either

#### Scenario: Every page, same header

- **WHEN** a user visits the card browser, a card page, the deck library and the deck editor
- **THEN** each shows the same header with the same bottom branch and sprigs

#### Scenario: Phone width

- **WHEN** the window is phone-width on any page
- **THEN** the header still matches across pages, with the sprigs scaled or hidden the same way everywhere

### Requirement: Header brand is named BandleBox
The header brand SHALL display the name "BandleBox" on every page, at every screen width, and SHALL link home. The browser tab title of every page SHALL identify the app as BandleBox.

#### Scenario: Brand text on desktop and phone
- **WHEN** any page is opened at desktop or phone width
- **THEN** the header brand reads "BandleBox" and no "Riftbound" or "Deck Manager" wordmark text appears in it

#### Scenario: Home link and tab title
- **WHEN** a user activates the brand, or looks at the browser tab of any page
- **THEN** the brand leads to the home page, and the tab title ends with or equals "BandleBox"

### Requirement: Current page is lamplit
The navigation entry for the current page SHALL be lamplit: its label in the app's lantern-gold token, and a warm pool of the same gold light sitting on the stretch of the header's branch below it, as if a lantern hung there. The light SHALL fall on the branch, with a blurred foot that fades out through the branch, and SHALL NOT extend below the branch. It SHALL add no icon, rule or other element beside the label, so marking a page never moves a label. Entries that are not current SHALL be unlit, their labels a step quieter than the lit one; hovering one MAY preview a faint light.

#### Scenario: Light on the active entry only
- **WHEN** the user is on the deck library, deck manager, or card grid
- **THEN** only the corresponding entry's label is gold and only the branch under it is lit

#### Scenario: Labels hold still
- **WHEN** the user moves between Decks and Browse cards
- **THEN** no nav label changes position; only the light moves, fading between the entries (and switching without a fade under a reduced-motion preference)

## ADDED Requirements

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

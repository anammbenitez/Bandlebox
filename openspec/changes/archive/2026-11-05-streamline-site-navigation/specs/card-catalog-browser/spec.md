## ADDED Requirements

### Requirement: Browse cards page description

The card grid page SHALL present the short description "Catalog of all the cards in the game." beneath its title, replacing any longer explanatory text.

#### Scenario: Reading the page intro

- **WHEN** the Browse cards page opens
- **THEN** its title is followed by exactly that description

## MODIFIED Requirements

### Requirement: Browsing is offline after a refresh

The app SHALL serve all card content from the local snapshot when browsing. A network connection MUST NOT be required to render card data or filtering — only card art retrieval contacts OpenRift.

#### Scenario: Offline browsing

- **WHEN** the app is opened offline after a completed refresh
- **THEN** all card data, detail pages, and filtering work; only card images may fail to load

## REMOVED Requirements

### Requirement: Set index and set pages

**Reason**: The dedicated Sets pages duplicate what the card grid's set filter and the set labels on card detail pages already provide, and the user asked for the Sets page to be deleted.

**Migration**: Browse a set's cards with the set filter on the card grid. `/sets` and `/sets/{slug}` no longer exist.

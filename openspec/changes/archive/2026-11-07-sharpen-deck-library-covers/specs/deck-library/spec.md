# Spec Delta

## MODIFIED Requirements

### Requirement: Deck list is a tile grid with Legend covers

The Decks page SHALL present saved decks as a square-tile grid where each tile's front image is the art of that deck's chosen Legend, drawn from a larger image variant than the small picker thumbnails so it stays sharp at tile size, and SHALL reserve a deck-sized tile with a plus affordance for creating a deck, so the page reads as a game deck-collection screen.

#### Scenario: Legend art fronts the tile

- **WHEN** a deck has a Legend chosen and the Decks page renders
- **THEN** that Legend's card art is the tile's cover image

#### Scenario: Cover art is sharper than picker thumbnails

- **WHEN** a deck tile's cover image loads with image connectivity
- **THEN** it is the mid-size OpenRift variant (`400w`), while the Legend picker's thumbnails in the creation modal keep the small variant

#### Scenario: Cover art degrades gracefully

- **WHEN** a tile's mid-size cover image fails to load
- **THEN** the small variant is tried next, and if that also fails the cover shows no broken-image icon and the tile, badge and name remain usable

#### Scenario: Plus tile sits in the grid

- **WHEN** the deck grid renders
- **THEN** a create tile of the same size as deck tiles is present among them with a plus affordance

#### Scenario: Deck without legend yet covers with placeholder

- **WHEN** a deck has no Legend chosen
- **THEN** its tile shows a recognizable no-legend placeholder instead of artwork

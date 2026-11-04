# Spec Delta

## ADDED Requirements

### Requirement: Deck list is a tile grid with Legend covers
The Decks page SHALL present saved decks as a square-tile grid where each tile's front image is the art of that deck's chosen Legend, and SHALL reserve a deck-sized tile with a plus affordance for creating a deck, so the page reads as a game deck-collection screen.

#### Scenario: Legend art fronts the tile
- **WHEN** a deck has a Legend chosen and the Decks page renders
- **THEN** that Legend's card art is the tile's cover image

#### Scenario: Plus tile sits in the grid
- **WHEN** the deck grid renders
- **THEN** a create tile of the same size as deck tiles is present among them with a plus affordance

#### Scenario: Deck without legend yet covers with placeholder
- **WHEN** a deck has no Legend chosen
- **THEN** its tile shows a recognizable no-legend placeholder instead of artwork

### Requirement: Deck list shows live legality badges
Each saved-deck tile SHALL show a legality badge (legal or not legal) computed at visit time with the same constructed-rules checker the deck manager uses, without opening the deck.

#### Scenario: Badge agrees with the checklist
- **WHEN** a stored deck's tile renders on the Decks page
- **THEN** the badge shows the same legal/not-legal verdict the deck manager's checklist would produce for that deck

## MODIFIED Requirements

### Requirement: Deck list management
The system SHALL let users create a deck through a creation modal that asks for the Legend to play and the deck's name (both required), rename it, delete it, and open it from a grid of saved decks, with a deletion confirmation before a deck is removed. Cancel discards the creation; accepting creates the deck with the chosen Legend pre-seeded and opens the deck manager.

#### Scenario: Create and open a deck
- **WHEN** a user opens the create modal, chooses a Legend, enters a name, and accepts
- **THEN** the deck appears in the grid and opens in the deck manager with that Legend already in its Legend zone

#### Scenario: Cancel discards the creation
- **WHEN** a user cancels the creation modal
- **THEN** no deck is created and the page state is unchanged

#### Scenario: Creation requires both inputs
- **WHEN** a user tries to accept the modal without a chosen Legend or without a name
- **THEN** acceptance is not possible until both are provided

#### Scenario: Delete asks first
- **WHEN** a user deletes a deck
- **THEN** the system shows a confirmation and only removes the deck after the user confirms

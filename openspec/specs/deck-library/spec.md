# deck-library Specification

## Purpose

Owns where decks come from, where they live, and how they move: deck existence and identity, the saved-deck list, automatic client-side persistence, and sharing a deck as a URL.

## Requirements

### Requirement: Decks persist across visits

The system SHALL store all decks in browser-local storage and SHALL re-save the stored data after every deck modification, so that decks survive a reload or a later visit without any explicit save action.

#### Scenario: Deck survives a reload

- **WHEN** a user edits a deck and reloads the page
- **THEN** the deck is present with every edit intact, without pressing save

#### Scenario: Catalog data is irrelevant to persistence

- **WHEN** the OpenRift data files are refreshed or unavailable
- **THEN** stored decks keep their cards and quantities, whatever the new snapshot says about them

### Requirement: Decks remember their champion pick

A deck SHALL record which champion-unit card fills its Champion zone as part of the deck's state, persisting across reloads and re-saves like any deck modification. Older stored decks from before this field SHALL open unchanged with an empty Champion zone, and a stored pick that no longer exists in the local snapshot keeps the deck openable with its cards intact.

#### Scenario: Champion pick survives a reload

- **WHEN** a user places a champion in the zone, edits other cards, and later reopens the deck
- **THEN** the Champion zone shows the same champion

#### Scenario: Legacy decks open unchanged

- **WHEN** a deck stored before the Champion zone existed is opened
- **THEN** it opens with an empty Champion zone and all cards and quantities intact, without a migration step

#### Scenario: Stale champion pick keeps the deck open

- **WHEN** a stored deck's champion pick references a card missing from the local snapshot
- **THEN** the deck still opens with its cards and the zone reports no valid champion rather than failing the load

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

### Requirement: Deck list shows live legality badges

Each saved-deck tile SHALL show a legality badge (legal or not legal) computed at visit time with the same constructed-rules checker the deck manager uses, without opening the deck.

#### Scenario: Badge agrees with the checklist

- **WHEN** a stored deck's tile renders on the Decks page
- **THEN** the badge shows the same legal/not-legal verdict the deck manager's checklist would produce for that deck

### Requirement: Stable deck identity

The system SHALL give each deck an identity that is stable across reloads, storage re-saves, and share URLs, so links and edits never attach to the wrong deck.

#### Scenario: Editing preserves identity

- **WHEN** a saved deck is renamed and edited and then reopened later
- **THEN** it is the same deck: same identity, updated name, updated cards

### Requirement: Share a deck as a URL

The system SHALL encode a complete deck — name, cards, quantities, section placement, and the Champion zone's pick — into a URL fragment, such that opening that URL anywhere the site is deployed reconstructs the same deck.

#### Scenario: Opening a shared link

- **WHEN** a user opens a deck-share URL (someone else's link)
- **THEN** the full deck renders, section by section, without any server and independent of the opener's stored decks

#### Scenario: Shared deck with unknown card

- **WHEN** a shared URL references a card that no longer exists in the local snapshot
- **THEN** the rest of the deck still loads, and the deck is reported as affected (not silently broken)

#### Scenario: Shared champion reconstructs the zone

- **WHEN** a shared link carries the deck's champion pick and the opener's snapshot knows the card
- **THEN** the reopened deck shows that champion in the zone with its copies counted as main-deck copies exactly as the sharer's deck did

### Requirement: Saving a viewed shared deck

The system SHALL let a user who opened a shared deck add it to their own deck list as a distinct deck, after which it behaves exactly like any locally created deck.

#### Scenario: Save shared deck into library

- **WHEN** a user opens a shared link and chooses to save the deck
- **THEN** a new deck appears in their deck list and opens for editing, and their own storage changes do not affect the sharer's link

### Requirement: Graceful behavior without storage

The system SHALL remain usable for building when browser storage is unavailable or full, with decks kept in memory and the user warned once that persistence is not working.

#### Scenario: Storage unavailable

- **WHEN** localStorage access fails on the deck system
- **THEN** deck building still works in the current visit and the user is told decks will not persist after leaving

### Requirement: No unsaved-changes ambiguity

The system SHALL keep stored state in step with what is on screen: either decks save automatically as they change, or the interface shows an explicit unsaved indicator — never a silent divergence.

#### Scenario: Screen matches storage

- **WHEN** a user closes and reopens the deck manager mid-session
- **THEN** the deck shown equals the last thing they saw, with no state lost to a missed save button

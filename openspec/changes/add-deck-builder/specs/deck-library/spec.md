# Spec Delta

## Purpose

Owns where decks come from, where they live, and how they move: deck existence and identity, the saved-deck list, automatic client-side persistence, and sharing a deck as a URL.

## ADDED Requirements

### Requirement: Decks persist across visits
The system SHALL store all decks in browser-local storage and SHALL re-save the stored data after every deck modification, so that decks survive a reload or a later visit without any explicit save action.

#### Scenario: Deck survives a reload
- **WHEN** a user edits a deck and reloads the page
- **THEN** the deck is present with every edit intact, without pressing save

#### Scenario: Catalog data is irrelevant to persistence
- **WHEN** the OpenRift data files are refreshed or unavailable
- **THEN** stored decks keep their cards and quantities, whatever the new snapshot says about them

### Requirement: Deck list management
The system SHALL let users create a named deck, rename it, delete it, and open it from a list of saved decks, with a deletion confirmation before a deck is removed.

#### Scenario: Create and open a deck
- **WHEN** a user enters a name on the Decks page and confirms creation
- **THEN** the deck appears in the list and opens in the deck manager ready for card additions

#### Scenario: Delete asks first
- **WHEN** a user deletes a deck
- **THEN** the system shows a confirmation and only removes the deck after the user confirms

### Requirement: Stable deck identity
The system SHALL give each deck an identity that is stable across reloads, storage re-saves, and share URLs, so links and edits never attach to the wrong deck.

#### Scenario: Editing preserves identity
- **WHEN** a saved deck is renamed and edited and then reopened later
- **THEN** it is the same deck: same identity, updated name, updated cards

### Requirement: Share a deck as a URL
The system SHALL encode a complete deck — name, cards, quantities, section placement — into a URL fragment, such that opening that URL anywhere the site is deployed reconstructs the same deck.

#### Scenario: Opening a shared link
- **WHEN** a user opens a deck-share URL (someone else's link)
- **THEN** the full deck renders, section by section, without any server and independent of the opener's stored decks

#### Scenario: Shared deck with unknown card
- **WHEN** a shared URL references a card that no longer exists in the local snapshot
- **THEN** the rest of the deck still loads, and the deck is reported as affected (not silently broken)

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

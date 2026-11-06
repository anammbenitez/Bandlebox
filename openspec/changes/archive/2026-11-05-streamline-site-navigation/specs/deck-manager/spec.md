## ADDED Requirements

### Requirement: Decks page description

The deck library page SHALL present the description "Decks live in this browser locally and save themselves as you build, be creative!" beneath its title.

#### Scenario: Reading the page intro

- **WHEN** the deck library opens
- **THEN** its title is followed by exactly that description

## MODIFIED Requirements

### Requirement: Decks reachable from world navigation

The site's persistent navigation SHALL expose a Decks entry as its first destination, followed by Browse cards, serving as the home for the deck list and deck manager entry points.

#### Scenario: Navigating to the deck system

- **WHEN** a user follows the Decks navigation entry from a card page
- **THEN** they reach the list of their saved decks and can create or open a deck from there

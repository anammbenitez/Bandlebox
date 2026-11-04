# Spec Delta

## Purpose

Owns the deck-building experience: the deck manager page and its deck sections, the embedded card browser, and how cards move from browser into deck.

## ADDED Requirements

### Requirement: Deck manager organizes cards into deck sections
The deck manager SHALL present every deck as five clearly separated sections — Legend, Main deck, Rune deck, Battlefields, Side deck — each showing its required size (or limit) and the current card count for that section.

#### Scenario: Fresh deck shows the empty skeleton
- **WHEN** a user opens a newly created deck
- **THEN** all five sections are visible with their target counts (Legend 1, Main 40, Rune 12, Battlefields 3, Side at its limit) showing zero cards

### Requirement: Deck sections accept only cards of the right card type
The system SHALL restrict what each section accepts by card type: Legend sections to legends, Rune deck to rune cards, Battlefields to battlefield cards, and the Main deck and Side deck to main-deck-legal types (units, spells, gear).

#### Scenario: A rune cannot enter the main deck
- **WHEN** a user adds a rune card while working on the main deck
- **THEN** the rune is placed in (or offered to) the rune deck, not silently added to the main deck

### Requirement: Embedded card browser for card selection
The deck manager SHALL include a card browser over the full local snapshot with name/text search and type, rarity, and set filters, presenting cards in a paged or windowed grid so the whole catalog remains answerable without loading every card at once.

#### Scenario: Find and inspect a candidate card
- **WHEN** a user searches by partial card name and scrolls the results
- **THEN** matching cards render progressively with art, and a card's detail page remains reachable from it

### Requirement: Browser narrows to the section being filled
The system SHALL scope the browser to the section currently being edited, so the working browser view already matches that section's allowed card types and cannot add a card to a section it does not fit.

#### Scenario: Switching section retargets the browser
- **WHEN** the user focuses the rune deck section
- **THEN** the browser filters show rune cards by default, and a card added from this view enters the rune deck

### Requirement: Adding and removing copies
The system SHALL let users add a card as one or more copies, and adjust or remove copies of any card already in a deck section, with each section's current copy counts always visible inline.

#### Scenario: Counting up and down
- **WHEN** a card is added and then has copies increased and decreased
- **THEN** the section count and per-card copy count update immediately, down to zero, where removal removes the row

### Requirement: Cards already in the deck are visible in the browser
The system SHALL show, on each browsed card, how many copies the current deck already runs, so an out-of-copies card is recognizable before adding.

#### Scenario: Maxed card marked in browser
- **WHEN** three copies of a card are already in the deck
- **THEN** its browser entry shows that count and it cannot silently receive a further copy beyond the enforced copy limit

### Requirement: Deck state is immediately reflected
Any change made in the deck manager SHALL appear in both the deck sections and the legality checklist without a manual refresh or save step.

#### Scenario: One change, whole screen agrees
- **WHEN** a user adds a card to the main deck
- **THEN** the main deck count, the card's inline count, legality status, and the deck's share state all reflect the addition at once

### Requirement: Share deck as link
The deck manager SHALL offer a share action that produces a complete-deck URL and makes it available for copying (for example, to the clipboard).

#### Scenario: Copying a share link for a friend
- **WHEN** a user triggers the share action on a partially built deck
- **THEN** they have a URL that, opened elsewhere, recreates that same partial deck

### Requirement: Decks reachable from world navigation
The site's persistent navigation SHALL expose a Decks entry alongside the existing Cards and Sets destinations, serving as the home for the deck list and deck manager entry points.

#### Scenario: Navigating to the deck system
- **WHEN** a user follows the Decks navigation entry from a card or set page
- **THEN** they reach the list of their saved decks and can create or open a deck from there

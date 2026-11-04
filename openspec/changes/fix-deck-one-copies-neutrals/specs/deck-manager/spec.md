# Spec Delta

## ADDED Requirements

### Requirement: Neutral-domain cards are always legal and always searchable
The legality checker and the Domain filter SHALL treat a card whose Domain set contains the neutral domain (a generic-domain card, e.g. Neeko) as legal in every deck and visible under any Domain filter selection, so such cards remain present in the default browsing and in search no matter which domains are preselected or chosen; never coloring them a domain-identity failure.

#### Scenario: Neeko is findable by name
- **WHEN** a user searches for "Neeko" in any deck's card browser, whatever the Legend or the Domain chips
- **THEN** Neeko appears in the results

#### Scenario: Neutral card passes domain identity
- **WHEN** a neutral-domain card sits in any section of a deck whose Legend's colors do not include it
- **THEN** the domain rule passes it and never lists it among off-color failures

## MODIFIED Requirements

### Requirement: Deck sections accept only cards of the right card type
The system SHALL restrict what each section accepts by card type — Legend sections to legends, Rune deck to rune cards, Battlefields to battlefield cards, and the Main deck and Side deck to main-deck-legal types (units, spells, gear) — and SHALL cap the Legend section at one copy of its card and each battlefield at one copy, enforced on every mutation path (add buttons, copy chips, drags, and the section copy controls alike).

#### Scenario: A rune cannot enter the main deck
- **WHEN** a user adds a rune card while working on the main deck
- **THEN** the rune is placed in (or offered to) the rune deck, not silently added to the main deck

#### Scenario: Copy controls refuse a doubled battlefield
- **WHEN** a battlefield row's "+" control is pressed while that battlefield is already in the deck
- **THEN** no second copy is added and the refusal is visible

#### Scenario: The copy cap survives every path
- **WHEN** any addition path (add button, chip, drag, section row) is used on a legend already placed, or on a battlefield already placed
- **THEN** the section still holds exactly one copy of that card

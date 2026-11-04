# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

# Spec Delta

## ADDED Requirements

### Requirement: Neutral-domain cards are always legal
The legality checker SHALL treat a card whose Domain set contains the neutral domain as legal in every deck: the domain rule never fails such a card, whatever the Legend's colors, and neutral cards keep full multi-copy behavior like any other main-deck card.

#### Scenario: Neeko in an off-color deck
- **WHEN** Neeko, Blending In (a neutral-domain champion) sits in the main deck of a Legend led by other colors
- **THEN** the domain rule passes it and the failures list never contains it

#### Scenario: Missing domain data still fails
- **WHEN** a card has no domain entries at all (snapshot data loss)
- **THEN** the domain rule still fails it explicitly — only a present neutral domain widens legality, not a missing one

## MODIFIED Requirements

### Requirement: Structural completion rules
The checker SHALL enforce exact section sizes: exactly 1 legend, exactly 40 cards in the main deck, exactly 12 rune cards, exactly 3 battlefields that are all distinct, and a side deck of at most the side-deck limit. It SHALL count those sizes by copies (not by distinct rows), and SHALL fail any legend slot holding more than one copy of its card or any battlefield slot holding more than one copy of its card.

#### Scenario: Not exactly 40 in the main deck
- **WHEN** the main deck holds 39 or 41 cards
- **THEN** the main-deck rule fails showing current and required counts, and the deck is not legal

#### Scenario: Duplicate battlefields
- **WHEN** a user selects the same battlefield more than once
- **THEN** the battlefield rule fails (distinctness), and the deck is not legal until all three are distinct

#### Scenario: Doubled legend slot
- **WHEN** the legend slot carries two copies of one legend card
- **THEN** the legend rule fails (copies counted), and the deck is not legal

#### Scenario: Doubled battlefield slot
- **WHEN** a battlefield slot carries two copies of the same battlefield
- **THEN** the battlefield rule fails (copied AND non-distinct), and the deck is not legal

### Requirement: Domain identity rule
The checker SHALL enforce that every card's Domain colors are contained in the Legend's Domain identity — applying to the main deck, side deck, and rune deck alike — except that a card whose Domain set contains the neutral domain is always legal; until a Legend is chosen, the rule SHALL report as pending-on-Legend rather than failing every card.

#### Scenario: Off-color card named
- **WHEN** a deck includes a card whose Domain is outside the chosen Legend's identity
- **THEN** the domain rule fails and lists each offending card

#### Scenario: No legend yet
- **WHEN** the deck has cards but no Legend
- **THEN** domain checks wait rather than all failing, and the checklist names the missing Legend as what is pending

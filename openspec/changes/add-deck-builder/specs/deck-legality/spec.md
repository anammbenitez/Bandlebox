# Spec Delta

## Purpose

Owns judging a deck against Riftbound constructed deckbuilding rules, live during building, using only what the local OpenRift snapshot provides — so legal decks on the builder mean legal decks at the table.

## ADDED Requirements

### Requirement: Legality checklist is live and always visible
The deck manager SHALL display a legality checklist that SHIFTS status after every deck modification, with pass/fail per rule and no manual re-check needed.

#### Scenario: Breaking and fixing a rule updates in place
- **WHEN** a user adds a card that overfills a section, then removes a copy
- **THEN** the affected rule flips to failing and then back to passing across the edits, while the user stays on the page

### Requirement: Structural completion rules
The checker SHALL enforce exact section sizes: exactly 1 legend, exactly 40 cards in the main deck, exactly 12 rune cards, exactly 3 battlefields that are all distinct, and a side deck of at most the side-deck limit.

#### Scenario: Not exactly 40 in the main deck
- **WHEN** the main deck holds 39 or 41 cards
- **THEN** the main-deck rule fails showing current and required counts, and the deck is not legal

#### Scenario: Duplicate battlefields
- **WHEN** a user selects the same battlefield more than once
- **THEN** the battlefield rule fails (distinctness), and the deck is not legal until all three are distinct

### Requirement: Copy limit per card name
The checker SHALL enforce at most 3 copies of any card name within the main deck and the side deck, and SHALL honor snapshot copy-limit overrides (a card with a lower limit cannot reach 3, and a limit-0 card may not belong in a deck at all). The rune deck SHALL NOT be capped per name by this rule: its copy layout is governed by the exactly-12 rune rule and the Legend's two rune colors (any ratio is legal).

#### Scenario: Fourth copy rejected
- **WHEN** a user adds a fourth copy of a card to the main deck
- **THEN** the copy-limit rule fails naming that card, and the deck is not legal

#### Scenario: Snapshot override tightens a limit
- **WHEN** a card whose snapshot limit is 0 or otherwise below 3 is added in excess of that limit
- **THEN** the copy-limit rule fails naming that card and the effective lowered limit

#### Scenario: Rune ratio is uncapped
- **WHEN** a rune deck contains twelve copies of one rune card (an accepted ratio)
- **THEN** the copy-limit rule passes it, pending only the exactly-12 rune-deck count

### Requirement: Domain identity rule
The checker SHALL enforce that every card's Domain colors are contained in the Legend's Domain identity, applying to the main deck, side deck, and rune deck alike; until a Legend is chosen, the rule SHALL report as pending-on-Legend rather than failing every card.

#### Scenario: Off-color card named
- **WHEN** a deck includes a card whose Domain is outside the chosen Legend's identity
- **THEN** the domain rule fails and lists each offending card

#### Scenario: No legend yet
- **WHEN** the deck has cards but no Legend
- **THEN** domain checks wait rather than all failing, and the checklist names the missing Legend as what is pending

### Requirement: Champion unit requirement
The checker SHALL require the deck to contain at least one main-deck unit whose champion tag matches the chosen Legend's champion tag, and SHALL exclude cards with the Legend's tag that are not units (signatures, the legend itself) from satisfying this.

#### Scenario: Tag-matching unit present
- **WHEN** a unit sharing the Legend's champion tag is added to the main deck
- **THEN** the champion rule passes

#### Scenario: Signatures do not count as champions
- **WHEN** a signature spell sharing the Legend's tag is present but no matching unit is
- **THEN** the champion rule still fails

### Requirement: Signature card limit
The checker SHALL cap the total copies of tagged cards that are not units and not the legend (signature cards) sharing a single champion tag inside one deck at 3.

#### Scenario: Fourth signature across names
- **WHEN** a deck runs three copies of one signature and a copy of a second signature with the same champion tag
- **THEN** the signature rule fails naming the tag and the cards involved

### Requirement: Constructed bans
The checker SHALL flag any card in any section that the snapshot records as banned in the Constructed format, with nothing in the deck exempt from this rule.

#### Scenario: Banned card named in the failure
- **WHEN** a currently banned card is added
- **THEN** the ban rule fails, naming the card and indicating its Constructed ban

### Requirement: Overall deck verdict is gated
The system SHALL report a deck as legal only when every checklist rule passes, and SHALL keep the deck under a not-legal verdict otherwise.

#### Scenario: Legal only when everything passes
- **WHEN** one rule still fails while all others pass
- **THEN** the deck's overall status is not legal, even though it is close

### Requirement: Unknown snapshot data is not a silent pass
The checker SHALL treat cards it cannot classify from the local snapshot (missing domains, unknown tags) as failing their affected rule with the reason stated, never as automatically legal.

#### Scenario: Partial snapshot
- **WHEN** a card lacks domain data in the snapshot and is added
- **THEN** the domain rule fails for that card with an explicit unclassifiable reason rather than passing it silently

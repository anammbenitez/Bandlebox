# Spec Delta

## ADDED Requirements

### Requirement: Card detail page renders card text as formatted content

The card detail page SHALL render the selected printing's printed rules text, effect text, flavor text, and any errata text as formatted content, not raw catalog markup. The page's keyword summary SHALL use the same keyword labels as the text, and its Energy, Might, and Power figures SHALL use the same symbol treatment, so a reader sees one visual language for the card.

#### Scenario: Opening a card with markup

- **WHEN** a card whose printed text contains keyword terms, reminder text, and symbols is opened
- **THEN** the page shows colored keyword labels, glyphs for game symbols, and italic reminder text, and no `[ ]`, `_( )_`, or `:rb_*:` syntax is visible anywhere in the card text

#### Scenario: Keyword summary agrees with the text

- **WHEN** a card lists keywords in its summary row
- **THEN** those keywords appear with the same label styling used for the same keywords inside the card text

#### Scenario: Stats use the card's symbols

- **WHEN** the card has Energy, Might, or Power values
- **THEN** each figure is presented with the same symbol or numbered indicator used for that concept in the card text

#### Scenario: Errata uses the same rendering

- **WHEN** a card has errata with corrected rules or effect text
- **THEN** the corrected text is rendered the same way as the printed text

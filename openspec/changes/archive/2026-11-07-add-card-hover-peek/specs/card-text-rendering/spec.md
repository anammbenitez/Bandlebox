# Spec Delta

## ADDED Requirements

### Requirement: Card text reads the same on every surface that shows it

Wherever the app shows a card's rules or effect text (the card detail page and the deck manager's card peek), it SHALL use the same renderer, so keyword labels, game glyphs, energy indicators, italics and line breaks look identical on each surface and follow the same fallbacks for unknown markup or missing glyph art.

#### Scenario: Same card, two surfaces

- **WHEN** a card whose text contains a keyword, a glyph and reminder text is shown in the peek and on its detail page
- **THEN** the keyword label color, the glyph and the italic reminder look the same in both

#### Scenario: Unknown markup in the peek

- **WHEN** the peek shows text containing markup the renderer does not know
- **THEN** that portion appears as readable plain text, as on the detail page, and the rest of the peek is unaffected

#### Scenario: Missing glyph in the peek

- **WHEN** a glyph's artwork cannot load inside the peek
- **THEN** the surrounding text stays intact and readable, with no broken-image marker

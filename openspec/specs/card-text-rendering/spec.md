# card-text-rendering Specification

## Purpose

Turns the catalog's card-text markup into faithful, readable, accessible HTML: keyword labels, inline game symbols, italic reminder text, line breaks, and the pointed shapes that chain a card's abilities.

## Requirements

### Requirement: Card text markup is rendered as formatted content

The system SHALL render card text markup as readable content rather than raw syntax. Square-bracket terms SHALL appear as keyword labels without brackets, underscore-wrapped runs SHALL appear as italic text without underscores, parenthetical reminder text SHALL appear in italics, and newlines SHALL produce visible line breaks.

#### Scenario: Keyword and reminder text

- **WHEN** text containing `[Reaction] _(Play any time, even before spells and abilities resolve.)_` is rendered
- **THEN** the page shows the label "Reaction" followed by the reminder in italics, with no square brackets, underscores, or literal markup characters

#### Scenario: Multi-line card text

- **WHEN** a printing's text contains newline characters
- **THEN** the rendered text breaks at those points instead of running them together as one line

#### Scenario: Unrecognised markup

- **WHEN** text contains brackets or glyph names the renderer does not know
- **THEN** the text still renders, and the unknown portion appears as readable plain text rather than disappearing or breaking the page

### Requirement: Keyword labels carry their card colors

Each recognized keyword SHALL render as a label styled with that keyword's official color from the card game's keyword palette. A numbered variant SHALL use the color of its base keyword. A keyword without a palette entry MUST fall back to a neutral label style.

#### Scenario: Base and numbered keywords

- **WHEN** a card shows `[Reaction]` and another shows `[Assault 3]`
- **THEN** "Reaction" and "Assault 3" each appear as a colored label, and "Assault 3" uses the same color as the base keyword "Assault"

#### Scenario: Unknown keyword

- **WHEN** a keyword has no entry in the palette
- **THEN** it still renders as a legible label in the neutral style, and the rest of the text is unaffected

### Requirement: Game symbols render as glyphs

The system SHALL replace symbol markup with the corresponding game artwork: `:rb_might:` and `:rb_exhaust:` as their glyphs, `:rb_rune_*:` rune forms as their rune glyphs, and `:rb_energy_N:` as a circular energy indicator showing N. Symbols inside a keyword label SHALL render as glyphs inside that label.

#### Scenario: Symbols inside rules text

- **WHEN** text reads `Give a friendly unit +3 :rb_might: this turn.`
- **THEN** the symbol appears as the might glyph, sized and aligned with the surrounding text, instead of the literal token

#### Scenario: Cost with energy

- **WHEN** a card reads `:rb_exhaust:: [Add] :rb_energy_2:`
- **THEN** the exhaust glyph, the "Add" keyword label, and a circular indicator reading "2" are shown in that order

#### Scenario: Symbol inside a keyword label

- **WHEN** a keyword reads `[Empower :rb_energy_2: :rb_rune_rainbow:]`
- **THEN** the label contains the rainbow rune glyph alongside the word "Empower"

### Requirement: Ability chain markers shape their neighbouring labels

The renderer SHALL treat `[>]` and `[>>]` as shape markers, never as visible labels. A marker placed after a keyword SHALL give that label a pointed right edge; a marker placed before a keyword SHALL give that label a pointed left edge.

#### Scenario: Chained abilities

- **WHEN** text reads `[Empowered][>][>>][Deathknell][>]`
- **THEN** "Empowered" gains a right-pointing edge, "Deathknell" gains a left-pointing edge and a right-pointing edge, and no label reading ">" or ">>" appears

### Requirement: Rendered card text is static and accessible

Rendered card text SHALL require no client-side JavaScript. Glyphs and energy indicators SHALL expose a readable text name to assistive technology, and keyword labels SHALL expose their keyword as text, so a screen reader hears "Reaction", "might", or "2 energy" rather than an image or an empty element.

#### Scenario: Reading with scripts disabled

- **WHEN** a card detail page is opened with JavaScript disabled
- **THEN** the formatted card text is fully present and readable

#### Scenario: Assistive technology

- **WHEN** a screen reader reads a rendered rules line containing glyphs and labels
- **THEN** it announces the keyword names and the symbols' meanings as text, not as unlabeled images

### Requirement: Missing glyph artwork degrades without breaking text

When a glyph asset cannot be loaded, the system SHALL keep the surrounding text intact and readable, and MUST NOT leave empty space, a broken-image marker, or a failed page.

#### Scenario: Glyph unavailable

- **WHEN** a glyph file is missing or fails to load
- **THEN** the text around it still reads correctly and the page renders normally

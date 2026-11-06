# Spec Delta

## ADDED Requirements

### Requirement: One identical header on every page

The app SHALL render the same header, including its branch decoration, on every page. No page SHALL add, hide or vary decorative pieces of the header, and no decoration SHALL cross or hang over the header's bottom branch.

#### Scenario: Card browser matches the deck editor
- **WHEN** a user compares the header of the card browser with that of the deck editor
- **THEN** the header looks identical, and no vertical branch crosses the header's bottom border on either

#### Scenario: Every page, same header
- **WHEN** a user visits the card browser, a card page, the deck library and the deck editor
- **THEN** each shows the same header with the same bottom branch and sprigs

#### Scenario: Phone width
- **WHEN** the window is phone-width on any page
- **THEN** the header still matches across pages, with the sprigs scaled or hidden the same way everywhere

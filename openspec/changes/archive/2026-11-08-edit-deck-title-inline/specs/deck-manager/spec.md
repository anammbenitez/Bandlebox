# Spec Delta

## ADDED Requirements

### Requirement: Deck title is edited in place

On the deck editor, the deck's title SHALL be editable where it is shown: a user can click it and type, and the new name is saved when they press Enter or when focus leaves the title. Pressing Escape SHALL discard the edit and restore the previous name. The "Rename" button SHALL remain and SHALL move focus into the title with its text selected, rather than opening a separate prompt.

#### Scenario: Enter saves

- **WHEN** a user clicks the deck title, types a new name and presses Enter
- **THEN** the deck is saved under the new name, the title shows it, and reopening the deck from the library shows the same name

#### Scenario: Clicking elsewhere saves

- **WHEN** a user edits the title and then clicks anywhere else on the page
- **THEN** the new name is saved exactly as if Enter had been pressed

#### Scenario: Escape cancels

- **WHEN** a user edits the title and presses Escape
- **THEN** the title returns to the name it had before the edit began and nothing is saved

#### Scenario: Rename button opens the same editing state

- **WHEN** a user presses the "Rename" button
- **THEN** no dialog opens, the title takes focus with its whole text selected, and typing replaces the name

#### Scenario: Keyboard users reach the title

- **WHEN** a keyboard user tabs through the deck bar
- **THEN** the title is a focus stop that is announced as the deck name and is editable

### Requirement: Deck names stay valid when renamed

A rename SHALL never leave a deck without a name: an empty or whitespace-only name SHALL NOT be saved and the previous name SHALL return. Surrounding whitespace SHALL be trimmed, and a name SHALL be at most 80 characters, the same limit as the deck creation modal. A name that did not change SHALL NOT be saved again.

#### Scenario: Empty name reverts

- **WHEN** a user clears the title and presses Enter or clicks elsewhere
- **THEN** the title shows the previous name and the deck keeps it

#### Scenario: Name is trimmed

- **WHEN** a user saves the name "  Poro Swarm  "
- **THEN** the deck is named "Poro Swarm"

#### Scenario: Long names are capped

- **WHEN** a user types more than 80 characters into the title
- **THEN** the title accepts no more than 80 characters

#### Scenario: Unchanged name is not saved

- **WHEN** a user focuses the title and leaves it without changing the text
- **THEN** the deck is not saved again and its last-updated time does not change

### Requirement: Editable title is recognisable

The deck editor SHALL make it apparent that the title can be edited. On hover the title SHALL show a text cursor and a subtle highlight; while it is being edited it SHALL show the interface's focus treatment, and the deck bar's meta line SHALL read that Enter saves and Escape cancels. These cues SHALL NOT add height to the deck bar.

#### Scenario: Hover signals an editable title

- **WHEN** a pointer rests over the title of an editable deck
- **THEN** the cursor becomes a text cursor and the title is highlighted

#### Scenario: Editing explains how to finish

- **WHEN** the title has focus for editing
- **THEN** it shows the focus ring and the meta line reads "Enter to save · Esc to cancel"

#### Scenario: Cues add no height

- **WHEN** a user hovers, focuses and leaves the title
- **THEN** the deck bar keeps the same height throughout

### Requirement: A saved rename is confirmed

After a rename is saved, the deck bar's meta line SHALL briefly confirm it and then return to the deck's counts, and the new name SHALL be announced to assistive technology.

#### Scenario: A save is confirmed

- **WHEN** a rename is saved
- **THEN** the meta line shows a short "Saved" confirmation and then the deck's card count and focused section again, and the new name is announced by the page's status region

#### Scenario: Reduced motion

- **WHEN** the user prefers reduced motion
- **THEN** the hover highlight and the confirmation appear and disappear without animated transitions

### Requirement: Renaming does not disturb the deck views

Saving a rename SHALL change only the deck's name. It SHALL NOT rebuild the deck sections, checklist, rune ratio, card chips or Champion zone, and SHALL NOT dismiss or recreate any element other than the title and the meta line, so that the click that moved focus out of the title still takes effect.

#### Scenario: The click that ends the edit still lands

- **WHEN** a user edits the title and then presses a card's "+" control
- **THEN** the name is saved and that card is added in the same press

#### Scenario: Views are unchanged by a rename

- **WHEN** a deck is renamed
- **THEN** its section contents, legality results and scroll positions are exactly as before

### Requirement: Shared decks keep a read-only title

A deck opened from a shared link SHALL show its title as plain text: no hover highlight, no text cursor, no focus stop for editing, and no "Rename" button. Adopting the deck with "Save as my deck" SHALL make the title editable at once.

#### Scenario: Shared title is not editable

- **WHEN** a user opens a shared deck link
- **THEN** the title cannot be edited and shows no editing cues

#### Scenario: Saving a shared deck enables editing

- **WHEN** a user presses "Save as my deck" on a shared deck
- **THEN** the title becomes editable and the "Rename" button appears

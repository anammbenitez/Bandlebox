# Spec Delta

## ADDED Requirements

### Requirement: Refresh caches the glyph artwork that card text needs

The refresh process SHALL acquire the glyph artwork used by card text into a local cache alongside the catalog snapshot, and SHALL ensure the cache is complete even when the catalog itself is unchanged. Failure to acquire glyph artwork MUST NOT prevent the catalog snapshot from being updated.

#### Scenario: First refresh populates the glyph cache

- **WHEN** the refresh process completes successfully on a machine with no glyph cache
- **THEN** the glyph files needed to render card text are present in the local cache

#### Scenario: Unchanged catalog still fills a missing cache

- **WHEN** the catalog request returns `304 Not Modified` but the glyph cache is missing or incomplete
- **THEN** the glyph cache is populated without replacing the existing snapshot

#### Scenario: Glyph acquisition fails

- **WHEN** the glyph artwork cannot be downloaded but the catalog can
- **THEN** the refresh still reports success for the snapshot, and the app renders card text without glyphs rather than failing

## MODIFIED Requirements

### Requirement: Refresh never touches app-owned data

The refresh process MUST only replace OpenRift-owned data (the snapshot, the glyph cache, and files derived directly from the snapshot). It MUST NOT delete, overwrite, or restructure any other local data, reserved for later app features such as collections and decks.

#### Scenario: Refresh alongside app data

- **WHEN** the snapshot is replaced by a refresh
- **THEN** no file outside the snapshot, its derived index, and the glyph cache is created, modified, or deleted

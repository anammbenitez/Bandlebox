// Where decks live (openspec change migrate-to-react, design D6). Everything
// that reads or writes decks goes through this interface, so the storage
// behind it can change (a backend later) without touching the UI. Today the
// only real implementation is the browser's localStorage entry.
//
// Synchronous on purpose for now: localStorage is synchronous, and making it
// async before a backend exists would only add loading states nobody sees.

import type { Deck } from '../deck.ts';

export interface DeckRepository {
	/** Every deck, most recently updated first. */
	list(): Deck[];
	get(id: string): Deck | undefined;
	/** A new, empty deck (with its Legend placed when one is given), saved. */
	create(name: string, legendSlug?: string): Deck;
	/** A full deck from elsewhere (a share link) under a new identity, saved. */
	adopt(deck: Deck): Deck;
	/** Renames by id; a blank name keeps the old one. */
	rename(id: string, name: string): Deck | undefined;
	remove(id: string): void;
	/** Persists a deck the caller has already changed. */
	save(deck: Deck): Deck;
	/** True when decks are not being persisted this session. */
	storageUnavailable(): boolean;
	/** The one-time "not being saved" message, or null (afterwards, or when healthy). */
	takeProblem(): string | null;
}

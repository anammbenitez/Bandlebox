// The browser's deck library as a DeckRepository: a thin wrapper over
// deck-store.ts, which keeps the storage key, the file version, the in-memory
// fallback and the one-time warning exactly as they were.

import {
	addDeck,
	adoptDeck,
	getDeck,
	listDecks,
	removeDeck,
	renameDeck,
	saveDeck,
	storageUnavailable,
	takeStorageProblem,
} from '../deck-store.ts';
import type { DeckRepository } from './deck-repository.ts';

export const localStorageDeckRepository: DeckRepository = {
	list: listDecks,
	get: getDeck,
	create: addDeck,
	adopt: adoptDeck,
	rename: renameDeck,
	remove: removeDeck,
	save: saveDeck,
	storageUnavailable,
	takeProblem: takeStorageProblem,
};

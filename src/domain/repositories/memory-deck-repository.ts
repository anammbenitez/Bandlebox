// An in-memory DeckRepository for tests: the same behavior as the browser
// library (ordering, identities, blank-name rename, save stamping) without
// any storage. `unavailable` simulates a session whose storage failed.

import { createDeck, type Deck } from '../deck.ts';
import type { DeckRepository } from './deck-repository.ts';

export interface MemoryDeckRepositoryOptions {
	decks?: Deck[];
	/** Behave like a session whose storage is unavailable (one warning). */
	unavailable?: boolean;
	/** Deterministic ids and clock for tests. */
	nextId?: () => string;
	now?: () => string;
}

const UNAVAILABLE_MESSAGE =
	'Decks are not being saved this visit — browser storage is unavailable or full. Keep this window open, or try again in a normal browser window.';

export function createMemoryDeckRepository(options: MemoryDeckRepositoryOptions = {}): DeckRepository {
	let decks: Deck[] = (options.decks ?? []).map((d) => ({ ...d }));
	let warned = false;
	let counter = 0;
	const nextId = options.nextId ?? (() => `mem-${++counter}`);
	const now = options.now ?? (() => new Date().toISOString());

	function upsert(deck: Deck): void {
		const updated: Deck = { ...deck, updatedAt: now() };
		const at = decks.findIndex((d) => d.id === deck.id);
		decks = at < 0 ? [...decks, updated] : decks.map((d, i) => (i === at ? updated : d));
	}

	return {
		list: () => decks.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
		get: (id) => decks.find((d) => d.id === id),
		create(name, legendSlug) {
			const deck = createDeck(name, nextId(), now());
			if (legendSlug) deck.legend = [{ card: legendSlug, qty: 1 }];
			decks = [...decks, deck];
			return deck;
		},
		adopt(deck) {
			const stamp = now();
			const adopted: Deck = { ...deck, id: nextId(), createdAt: stamp, updatedAt: stamp };
			decks = [...decks, adopted];
			return adopted;
		},
		rename(id, name) {
			const deck = decks.find((d) => d.id === id);
			if (!deck) return undefined;
			const renamed: Deck = { ...deck, name: name.trim() || deck.name };
			upsert(renamed);
			return renamed;
		},
		remove(id) {
			decks = decks.filter((d) => d.id !== id);
		},
		save(deck) {
			upsert(deck);
			return deck;
		},
		storageUnavailable: () => Boolean(options.unavailable),
		takeProblem() {
			if (!options.unavailable || warned) return null;
			warned = true;
			return UNAVAILABLE_MESSAGE;
		},
	};
}

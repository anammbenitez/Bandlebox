// Deck library persistence (design.md D1): all decks in one versioned
// localStorage entry, saved after every mutation. When storage access fails
// the store falls back to in-memory state and reports persistence trouble
// to the UI through a one-shot warning. No DOM assumptions beyond globalThis
// localStorage, so it runs in the browser and in Node verification runs.

import { createDeck, type Deck } from './deck.ts';

const STORAGE_KEY = 'riftbound-deck-library';

interface LibraryFile {
	version: number;
	decks: Deck[];
}

const FILE_VERSION = 1;

interface Bounds {
	storage: Storage | null;
	unavailable: boolean;
	memory: Deck[];
	warned: boolean;
}

const bounds: Bounds = { storage: null, unavailable: false, memory: [], warned: false };

/** Resolves once; localStorage access itself may throw, which is the
 *  storage-unavailable case (private mode, disabled storage, quota on some
 *  browsers). Node verification runs stub `globalThis.localStorage`. */
function resolveStorage(): Storage | null {
	if (bounds.unavailable) return null;
	if (bounds.storage) return bounds.storage;
	try {
		const store = globalThis.localStorage as Storage | undefined;
		if (!store) throw new Error('no localStorage');
		void store.getItem(STORAGE_KEY);
		bounds.storage = store;
		return store;
	} catch {
		bounds.unavailable = true;
		return null;
	}
}

function panic(): void {
	// Persisted state is inaccessible: serve whatever this session has built,
	// and let the pages surface a warning through takeStorageProblem once.
	bounds.unavailable = true;
	bounds.storage = null;
}

function readLibrary(): Deck[] {
	const store = resolveStorage();
	if (!store) return bounds.memory;
	let raw: string | null = null;
	try {
		raw = store.getItem(STORAGE_KEY);
	} catch {
		panic();
		return bounds.memory;
	}
	if (raw == null) return [];
	try {
		const file = JSON.parse(raw) as LibraryFile;
		if (!Array.isArray(file.decks)) throw new Error('bad shape');
		return file.decks;
	} catch (err) {
		console.warn('riftbound deck library was unreadable; starting empty', err);
		return [];
	}
}

function writeLibrary(decks: Deck[]): void {
	bounds.memory = decks;
	const store = resolveStorage();
	if (!store) return; // memory-only mode; warning path covers it
	try {
		store.setItem(STORAGE_KEY, JSON.stringify({ version: FILE_VERSION, decks } satisfies LibraryFile));
	} catch (err) {
		panic();
		console.warn('riftbound deck library could not be saved', err);
	}
}

/** True when reads and writes could not use persistent storage this session. */
export function storageUnavailable(): boolean {
	resolveStorage();
	return bounds.unavailable;
}

/** One-shot persistence warning for the UI: returns a message the first time
 *  it is called after storage trouble, and null afterwards. */
export function takeStorageProblem(): string | null {
	resolveStorage();
	if (!bounds.unavailable || bounds.warned) return null;
	bounds.warned = true;
	return 'Decks are not being saved this visit — browser storage is unavailable or full. Keep this window open, or try again in a normal browser window.';
}

export function listDecks(): Deck[] {
	return readLibrary().slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDeck(id: string): Deck | undefined {
	return readLibrary().find((d) => d.id === id);
}

function nowIso(): string {
	return new Date().toISOString();
}

function nextId(): string {
	return globalThis.crypto?.randomUUID?.() ?? `deck-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function addDeck(name: string, legendSlug?: string): Deck {
	const deck = createDeck(name, nextId(), nowIso());
	if (legendSlug) {
		// Modal creation seeds the Legend zone up front (spec: deck-library,
		// creation modal); the shape matches what the manager would write.
		deck.legend = [{ card: legendSlug, qty: 1 }];
	}
	writeLibrary([...readLibrary(), deck]);
	return deck;
}

/** Insert a full deck (shared-deck import): new identity, saved. */
export function adoptDeck(deck: Deck): Deck {
	const cad = nextId();
	const adopted: Deck = { ...deck, id: cad, createdAt: nowIso(), updatedAt: nowIso() };
	writeLibrary([...readLibrary(), adopted]);
	return adopted;
}

function upsert(deck: Deck): void {
	const decks = readLibrary();
	const at = decks.findIndex((d) => d.id === deck.id);
	const updated: Deck = { ...deck, updatedAt: nowIso() };
	if (at < 0) decks.push(updated);
	else decks[at] = updated;
	writeLibrary(decks);
}

export function renameDeck(id: string, name: string): Deck | undefined {
	const deck = getDeck(id);
	if (!deck) return undefined;
	const renamed: Deck = { ...deck, name: name.trim() || deck.name };
	upsert(renamed);
	return renamed;
}

export function removeDeck(id: string): void {
	writeLibrary(readLibrary().filter((d) => d.id !== id));
}

/** Apply a deck mutation (slots or naming done by the caller) and persist. */
export function saveDeck(deck: Deck): Deck {
	upsert(deck);
	return deck;
}

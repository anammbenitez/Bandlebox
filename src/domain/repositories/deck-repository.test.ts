// @vitest-environment node
// One contract, two implementations: the browser library and the in-memory
// stand-in must behave the same, so tests that use the memory repository say
// something true about the app (design D6).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deck } from '../deck.ts';
import type { DeckRepository } from './deck-repository.ts';
import { createMemoryDeckRepository } from './memory-deck-repository.ts';

const KEY = 'riftbound-deck-library';

function stubStorage(opts: { getThrows?: boolean; setThrows?: boolean } = {}): Storage {
	const map = new Map<string, string>();
	return {
		getItem: (k: string) => {
			if (opts.getThrows) throw new Error('blocked');
			return map.get(k) ?? null;
		},
		setItem: (k: string, v: string) => {
			if (opts.setThrows) throw new Error('blocked');
			map.set(k, String(v));
		},
		removeItem: (k: string) => void map.delete(k),
		clear: () => map.clear(),
		key: () => null,
		get length() {
			return map.size;
		},
	};
}

/** A fresh localStorage-backed repository (deck-store keeps module state). */
async function localRepo(storage: Storage): Promise<DeckRepository> {
	vi.resetModules();
	vi.stubGlobal('localStorage', storage);
	const mod = await import('./local-storage-deck-repository.ts');
	return mod.localStorageDeckRepository;
}

type Factory = (opts: { unavailable?: boolean }) => Promise<DeckRepository>;

const IMPLEMENTATIONS: Array<[string, Factory]> = [
	['localStorage', ({ unavailable }) => localRepo(stubStorage({ getThrows: unavailable }))],
	['memory', async ({ unavailable }) => createMemoryDeckRepository({ unavailable })],
];

describe.each(IMPLEMENTATIONS)('DeckRepository contract: %s', (_name, make) => {
	let repo: DeckRepository;
	beforeEach(async () => {
		repo = await make({});
	});

	it('creates a named, empty deck with a stable id', () => {
		const deck = repo.create('  Poro Swarm  ');
		expect(deck.id).toBeTruthy();
		expect(deck.name).toBe('Poro Swarm');
		expect(deck.main).toEqual([]);
		expect(repo.get(deck.id)?.name).toBe('Poro Swarm');
		expect(repo.list()).toHaveLength(1);
	});

	it('seeds the Legend when one is given', () => {
		const deck = repo.create('Fox', 'nine-tailed-fox');
		expect(repo.get(deck.id)?.legend).toEqual([{ card: 'nine-tailed-fox', qty: 1 }]);
	});

	it('renames in place, and a blank name keeps the old one', () => {
		const deck = repo.create('Before');
		expect(repo.rename(deck.id, 'After')?.name).toBe('After');
		expect(repo.get(deck.id)?.name).toBe('After');
		expect(repo.rename(deck.id, '   ')?.name).toBe('After');
		expect(repo.rename('missing', 'x')).toBeUndefined();
	});

	it('saves changes and lists the newest first', async () => {
		const a = repo.create('A');
		await new Promise((r) => setTimeout(r, 5));
		const b = repo.create('B');
		await new Promise((r) => setTimeout(r, 5));
		repo.save({ ...repo.get(a.id)!, main: [{ card: 'x', qty: 2 }] });
		expect(repo.get(a.id)?.main).toEqual([{ card: 'x', qty: 2 }]);
		expect(repo.list().map((d) => d.id)).toEqual([a.id, b.id]);
	});

	it('adopts a shared deck under a new identity', () => {
		const shared: Deck = { ...repo.create('Shared'), id: 'from-link' };
		repo.remove(repo.list()[0].id);
		const adopted = repo.adopt(shared);
		expect(adopted.id).not.toBe('from-link');
		expect(adopted.name).toBe('Shared');
		expect(repo.list()).toHaveLength(1);
	});

	it('removes', () => {
		const deck = repo.create('Gone');
		repo.remove(deck.id);
		expect(repo.get(deck.id)).toBeUndefined();
		expect(repo.list()).toHaveLength(0);
	});

	it('healthy storage reports no problem', () => {
		expect(repo.storageUnavailable()).toBe(false);
		expect(repo.takeProblem()).toBeNull();
	});

	it('unavailable storage keeps decks for the session and warns once', async () => {
		const failing = await make({ unavailable: true });
		const deck = failing.create('Session');
		expect(failing.get(deck.id)?.name).toBe('Session');
		expect(failing.storageUnavailable()).toBe(true);
		expect(failing.takeProblem()).toMatch(/not being saved/);
		expect(failing.takeProblem()).toBeNull();
	});
});

describe('localStorage repository specifics', () => {
	it('writes the versioned library entry the app has always used', async () => {
		const storage = stubStorage();
		const repo = await localRepo(storage);
		repo.create('Kept');
		const file = JSON.parse(storage.getItem(KEY)!);
		expect(file.version).toBe(1);
		expect(file.decks[0].name).toBe('Kept');
	});

	it('a failing write degrades to memory and warns', async () => {
		const repo = await localRepo(stubStorage({ setThrows: true }));
		repo.create('Fragile');
		expect(repo.list()).toHaveLength(1);
		expect(repo.takeProblem()).toMatch(/not being saved/);
	});
});

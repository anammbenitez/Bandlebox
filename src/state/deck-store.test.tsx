import { act, render, screen } from '@testing-library/react';
import { useStore } from 'zustand';
import { describe, expect, it } from 'vitest';
import type { CardInfo, DeckRuleIndexes } from '../domain/deck-rules.ts';
import { createMemoryDeckRepository } from '../domain/repositories/memory-deck-repository.ts';
import { createDeckStore, type DeckStoreState } from './deck-store.ts';

const info = (types: string[], extra: Partial<CardInfo> = {}): CardInfo => ({
	types,
	superTypes: [],
	domains: ['calm'],
	tags: [],
	maxCopiesOverride: null,
	banned: false,
	...extra,
});

const IDX: DeckRuleIndexes = {
	cards: {
		fox: info(['legend'], { domains: ['calm', 'mind'], tags: ['Ahri'] }),
		monk: info(['legend'], { domains: ['body'], tags: ['Lee Sin'] }),
		ahri: info(['unit'], { superTypes: ['champion'], tags: ['Ahri'] }),
		lee: info(['unit'], { superTypes: ['champion'], tags: ['Lee Sin'], domains: ['body'] }),
		bolt: info(['spell']),
		spider: info(['unit'], { maxCopiesOverride: 0 }),
		field: info(['battlefield']),
		'calm-rune': info(['rune'], { domains: ['calm'] }),
		'mind-rune': info(['rune'], { domains: ['mind'] }),
	},
	names: {},
	championTags: ['Ahri', 'Lee Sin'],
};

function storeWith(unavailable = false) {
	const repo = createMemoryDeckRepository({ unavailable });
	const store = createDeckStore(repo);
	store.getState().load();
	return { repo, store, s: () => store.getState() };
}

function opened(legend?: string) {
	const ctx = storeWith();
	const deck = ctx.s().create('Test', legend);
	ctx.s().openOwned(deck.id);
	return ctx;
}

describe('library actions', () => {
	it('create, rename and remove keep the list current', () => {
		const { s } = storeWith();
		const deck = s().create('Fox');
		expect(s().library.map((d) => d.name)).toEqual(['Fox']);
		s().rename(deck.id, 'Fox Tricks');
		expect(s().library[0].name).toBe('Fox Tricks');
		s().remove(deck.id);
		expect(s().library).toEqual([]);
	});

	it('the storage warning is taken once, on load', () => {
		const { s, store } = storeWith(true);
		expect(s().problem).toMatch(/not being saved/);
		store.getState().load();
		expect(s().problem).toMatch(/not being saved/); // kept, not lost on a second load
	});
});

describe('editing the open deck', () => {
	it('clickAdd routes a card to its natural section', () => {
		const { s } = opened('fox');
		expect(s().clickAdd(IDX, 'bolt')).toMatchObject({ ok: true, section: 'main' });
		expect(s().clickAdd(IDX, 'field')).toMatchObject({ ok: true, section: 'battlefields' });
		expect(s().open?.main).toEqual([{ card: 'bolt', qty: 1 }]);
		expect(s().library[0].main).toEqual([{ card: 'bolt', qty: 1 }]); // saved
	});

	it('the copy limit refuses the fourth copy, and a card limited to 0 at once', () => {
		const { s } = opened('fox');
		for (let i = 0; i < 3; i++) expect(s().addTo(IDX, 'main', 'bolt').ok).toBe(true);
		expect(s().addTo(IDX, 'main', 'bolt')).toEqual({ ok: false, why: 'copy limit 3' });
		expect(s().addTo(IDX, 'main', 'spider')).toEqual({ ok: false, why: 'copy limit 0' });
		expect(s().open?.main).toEqual([{ card: 'bolt', qty: 3 }]);
	});

	it('battlefields are distinct and types must fit the section', () => {
		const { s } = opened('fox');
		s().addTo(IDX, 'battlefields', 'field');
		expect(s().addTo(IDX, 'battlefields', 'field').why).toBe('battlefields are distinct picks');
		expect(s().addTo(IDX, 'rune', 'bolt').why).toBe('card type does not fit this section');
		expect(s().addTo(IDX, 'main', 'nope').why).toBe('not in this snapshot');
	});

	it('another Legend replaces the placed one; the same Legend is refused', () => {
		const { s } = opened('fox');
		expect(s().clickAdd(IDX, 'fox')).toMatchObject({ ok: false, why: 'this legend is already placed' });
		expect(s().clickAdd(IDX, 'monk').ok).toBe(true);
		expect(s().open?.legend).toEqual([{ card: 'monk', qty: 1 }]);
	});

	it('changeQty and pullFromAny remove copies', () => {
		const { s } = opened('fox');
		s().addTo(IDX, 'side', 'bolt');
		expect(s().pullFromAny(IDX, 'bolt')).toMatchObject({ ok: true, section: 'side' });
		expect(s().pullFromAny(IDX, 'bolt')).toMatchObject({ ok: false, why: 'no copies in the deck' });
		s().addTo(IDX, 'main', 'bolt');
		s().changeQty(IDX, 'main', 'bolt', -1);
		expect(s().open?.main).toEqual([]);
	});

	it('the champion pick needs the Legend tag and follows its copies', () => {
		const { s } = opened('fox');
		expect(s().placeChampion(IDX, 'lee').why).toBe('champion must match the legend');
		expect(s().placeChampion(IDX, 'ahri').ok).toBe(true);
		expect(s().open?.champion).toBe('ahri');
		expect(s().open?.main).toEqual([{ card: 'ahri', qty: 1 }]);
		s().changeQty(IDX, 'main', 'ahri', -1);
		expect(s().open?.champion).toBeUndefined(); // its copies left
		s().placeChampion(IDX, 'ahri');
		s().clickAdd(IDX, 'monk');
		expect(s().open?.champion).toBeUndefined(); // the new Legend does not match
	});

	it('runes seed 6 / 6 for a two-color Legend and follow the written ratio', () => {
		const { s } = opened('fox');
		s().seedRunes(IDX);
		expect(s().open?.rune).toEqual([
			{ card: 'calm-rune', qty: 6 },
			{ card: 'mind-rune', qty: 6 },
		]);
		s().setRuneRatio(IDX, 'calm', 8);
		s().setRuneRatio(IDX, 'mind', 4);
		expect(s().open?.rune).toEqual([
			{ card: 'calm-rune', qty: 8 },
			{ card: 'mind-rune', qty: 4 },
		]);
	});

	it('renames the open deck; blank or unchanged names are ignored', () => {
		const { s } = opened('fox');
		expect(s().renameOpen('  Renamed  ')).toBe(true);
		expect(s().open?.name).toBe('Renamed');
		expect(s().renameOpen('   ')).toBe(false);
		expect(s().renameOpen('Renamed')).toBe(false);
	});
});

describe('shared decks', () => {
	it('are read-only until adopted under a new identity', () => {
		const { s } = storeWith();
		s().openShared({ id: 'link', name: 'Shared', createdAt: '', updatedAt: '', schemaVersion: 1, legend: [], battlefields: [], main: [], rune: [], side: [] });
		expect(s().addTo(IDX, 'main', 'bolt').ok).toBe(false);
		expect(s().renameOpen('Mine')).toBe(false);
		const adopted = s().adoptShared();
		expect(adopted?.id).not.toBe('link');
		expect(s().shared).toBe(false);
		expect(s().library).toHaveLength(1);
		expect(s().addTo(IDX, 'main', 'bolt').ok).toBe(true);
	});
});

describe('one store, many islands', () => {
	it('two components on the page see the same update', () => {
		const { store, s } = opened('fox');
		const Count = ({ label }: { label: string }) => {
			const n = useStore(store, (st: DeckStoreState) => st.open?.main.length ?? 0);
			return (
				<p>
					{label}: {n}
				</p>
			);
		};
		render(
			<>
				<Count label="browser" />
				<Count label="viewer" />
			</>,
		);
		act(() => {
			s().addTo(IDX, 'main', 'bolt');
		});
		expect(screen.getByText('browser: 1')).toBeInTheDocument();
		expect(screen.getByText('viewer: 1')).toBeInTheDocument();
	});
});

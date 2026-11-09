// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createDeck, type Deck } from './deck.ts';
import { fitsChampionZone } from './deck-editing.ts';
import { validate, type CardInfo, type DeckRuleIndexes } from './deck-rules.ts';

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
		// a normal Legend: its first tag is carried by a champion
		fox: info(['legend'], { tags: ['Ahri'] }),
		ahri: info(['unit'], { superTypes: ['champion'], tags: ['Ahri'] }),
		lee: info(['unit'], { superTypes: ['champion'], tags: ['Lee Sin'] }),
		plain: info(['unit'], { tags: ['Ahri'] }), // right tag, not a champion
		// an unusual Legend: none of its tags is carried by any champion
		odd: info(['legend'], { tags: ['Mystery', 'Other'] }),
		mystery: info(['unit'], { superTypes: ['champion'], tags: ['Mystery'] }),
	},
	names: {},
	championTags: ['Ahri', 'Lee Sin'],
};

const deckWith = (legend: string, main: string[]): Deck => ({
	...createDeck('t', 'id', '2026-01-01T00:00:00.000Z'),
	legend: [{ card: legend, qty: 1 }],
	main: main.map((card) => ({ card, qty: 1 })),
});

/** What the legality checklist says about this one card in the main deck. */
function checklistAccepts(legend: string, slug: string): boolean {
	const rule = validate(deckWith(legend, [slug]), IDX).rules.find((r) => r.id === 'champion-unit')!;
	return rule.status === 'pass';
}

describe('the champion zone and the checklist share one rule', () => {
	const cases: Array<[string, string]> = [
		['fox', 'ahri'],
		['fox', 'lee'],
		['fox', 'plain'],
		['fox', 'mystery'],
		['odd', 'ahri'],
		['odd', 'mystery'],
		['odd', 'lee'],
	];

	it.each(cases)('Legend %s with %s: same verdict', (legend, slug) => {
		expect(fitsChampionZone(deckWith(legend, []), IDX, slug)).toBe(checklistAccepts(legend, slug));
	});

	it('a normal Legend takes only a champion carrying its tag', () => {
		const deck = deckWith('fox', []);
		expect(fitsChampionZone(deck, IDX, 'ahri')).toBe(true);
		expect(fitsChampionZone(deck, IDX, 'lee')).toBe(false);
		expect(fitsChampionZone(deck, IDX, 'plain')).toBe(false);
	});

	it('a Legend whose tags match no champion falls back to its first tag, as the checklist does', () => {
		const deck = deckWith('odd', []);
		expect(fitsChampionZone(deck, IDX, 'mystery')).toBe(true);
		expect(fitsChampionZone(deck, IDX, 'ahri')).toBe(false);
	});

	it('without a Legend nothing fits', () => {
		expect(fitsChampionZone({ ...deckWith('fox', []), legend: [] }, IDX, 'ahri')).toBe(false);
	});
});

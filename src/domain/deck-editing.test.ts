// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createDeck, type Deck } from './deck.ts';
import { fitsChampionZone, recolorRunesForLegend, runeCopiesFor } from './deck-editing.ts';
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

describe('a Legend change re-colors the rune deck', () => {
	const domains = ['fury', 'chaos', 'calm', 'mind', 'body'];
	const IDX_RUNES: DeckRuleIndexes = {
		cards: {
			furycalm: info(['legend'], { domains: ['fury', 'calm'] }),
			calmmind: info(['legend'], { domains: ['calm', 'mind'] }),
			furychaos: info(['legend'], { domains: ['fury', 'chaos'] }),
			monk: info(['legend'], { domains: ['body'] }),
			stray: info(['rune'], { domains: ['chaos', 'mind'] }),
			mystery: info(['legend'], { domains: [] }),
			...Object.fromEntries(domains.map((d) => [`${d}-rune`, info(['rune'], { domains: [d] })])),
		},
		names: {},
		championTags: [],
	};
	const deck = (legend: string, rune: Array<[string, number]>): Deck => ({
		...createDeck('t', 'id', '2026-01-01T00:00:00.000Z'),
		legend: [{ card: legend, qty: 1 }],
		rune: rune.map(([domain, qty]) => ({ card: `${domain}-rune`, qty })),
	});
	const counts = (d: Deck) => Object.fromEntries(d.rune.map((s) => [s.card, s.qty]));
	const total = (d: Deck) => d.rune.reduce((sum, s) => sum + s.qty, 0);

	it('Fury 8 / Chaos 4 under a Fury + Calm Legend becomes Fury 8 / Calm 4', () => {
		const next = recolorRunesForLegend(deck('furycalm', [['fury', 8], ['chaos', 4]]), IDX_RUNES);
		expect(counts(next)).toEqual({ 'fury-rune': 8, 'calm-rune': 4 });
		expect(total(next)).toBe(12);
	});

	it('Fury 8 / Chaos 4 under a Calm + Mind Legend becomes Calm 8 / Mind 4', () => {
		const next = recolorRunesForLegend(deck('calmmind', [['fury', 8], ['chaos', 4]]), IDX_RUNES);
		expect(counts(next)).toEqual({ 'calm-rune': 8, 'mind-rune': 4 });
		expect(runeCopiesFor(next, IDX_RUNES, 'fury')).toBe(0);
		expect(runeCopiesFor(next, IDX_RUNES, 'chaos')).toBe(0);
	});

	it('keeps the count a color already has and gives the other the deleted counts', () => {
		const next = recolorRunesForLegend(deck('calmmind', [['calm', 9], ['fury', 3]]), IDX_RUNES);
		expect(counts(next)).toEqual({ 'calm-rune': 9, 'mind-rune': 3 });
	});

	it('leaves the deck alone when the runes already wear the Legend colors', () => {
		const same = deck('furychaos', [['fury', 8], ['chaos', 4]]);
		expect(recolorRunesForLegend(same, IDX_RUNES)).toBe(same);
	});

	it('seeds the even split into an empty rune deck', () => {
		expect(counts(recolorRunesForLegend(deck('calmmind', []), IDX_RUNES))).toEqual({ 'calm-rune': 6, 'mind-rune': 6 });
	});

	it('a one-color Legend puts the preserved total in its color', () => {
		expect(counts(recolorRunesForLegend(deck('monk', [['fury', 8], ['chaos', 4]]), IDX_RUNES))).toEqual({ 'body-rune': 12 });
		expect(counts(recolorRunesForLegend(deck('monk', [['fury', 6], ['chaos', 4]]), IDX_RUNES))).toEqual({ 'body-rune': 10 });
		expect(counts(recolorRunesForLegend(deck('monk', [['fury', 5], ['chaos', 3]]), IDX_RUNES))).toEqual({ 'body-rune': 8 });
	});

	it('a one-color Legend keeps runes of its own color in the total', () => {
		const next = recolorRunesForLegend(deck('monk', [['body', 3], ['fury', 5]]), IDX_RUNES);
		expect(counts(next)).toEqual({ 'body-rune': 8 });
	});

	it('an empty rune deck under a one-color Legend gets the default twelve', () => {
		expect(counts(recolorRunesForLegend(deck('monk', []), IDX_RUNES))).toEqual({ 'body-rune': 12 });
	});

	it('counts left over after every new color has one go round-robin to the new colors (Fury 5 / Chaos 4 / Order 3)', () => {
		const idx: DeckRuleIndexes = { ...IDX_RUNES, cards: { ...IDX_RUNES.cards, 'order-rune': info(['rune'], { domains: ['order'] }) } };
		const next = recolorRunesForLegend(deck('furycalm', [['fury', 5], ['chaos', 4], ['order', 3]]), idx);
		expect(counts(next)).toEqual({ 'fury-rune': 7, 'calm-rune': 5 });
		expect(total(next)).toBe(12);
	});

	it('a deleted count goes to the new colors when both already have runes (Fury 6 / Calm 4 / Chaos 2)', () => {
		const next = recolorRunesForLegend(deck('furycalm', [['fury', 6], ['calm', 4], ['chaos', 2]]), IDX_RUNES);
		expect(counts(next)).toEqual({ 'fury-rune': 7, 'calm-rune': 5 });
		expect(total(next)).toBe(12);
	});

	it.each([
		[[['fury', 5], ['chaos', 4], ['mind', 1]]],
		[[['fury', 1], ['chaos', 1], ['mind', 1], ['body', 9]]],
		[[['calm', 2], ['fury', 2], ['chaos', 3], ['mind', 3]]],
	] as Array<[Array<[string, number]>]>)('never changes the total or leaves a bad quantity (%j)', (runes) => {
		const before = deck('furycalm', runes);
		const next = recolorRunesForLegend(before, IDX_RUNES);
		expect(total(next)).toBe(total(before));
		for (const slot of next.rune) {
			expect(slot.qty).toBeGreaterThanOrEqual(1);
			expect(slot.qty).toBeLessThanOrEqual(total(before));
		}
	});

	it('12 of one color under a Legend that contains it stays as it is (nothing is deleted)', () => {
		const same = deck('furycalm', [['fury', 12]]);
		const next = recolorRunesForLegend(same, IDX_RUNES);
		expect(next).toBe(same);
		expect(counts(next)).toEqual({ 'fury-rune': 12 });
	});

	it('a multi-domain rune card is kept when any of its domains is in the Legend', () => {
		const before = { ...deck('calmmind', [['fury', 6]]), rune: [{ card: 'fury-rune', qty: 6 }, { card: 'stray', qty: 6 }] };
		const next = recolorRunesForLegend(before, IDX_RUNES);
		expect(counts(next)).toEqual({ stray: 6, 'calm-rune': 6 });
	});

	it('a multi-domain rune card with no domain in the Legend is deleted and counted under its first domain', () => {
		const before = { ...deck('furycalm', [['fury', 4], ['mind', 3]]), rune: [{ card: 'fury-rune', qty: 4 }, { card: 'stray', qty: 5 }, { card: 'mind-rune', qty: 3 }] };
		const next = recolorRunesForLegend(before, IDX_RUNES);
		// Calm takes the stray's 5 (first deleted color, Chaos); Mind's 3 go Fury, Calm, Fury
		expect(counts(next)).toEqual({ 'fury-rune': 6, 'calm-rune': 6 });
		expect(next.rune.some((s) => s.card === 'stray')).toBe(false);
	});

	it('a Legend with no known colors leaves the runes untouched', () => {
		const same = deck('mystery', [['fury', 8], ['chaos', 4]]);
		expect(recolorRunesForLegend(same, IDX_RUNES)).toBe(same);
		const none = { ...same, legend: [] };
		expect(recolorRunesForLegend(none, IDX_RUNES)).toBe(none);
	});

	it('keeps a partial rune deck at its own total', () => {
		const next = recolorRunesForLegend(deck('calmmind', [['fury', 5], ['chaos', 3]]), IDX_RUNES);
		expect(counts(next)).toEqual({ 'calm-rune': 5, 'mind-rune': 3 });
		expect(total(next)).toBe(8);
	});

	it('12 Fury under a Calm + Mind Legend becomes Calm 12 / Mind 0 (total kept)', () => {
		const next = recolorRunesForLegend(deck('calmmind', [['fury', 12]]), IDX_RUNES);
		expect(counts(next)).toEqual({ 'calm-rune': 12 });
	});

	it('three old colors under a one-color Legend keep the whole total', () => {
		const next = recolorRunesForLegend(
			deck('monk', [
				['fury', 4],
				['chaos', 4],
				['mind', 4],
			]),
			IDX_RUNES,
		);
		expect(counts(next)).toEqual({ 'body-rune': 12 });
	});

	it('counts of 1 are shared round-robin: Fury 1 / Chaos 1 / Mind 1 / Body 1 under Fury + Calm', () => {
		const next = recolorRunesForLegend(
			deck('furycalm', [
				['fury', 1],
				['chaos', 1],
				['mind', 1],
				['body', 1],
			]),
			IDX_RUNES,
		);
		expect(counts(next)).toEqual({ 'fury-rune': 2, 'calm-rune': 2 });
	});

	it('a Legend whose two colors are the same acts as a one-color Legend', () => {
		const idx = { ...IDX_RUNES, cards: { ...IDX_RUNES.cards, twin: info(['legend'], { domains: ['body', 'body'] }) } };
		expect(counts(recolorRunesForLegend(deck('twin', [['fury', 10]]), idx))).toEqual({ 'body-rune': 10 });
		// two old colors: only a de-duplicated color list keeps the whole total
		const two = deck('twin', [
			['fury', 5],
			['chaos', 5],
		]);
		expect(counts(recolorRunesForLegend(two, idx))).toEqual({ 'body-rune': 10 });
	});

	it('a color with no rune card leaves the deck untouched rather than shrinking it', () => {
		// no rune card carries Mind any more (the multi-domain `stray` card does too)
		const { 'mind-rune': _mind, stray: _stray, ...cards } = IDX_RUNES.cards;
		const before = deck('calmmind', [
			['fury', 8],
			['chaos', 4],
		]);
		expect(recolorRunesForLegend(before, { ...IDX_RUNES, cards })).toBe(before);
	});
});

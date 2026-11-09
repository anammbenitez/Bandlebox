import { describe, expect, it } from 'vitest';
import type { GridEntry } from '../../domain/grid-item.ts';
import { countLabel, depthFor, filterEntries, fromSearch, isFiltered, NO_FILTERS, searchable, toSearch } from './grid-state.ts';

const entry = (slug: string, name: string, extra: Partial<GridEntry> = {}): GridEntry => ({
	slug,
	name,
	meta: '',
	art: null,
	types: ['unit'],
	rarities: ['common'],
	sets: ['OGN'],
	variants: 1,
	text: name,
	...extra,
});

const ENTRIES = searchable([
	entry('ahri', 'Ahri, Alluring', { text: 'Ahri, Alluring\nWhen I hold, you score 1 point.' }),
	entry('fox', 'Nine-Tailed Fox', { types: ['legend'], rarities: ['rare'] }),
	entry('bolt', 'Bolt', { types: ['spell'], sets: ['UNL'], text: 'Bolt\nDeal 3 to a unit.' }),
]);

describe('grid filters', () => {
	it('match name and printed text, case-insensitively and trimmed', () => {
		expect(filterEntries(ENTRIES, { ...NO_FILTERS, q: '  AHRI ' }).map((e) => e.slug)).toEqual(['ahri']);
		expect(filterEntries(ENTRIES, { ...NO_FILTERS, q: 'deal 3' }).map((e) => e.slug)).toEqual(['bolt']);
	});

	it('combine type, rarity and set', () => {
		expect(filterEntries(ENTRIES, { ...NO_FILTERS, type: 'legend' }).map((e) => e.slug)).toEqual(['fox']);
		expect(filterEntries(ENTRIES, { ...NO_FILTERS, set: 'UNL', type: 'spell' }).map((e) => e.slug)).toEqual(['bolt']);
		expect(filterEntries(ENTRIES, { ...NO_FILTERS, rarity: 'epic' })).toEqual([]);
	});

	it('count label', () => {
		expect(countLabel(1106, 1106, false)).toBe('Showing all 1,106 cards');
		expect(countLabel(3, 1106, true)).toBe('Showing 3 of 1,106 cards');
		expect(isFiltered({ ...NO_FILTERS, q: '   ' })).toBe(false);
	});
});

describe('URL state', () => {
	it('writes only what is set, the search lower-cased', () => {
		expect(toSearch(NO_FILTERS, 60)).toBe('');
		expect(toSearch({ q: ' Ahri ', type: 'legend', rarity: '', set: '' }, 60)).toBe('?type=legend&q=ahri');
		expect(toSearch(NO_FILTERS, 180)).toBe('?r=180');
	});

	it('round-trips', () => {
		const restored = fromSearch('?type=unit&rarity=rare&set=OGN&q=fox&r=120');
		expect(restored).toEqual({ filters: { q: 'fox', type: 'unit', rarity: 'rare', set: 'OGN' }, depth: 120 });
		expect(fromSearch('')).toBeNull();
	});

	it('depth rounds up to whole steps and stops at the end', () => {
		expect(depthFor(0, 500)).toBe(60);
		expect(depthFor(61, 500)).toBe(120);
		expect(depthFor(400, 130)).toBe(130);
		expect(depthFor(0, 10)).toBe(10);
	});
});

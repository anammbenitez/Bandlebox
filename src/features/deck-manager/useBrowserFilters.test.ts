import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SectionKey } from '../../domain/deck.ts';
import type { CardInfo, DeckRuleIndexes } from '../../domain/deck-rules.ts';
import type { GridEntry } from '../../domain/grid-item.ts';
import { filterCards, presetType, useBrowserFilters } from './useBrowserFilters.ts';

const info = (types: string[], domains: string[]): CardInfo => ({ types, superTypes: [], domains, tags: [], maxCopiesOverride: null, banned: false });

const CARDS: Array<[string, string, string[], string[], string]> = [
	['ahri', 'Ahri, Alluring', ['unit'], ['calm'], 'common'],
	['bolt', 'Bolt', ['spell'], ['calm'], 'rare'],
	['ember', 'Ember', ['spell'], ['fury'], 'common'],
	['neeko', 'Neeko', ['unit'], ['neutral'], 'epic'],
	['fox', 'Nine-Tailed Fox', ['legend'], ['calm', 'mind'], 'rare'],
	['field', 'Sunny Field', ['battlefield'], ['fury'], 'common'],
];

const IDX: DeckRuleIndexes = {
	cards: Object.fromEntries(CARDS.map(([slug, , types, domains]) => [slug, info(types, domains)])),
	names: {},
	championTags: [],
};

const cards: GridEntry[] = CARDS.map(([slug, name, types, , rarity]) => ({ slug, name, meta: '', art: null, types, rarities: [rarity], sets: ['OGN'], variants: 1, text: name }));
const searchable = cards.map((entry) => ({ entry, text: entry.text.toLowerCase() }));
const DOMAINS = [{ slug: 'calm' }, { slug: 'fury' }, { slug: 'colorless' }];

function setup(active: SectionKey = 'main', onChange?: () => void) {
	return renderHook(({ section }) => useBrowserFilters({ cards, searchable, idx: IDX, domains: DOMAINS, legendColors: ['calm'], active: section, onChange }), {
		initialProps: { section: active },
	});
}
const slugs = (list: GridEntry[]) => list.map((e) => e.slug);

describe('presetType', () => {
	it('a section with one card type presets it; main and side leave it open', () => {
		expect(presetType('legend')).toBe('legend');
		expect(presetType('battlefields')).toBe('battlefield');
		expect(presetType('rune')).toBe('rune');
		expect(presetType('main')).toBe('');
		expect(presetType('side')).toBe('');
	});
});

describe('filterCards', () => {
	const none = { q: '', type: '', rarity: '', set: '', chosen: new Set<string>() };

	it('matches name and text, case-insensitively', () => {
		expect(slugs(filterCards(searchable, IDX, 'main', { ...none, q: '  BOL ' }))).toEqual(['bolt']);
	});

	it('the Legend and battlefield sections ignore the domain chips', () => {
		const chosen = new Set(['fury']);
		expect(slugs(filterCards(searchable, IDX, 'legend', { ...none, chosen, type: 'legend' }))).toEqual(['fox']);
		expect(slugs(filterCards(searchable, IDX, 'battlefields', { ...none, chosen, type: 'battlefield' }))).toEqual(['field']);
	});

	it('domain chips hide off-color cards but never neutral ones', () => {
		expect(slugs(filterCards(searchable, IDX, 'main', { ...none, chosen: new Set(['calm']), type: 'unit' }))).toEqual(['ahri', 'neeko']);
	});
});

describe('useBrowserFilters', () => {
	it('starts on the focused section\'s type, with the Legend\'s colors chosen', () => {
		const { result } = setup('main');
		expect([...result.current.chosen]).toEqual(['calm']);
		expect(slugs(result.current.results)).toEqual(['ahri', 'bolt', 'neeko']); // calm and neutral cards (the calm+mind Legend needs Mind too)
		expect(result.current.activeCount).toBe(1); // the domains
		expect(result.current.filtering).toBe(true);
	});

	it('moving to another section presets its type, and starts from the first step', () => {
		const { result, rerender } = setup('main');
		act(() => result.current.grow(180));
		rerender({ section: 'battlefields' });
		expect(result.current.type).toBe('battlefield');
		expect(result.current.shown).toBe(60);
		expect(result.current.activeCount).toBe(0); // the preset type is not a set filter
	});

	it('the options are limited to what the section accepts, rarities in play order', () => {
		const { result } = setup('main');
		expect(result.current.typeOptions.sort()).toEqual(['spell', 'unit']);
		expect(result.current.rarityOptions).toEqual(['common', 'rare', 'epic']);
	});

	it('toggling a domain chip changes the list; colorless has no chip', () => {
		const { result } = setup('main');
		expect(result.current.filterableDomains.map((d) => d.slug)).toEqual(['calm', 'fury']);
		act(() => result.current.toggleDomain('fury'));
		expect(slugs(result.current.results)).toContain('ember');
		act(() => result.current.toggleDomain('fury'));
		expect(slugs(result.current.results)).not.toContain('ember');
	});

	it('every change starts the list again and tells the browser to scroll up', () => {
		const onChange = vi.fn();
		const { result } = setup('main', onChange);
		act(() => result.current.grow(180));
		act(() => result.current.setQuery('a'));
		expect(result.current.shown).toBe(60);
		expect(onChange).toHaveBeenCalledTimes(1);
		act(() => result.current.setRarity('rare'));
		expect(onChange).toHaveBeenCalledTimes(2);
	});

	it('reset returns to the section\'s preset and clears everything else, domains included', () => {
		const { result } = setup('rune');
		act(() => {
			result.current.setQuery('x');
			result.current.setRarity('rare');
		});
		act(() => result.current.reset());
		expect(result.current.q).toBe('');
		expect(result.current.rarity).toBe('');
		expect(result.current.type).toBe('rune');
		expect(result.current.chosen.size).toBe(0);
	});

	it('resetType goes back to the section\'s own preset only', () => {
		const { result } = setup('main');
		act(() => result.current.setType('unit'));
		expect(result.current.activeCount).toBe(2);
		act(() => result.current.resetType());
		expect(result.current.type).toBe('');
		expect(result.current.activeCount).toBe(1);
	});
});

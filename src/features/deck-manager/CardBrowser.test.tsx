import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profiler, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Deck } from '../../domain/deck.ts';
import type { CardInfo, DeckRuleIndexes } from '../../domain/deck-rules.ts';
import type { GridEntry } from '../../domain/grid-item.ts';
import { CardBrowser, type BrowserActions } from './CardBrowser.tsx';

const info = (types: string[], extra: Partial<CardInfo> = {}): CardInfo => ({
	types,
	superTypes: [],
	domains: ['calm'],
	tags: [],
	maxCopiesOverride: null,
	banned: false,
	...extra,
});

const CARDS: Array<[string, string, string[], string[]]> = [
	['ahri', 'Ahri, Alluring', ['unit'], ['calm']],
	['bolt', 'Bolt', ['spell'], ['calm']],
	['ember', 'Ember', ['spell'], ['fury']],
	['neeko', 'Neeko', ['unit'], ['neutral']],
];

const IDX: DeckRuleIndexes = {
	cards: Object.fromEntries(CARDS.map(([slug, , types, domains]) => [slug, info(types, { domains })])),
	names: Object.fromEntries(CARDS.map(([slug, name]) => [slug, name])),
	championTags: [],
};

const entries: GridEntry[] = CARDS.map(([slug, name, types]) => ({
	slug,
	name,
	meta: '',
	art: null,
	types,
	rarities: ['common'],
	sets: ['OGN'],
	variants: 1,
	text: name,
}));
const searchable = entries.map((entry) => ({ entry, text: entry.text.toLowerCase() }));
const DOMAINS = [
	{ slug: 'calm', label: 'Calm' },
	{ slug: 'fury', label: 'Fury' },
];

const DECK: Deck = {
	id: 'd',
	name: 'Test',
	createdAt: '',
	updatedAt: '',
	schemaVersion: 1,
	legend: [],
	battlefields: [],
	main: [{ card: 'bolt', qty: 2 }],
	rune: [],
	side: [],
};

function actions(): BrowserActions {
	return { clickFace: vi.fn(), plus: vi.fn(), minus: vi.fn(), focusSection: vi.fn(), dragStart: vi.fn(), dragEnd: vi.fn() };
}

function props(overrides: Partial<ComponentProps<typeof CardBrowser>> = {}): ComponentProps<typeof CardBrowser> {
	return {
		deck: DECK,
		shared: false,
		idx: IDX,
		cards: entries,
		searchable,
		domains: DOMAINS,
		legendColors: ['calm'],
		active: 'main',
		actions: actions(),
		totalCopies: 2,
		onShowDeck: () => {},
		...overrides,
	};
}

const faces = () => [...document.querySelectorAll('#bd-list > li[data-slug]')].map((li) => li.getAttribute('data-slug'));

describe('CardBrowser', () => {
	it('shows the focused section\'s card types, within the Legend colors; neutral cards stay', () => {
		render(<CardBrowser {...props()} />);
		// main: units, spells, gear; calm chips preselected hide the fury card, neutral stays
		expect(faces()).toEqual(['ahri', 'bolt', 'neeko']);
		expect(screen.getByText('Showing 3 of 4 cards')).toBeInTheDocument();
	});

	it('the chip says where a card\'s copies are, and Not in the deck otherwise', () => {
		render(<CardBrowser {...props()} />);
		const bolt = document.querySelector('#bd-list li[data-slug="bolt"]')!;
		expect(within(bolt as HTMLElement).getByText('M2')).toHaveAttribute('title', '2 in Main deck');
		const ahri = document.querySelector('#bd-list li[data-slug="ahri"]')!;
		expect(within(ahri as HTMLElement).getByText('—')).toHaveAttribute('title', 'Not in the deck');
	});

	it('search narrows by name or text', async () => {
		render(<CardBrowser {...props()} />);
		await userEvent.type(screen.getByRole('searchbox'), 'bol');
		expect(faces()).toEqual(['bolt']);
		expect(screen.getByText('Showing 1 of 4 cards')).toBeInTheDocument();
	});

	it('toggling a domain chip changes the list, and the Filters badge counts it', async () => {
		render(<CardBrowser {...props()} />);
		const filters = document.getElementById('bd-filters')!;
		await userEvent.click(within(filters).getByRole('button', { name: 'Fury', hidden: true }));
		expect(faces()).toEqual(['ahri', 'bolt', 'ember', 'neeko']);
		expect(document.getElementById('bd-active-domains')).toHaveAttribute('aria-label', 'Filtered to Calm, Fury');
		expect(document.getElementById('bd-filters-badge')).toHaveTextContent('1');
		await userEvent.click(within(filters).getByRole('button', { name: 'Reset', hidden: true }));
		expect(screen.getByText('Showing all 4 cards')).toBeInTheDocument();
	});

	it('the Legend section ignores the domain filter, and its list is legends only', () => {
		render(<CardBrowser {...props({ active: 'legend' })} />);
		expect(faces()).toEqual([]); // no legend cards in this fixture
		expect(screen.getByText('No cards match the filters.')).toBeVisible();
	});

	it('clicks reach the actions: face, plus, minus', async () => {
		const a = actions();
		render(<CardBrowser {...props({ actions: a })} />);
		const bolt = document.querySelector('#bd-list li[data-slug="bolt"]') as HTMLElement;
		await userEvent.click(within(bolt).getByRole('button', { name: 'Add copy to Main deck' }));
		expect(a.plus).toHaveBeenCalledWith('bolt', expect.any(HTMLElement));
		await userEvent.click(within(bolt).getByRole('button', { name: 'Pull copies from Main deck' }));
		expect(a.minus).toHaveBeenCalledWith('bolt', expect.any(HTMLElement));
		await userEvent.click(within(bolt).getByRole('link', { name: 'Bolt' }));
		expect(a.clickFace).toHaveBeenCalledWith('bolt', bolt);
	});

	it('a shared deck is passive: counts only, nothing draggable, no add on click', async () => {
		const a = actions();
		render(<CardBrowser {...props({ shared: true, actions: a })} />);
		expect(screen.queryByRole('button', { name: /Add copy to/ })).toBeNull();
		expect(document.querySelector('#bd-list li[draggable="true"]')).toBeNull();
		await userEvent.click(screen.getByRole('link', { name: 'Bolt' }));
		expect(a.clickFace).not.toHaveBeenCalled();
		expect(screen.getByText('Shared view — save it as your deck to edit, or open any card to read it.')).toBeInTheDocument();
	});

	it('picking a section pill focuses that section', async () => {
		const a = actions();
		render(<CardBrowser {...props({ actions: a })} />);
		await userEvent.click(screen.getByRole('button', { name: 'Runes' }));
		expect(a.focusSection).toHaveBeenCalledWith('rune');
	});

	it('a deck change re-renders only the tile whose copies changed', () => {
		const rendered: string[] = [];
		const onRender = (id: string) => rendered.push(id);
		// Profiler wraps the whole browser; tiles are checked through their DOM identity
		const { rerender } = render(
			<Profiler id="browser" onRender={onRender}>
				<CardBrowser {...props()} />
			</Profiler>,
		);
		const before = new Map(faces().map((slug) => [slug, document.querySelector(`#bd-list li[data-slug="${slug}"] [data-chip-count]`)!.textContent]));
		const nodes = new Map(faces().map((slug) => [slug, document.querySelector(`#bd-list li[data-slug="${slug}"]`)!]));
		const marks = new Map<string, number>();
		// count re-renders of each tile's chip text node by observing DOM mutations
		const observer = new MutationObserver((records) => {
			for (const r of records) {
				const li = (r.target as Element).closest?.('li[data-slug]') ?? (r.target.parentElement?.closest('li[data-slug]') ?? null);
				const slug = li?.getAttribute('data-slug');
				if (slug) marks.set(slug, (marks.get(slug) ?? 0) + 1);
			}
		});
		observer.observe(document.getElementById('bd-list')!, { subtree: true, childList: true, characterData: true, attributes: true });
		rerender(
			<Profiler id="browser" onRender={onRender}>
				<CardBrowser {...props({ deck: { ...DECK, main: [{ card: 'bolt', qty: 3 }] } })} />
			</Profiler>,
		);
		for (const r of observer.takeRecords()) {
			const slug = r.target.parentElement?.closest('li[data-slug]')?.getAttribute('data-slug') ?? (r.target as Element).closest?.('li[data-slug]')?.getAttribute('data-slug');
			if (slug) marks.set(slug, (marks.get(slug) ?? 0) + 1);
		}
		observer.disconnect();
		const after = new Map(faces().map((slug) => [slug, document.querySelector(`#bd-list li[data-slug="${slug}"] [data-chip-count]`)!.textContent]));
		expect(before.get('bolt')).toBe('M2');
		expect(after.get('bolt')).toBe('M3');
		expect(after.get('ahri')).toBe(before.get('ahri'));
		// nothing but the changed tile was touched, and no tile was recreated
		expect([...marks.keys()]).toEqual(['bolt']);
		for (const slug of faces()) expect(document.querySelector(`#bd-list li[data-slug="${slug}"]`)).toBe(nodes.get(slug));
	});
});

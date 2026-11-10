import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Deck } from '../../domain/deck.ts';
import type { CardInfo, DeckRuleIndexes } from '../../domain/deck-rules.ts';
import type { GridEntry } from '../../domain/grid-item.ts';
import { DeckViewer, type ViewerActions } from './DeckViewer.tsx';
import { LegalityChecklist } from './viewer/LegalityChecklist.tsx';

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
		ahri: info(['unit'], { superTypes: ['champion'], tags: ['Ahri'] }),
		bolt: info(['spell']),
		'calm-rune': info(['rune']),
		'mind-rune': info(['rune'], { domains: ['mind'] }),
	},
	names: { fox: 'Nine-Tailed Fox', ahri: 'Ahri, Alluring', bolt: 'Bolt' },
	championTags: ['Ahri'],
};

const entry = (slug: string, name: string): GridEntry => ({ slug, name, meta: '', art: null, types: [], rarities: [], sets: [], variants: 1, text: '' });
const BY_SLUG = new Map([entry('fox', 'Nine-Tailed Fox'), entry('ahri', 'Ahri, Alluring'), entry('bolt', 'Bolt')].map((e) => [e.slug, e]));
const DOMAINS = [
	{ slug: 'calm', label: 'Calm' },
	{ slug: 'mind', label: 'Mind' },
];

const DECK: Deck = {
	id: 'd',
	name: 'Fox',
	createdAt: '',
	updatedAt: '',
	schemaVersion: 1,
	legend: [{ card: 'fox', qty: 1 }],
	battlefields: [],
	main: [
		{ card: 'ahri', qty: 1 },
		{ card: 'bolt', qty: 2 },
	],
	rune: [
		{ card: 'calm-rune', qty: 6 },
		{ card: 'mind-rune', qty: 6 },
	],
	side: [],
	champion: 'ahri',
};

function actions(): ViewerActions {
	return {
		changeQty: vi.fn(),
		removeRow: vi.fn(),
		dropOn: vi.fn(),
		dropChampion: vi.fn(),
		toggleChampionPicking: vi.fn(),
		setRuneRatio: vi.fn(),
		focusSection: vi.fn(),
	};
}

function setup(overrides: Partial<Parameters<typeof DeckViewer>[0]> = {}) {
	const a = actions();
	render(<DeckViewer deck={DECK} shared={false} idx={IDX} bySlug={BY_SLUG} domains={DOMAINS} active="main" championPicking={false} dragging={null} actions={a} {...overrides} />);
	return a;
}

describe('DeckViewer', () => {
	it('the ledger shows each section count against its target and marks the focused one', () => {
		setup();
		const cell = (key: string) => screen.getByRole('group', { name: 'Deck sections' }).querySelector(`[data-ledger-section="${key}"]`)!;
		expect(cell('main')).toHaveTextContent('3/40');
		expect(cell('main')).toHaveAttribute('aria-pressed', 'true');
		expect(cell('rune')).toHaveTextContent('12/12');
		expect(cell('rune')).toHaveAttribute('aria-pressed', 'false');
		expect(cell('legend')).toHaveTextContent('1/1');
	});

	it('a ledger cell focuses its section', async () => {
		const a = setup();
		await userEvent.click(screen.getByRole('group', { name: 'Deck sections' }).querySelector('[data-ledger-section="side"]')!);
		expect(a.focusSection).toHaveBeenCalledWith('side');
	});

	it('steppers change copies of their card in their section', async () => {
		const a = setup();
		await userEvent.click(screen.getByRole('button', { name: 'Add copy of Bolt' }));
		expect(a.changeQty).toHaveBeenCalledWith('main', 'bolt', 1, expect.any(HTMLElement));
		await userEvent.click(screen.getByRole('button', { name: 'Remove copy of Bolt' }));
		expect(a.changeQty).toHaveBeenLastCalledWith('main', 'bolt', -1, expect.any(HTMLElement));
		await userEvent.click(screen.getByRole('button', { name: 'Remove Bolt from Main deck' }));
		expect(a.removeRow).toHaveBeenCalledWith('main', 'bolt');
	});

	it('the champion zone shows the pick with its copies, with no switch button', async () => {
		const a = setup();
		expect(screen.getByText('1 / 3')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /champion/i })).toBeNull();
		await userEvent.click(screen.getByRole('button', { name: 'Remove Ahri, Alluring from the deck' }));
		expect(a.removeRow).toHaveBeenCalledWith('main', 'ahri');
	});

	it('an empty zone offers Select champion, and says it is picking when asked', () => {
		setup({ deck: { ...DECK, champion: undefined }, championPicking: true });
		expect(screen.getByRole('button', { name: 'Picking — click a champion' })).toHaveAttribute('aria-pressed', 'true');
	});

	it('the empty champion slot is the button that starts picking', async () => {
		const a = setup({ deck: { ...DECK, champion: undefined } });
		await userEvent.click(screen.getByRole('button', { name: 'Select champion' }));
		expect(a.toggleChampionPicking).toHaveBeenCalled();
		expect(screen.getByText('0 / ≤ 3')).toBeInTheDocument();
	});

	it('the rune ratio shows each color of the Legend and writes what is typed', async () => {
		const a = setup();
		const calm = screen.getByRole('spinbutton', { name: 'Calm rune count' });
		expect(calm).toHaveValue(6);
		expect(screen.getByRole('spinbutton', { name: 'Mind rune count' })).toHaveValue(6);
		await userEvent.clear(calm);
		await userEvent.type(calm, '8');
		expect(a.setRuneRatio).toHaveBeenLastCalledWith('calm', 8);
	});

	it('a shared deck is read-only: counts only, no steppers, no ratio, no picking', () => {
		setup({ shared: true });
		expect(screen.queryByRole('button', { name: 'Add copy of Bolt' })).toBeNull();
		expect(screen.queryByRole('spinbutton')).toBeNull();
		expect(screen.queryByRole('button', { name: /champion/i })).toBeNull();
		const bolt = document.querySelector('[data-rows="main"] li[data-slug="bolt"]') as HTMLElement;
		expect(within(bolt).getByText('2')).toHaveClass('count-chip');
		expect(screen.queryByRole('button', { name: /^Remove .* from / })).toBeNull();
	});

	it('an empty section says what goes there', () => {
		setup();
		expect(screen.getByText('Up to 10 optional cards.')).toBeInTheDocument();
		expect(screen.getByText('Pick three different battlefields.')).toBeInTheDocument();
	});

	describe('the table group', () => {
		const toggle = () => screen.getByRole('button', { name: /^The table/ });

		it('starts open with the full sections and collapses to a summary', async () => {
			setup();
			expect(toggle()).toHaveAttribute('aria-expanded', 'true');
			expect(document.querySelector('.sheet-table')).not.toBeNull();
			expect(screen.queryByRole('slider')).toBeNull();
			await userEvent.click(toggle());
			expect(toggle()).toHaveAttribute('aria-expanded', 'false');
			expect(document.querySelector('.sheet-table')).toBeNull();
			expect(document.getElementById(toggle().getAttribute('aria-controls')!)).not.toBeNull();
		});

		it('the summary shows the Legend and the Champion at one size, and the battlefield count', async () => {
			setup();
			await userEvent.click(toggle());
			const legend = document.querySelector('[data-summary-card="legend"]')!;
			const champion = document.querySelector('[data-summary-card="champion"]')!;
			expect(legend).toHaveClass('summary-card');
			expect(champion.className).toBe(legend.className);
			expect(within(legend as HTMLElement).getByRole('link', { name: 'Nine-Tailed Fox' })).toBeInTheDocument();
			expect(within(champion as HTMLElement).getByRole('link', { name: 'Ahri, Alluring' })).toBeInTheDocument();
			expect(screen.getByText('0 / 3')).toBeInTheDocument();
		});

		it('the rune slider has one color at each end and rebalances through the ratio action', async () => {
			const a = setup();
			await userEvent.click(toggle());
			const slider = screen.getByRole('slider', { name: 'Rune split: Calm to Mind' });
			expect(slider).toHaveValue('6');
			expect(screen.getByText('Calm 6')).toBeInTheDocument();
			expect(screen.getByText('Mind 6')).toBeInTheDocument();
			fireEvent.change(slider, { target: { value: '8' } });
			expect(a.setRuneRatio).toHaveBeenCalledWith('mind', 4);
			expect(a.setRuneRatio).toHaveBeenCalledWith('calm', 8);
		});

		it('a shared deck summary shows the counts with no slider', async () => {
			setup({ shared: true });
			await userEvent.click(toggle());
			expect(screen.queryByRole('slider')).toBeNull();
			expect(screen.getByText('Calm 6')).toBeInTheDocument();
		});

		it('pressing a ledger tab of a hidden section reopens the table', async () => {
			const a = setup();
			await userEvent.click(toggle());
			await userEvent.click(screen.getByRole('group', { name: 'Deck sections' }).querySelector('[data-ledger-section="rune"]')!);
			expect(a.focusSection).toHaveBeenCalledWith('rune');
			expect(toggle()).toHaveAttribute('aria-expanded', 'true');
			expect(document.querySelector('.sheet-table')).not.toBeNull();
		});

		it('a ledger tab of a section outside the table leaves it collapsed', async () => {
			setup();
			await userEvent.click(toggle());
			await userEvent.click(screen.getByRole('group', { name: 'Deck sections' }).querySelector('[data-ledger-section="side"]')!);
			expect(toggle()).toHaveAttribute('aria-expanded', 'false');
		});
	});

	it('the checklist lists every rule with its status, failures first named', () => {
		render(<LegalityChecklist deck={DECK} idx={IDX} />);
		const list = screen.getByRole('region', { name: 'Deck legality' });
		const items = list.querySelectorAll('li');
		expect(items.length).toBeGreaterThanOrEqual(10);
		expect(list.querySelector('li[data-status="fail"]')).not.toBeNull(); // 3 of 40 main cards
		expect(within(list).getByText('Main deck: exactly 40').closest('li')).toHaveAttribute('data-status', 'fail');
		expect(within(list).getByText('Legend: exactly 1').closest('li')).toHaveAttribute('data-status', 'pass');
	});
});

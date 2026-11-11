import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
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
	{ slug: 'calm', label: 'Calm', icon: '/g/calm.webp' },
	{ slug: 'mind', label: 'Mind', icon: '/g/mind.webp' },
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
	it('a rune dragged onto the Legend section is accepted and dropped on the rune deck', () => {
		const a = setup({ dragging: 'calm-rune' });
		const legend = document.querySelector('[data-section="legend"]')!;
		const over = createEvent.dragOver(legend);
		fireEvent(legend, over);
		expect(over.defaultPrevented).toBe(true);
		expect(legend).toHaveClass('drag-accept');
		fireEvent.drop(legend);
		expect(a.dropOn).toHaveBeenCalledWith('rune', 'calm-rune');
	});

	it('anything else dragged onto the Legend section still follows the Legend rule', () => {
		setup({ dragging: 'bolt' });
		const legend = document.querySelector('[data-section="legend"]')!;
		const over = createEvent.dragOver(legend);
		fireEvent(legend, over);
		expect(over.defaultPrevented).toBe(false);
	});

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

	it('a shared deck is read-only: counts only, no steppers, no ratio, no picking', () => {
		setup({ shared: true });
		expect(screen.queryByRole('button', { name: 'Add copy of Bolt' })).toBeNull();
		expect(screen.queryByRole('slider')).toBeNull();
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

	it('the deck zone is two groups: General info, then Main deck with its cards and the side deck', () => {
		setup();
		const general = screen.getByRole('group', { name: 'General info' });
		const main = screen.getByRole('group', { name: 'Main deck' });
		expect(general.querySelector('[data-section="legend"]')).not.toBeNull();
		// the rune cards live inside the Legend section: there is no Rune deck section
		expect(general.querySelector('[data-section="rune"]')).toBeNull();
		expect(general.querySelector('[data-section="legend"] [data-rows="rune"]')).not.toBeNull();
		expect(general.querySelector('[data-section="battlefields"]')).not.toBeNull();
		expect(main.querySelector('[data-section="main"]')).not.toBeNull();
		expect(main.querySelector('[data-section="side"]')).not.toBeNull();
		expect(general.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	describe('General info', () => {
		const toggle = () => screen.getByRole('button', { name: /^General info/ });

		it('is open by default: Legend and Champion at one size, no counter inputs', () => {
			setup();
			expect(toggle()).toHaveAttribute('aria-expanded', 'true');
			expect(document.getElementById(toggle().getAttribute('aria-controls')!)).toHaveClass('sheet-table');
			const legend = document.querySelector('[data-section="legend"] [data-rows="legend"] > li')!;
			const champion = document.querySelector('[data-champion-face] > [data-slug]')!;
			expect(legend.className).toBe(champion.className); // the same box rules, no per-card cap
			expect(legend.className).not.toMatch(/max-w/);
			expect(screen.queryByRole('spinbutton')).toBeNull();
			expect(document.querySelector('[data-ratio]')).toBeNull();
		});

		it('the slider has each domain emblem and count at its ends, with the rune cards above it in the Legend section', () => {
			setup();
			const slider = screen.getByRole('slider', { name: 'Rune split: Calm to Mind' });
			expect(slider).toHaveValue('6');
			const ends = document.querySelectorAll('[data-rune-slider] [data-slider-end]');
			expect(ends).toHaveLength(2);
			expect(within(ends[0] as HTMLElement).getByRole('img', { name: 'Calm' })).toHaveAttribute('src', '/g/calm.webp');
			expect(within(ends[1] as HTMLElement).getByRole('img', { name: 'Mind' })).toHaveAttribute('src', '/g/mind.webp');
			expect(ends[0]).toHaveTextContent('6');
			// the two rune cards sit with the slider under them, in the Legend section, with the 12 / 12 count
			const bay = document.querySelector('[data-section="legend"] .rune-bay')!;
			expect(bay.contains(slider)).toBe(true);
			expect(bay.querySelectorAll('[data-rows="rune"] > li')).toHaveLength(2);
			expect(bay.querySelector('.rune-cap')).toHaveTextContent('Runes12 / 12');
			expect(bay.querySelector('[data-rows="rune"]')!.compareDocumentPosition(slider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		});

		it('names a domain in text when it has no emblem', () => {
			setup({ domains: [{ slug: 'calm', label: 'Calm', icon: null }, { slug: 'mind', label: 'Mind' }] });
			expect(screen.getByText('Calm')).toBeInTheDocument();
			expect(screen.getByText('Mind')).toBeInTheDocument();
		});

		it('moving the slider rebalances through the ratio action', () => {
			const a = setup();
			fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } });
			expect(a.setRuneRatio).toHaveBeenCalledWith('mind', 4);
			expect(a.setRuneRatio).toHaveBeenCalledWith('calm', 8);
		});

		it('shows the battlefields after (under) the rune slider', () => {
			setup();
			const slider = screen.getByRole('slider');
			const fields = document.querySelector('[data-section="battlefields"]')!;
			expect(slider.compareDocumentPosition(fields) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		});

		it('rolled up it shows a Legend preview, the live slider and the battlefield counter n / 3', async () => {
			const a = setup({ deck: { ...DECK, battlefields: [{ card: 'bolt', qty: 1 }] } });
			await userEvent.click(toggle());
			expect(toggle()).toHaveAttribute('aria-expanded', 'false');
			expect(document.querySelector('.sheet-table')).toBeNull();
			expect(document.getElementById(toggle().getAttribute('aria-controls')!)).not.toBeNull();
			const legend = document.querySelector('[data-summary-card="legend"]') as HTMLElement;
			expect(within(legend).getByRole('link', { name: 'Nine-Tailed Fox' })).toBeInTheDocument();
			expect(document.querySelector('[data-summary-card="champion"]')).toBeNull();
			expect(document.querySelector('[data-battlefield-count]')).toHaveTextContent('Battlefields1 / 3');
			expect(document.querySelectorAll('[data-slider-end] img')).toHaveLength(2);
			fireEvent.change(screen.getByRole('slider', { name: 'Rune split: Calm to Mind' }), { target: { value: '7' } });
			expect(a.setRuneRatio).toHaveBeenCalledWith('calm', 7);
		});

		it('a shared deck rolled up reads out the counts with no slider', async () => {
			setup({ shared: true });
			await userEvent.click(toggle());
			expect(screen.queryByRole('slider')).toBeNull();
			expect(document.querySelectorAll('[data-slider-end]')).toHaveLength(2);
		});

		it('pressing a ledger tab of a hidden section reopens it', async () => {
			const a = setup();
			await userEvent.click(toggle());
			await userEvent.click(screen.getByRole('group', { name: 'Deck sections' }).querySelector('[data-ledger-section="rune"]')!);
			expect(a.focusSection).toHaveBeenCalledWith('rune');
			expect(toggle()).toHaveAttribute('aria-expanded', 'true');
			expect(document.querySelector('.sheet-table')).not.toBeNull();
		});

		it('the Legend section is the focused one while the Runes tab is active', () => {
			setup({ active: 'rune' });
			expect(document.querySelector('[data-section="legend"]')).toHaveAttribute('data-active', 'true');
		});

		it('a ledger tab of a section outside the group leaves it rolled up', async () => {
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

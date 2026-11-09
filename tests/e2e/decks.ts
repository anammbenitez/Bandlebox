// Deck fixtures for the parity suite, built from the real local snapshot with
// the app's own pure rules module, so a fixture called "legal" is legal by the
// same checker the UI runs. Decks are seeded straight into the versioned
// localStorage entry the app reads (deck-store.ts).
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { buildDeckRuleIndexes, validate } from '../../src/domain/deck-rules.ts';
import type { Deck, DeckSlot } from '../../src/domain/deck.ts';

const STORAGE_KEY = 'riftbound-deck-library';

interface IndexCardLike {
	slug: string;
	name: string;
	cardId: string;
	types: string[];
}

const indexData = JSON.parse(readFileSync('data/index.json', 'utf8')) as { cards: IndexCardLike[] };
const snapshotData = JSON.parse(readFileSync('data/catalog.json', 'utf8'));
export const idx = buildDeckRuleIndexes(snapshotData, indexData as never);

export function slugOf(name: string): string {
	const card = indexData.cards.find((c) => c.name === name);
	if (!card) throw new Error(`no card named ${name}`);
	return card.slug;
}

export const LEGEND = slugOf('Nine-Tailed Fox'); // calm + mind, champion tag Ahri
export const LEGEND_NAME = 'Nine-Tailed Fox';
export const CHAMPION = slugOf('Ahri, Alluring'); // calm champion with tag Ahri
export const CHAMPION_NAME = 'Ahri, Alluring';

const pool = indexData.cards
	.map((c) => c.slug)
	.filter((slug) => {
		const info = idx.cards[slug];
		if (!info || slug === LEGEND || slug === CHAMPION) return false;
		if (info.types.some((t) => ['legend', 'rune', 'battlefield'].includes(t))) return false;
		if (!info.types.some((t) => ['unit', 'spell', 'gear'].includes(t))) return false;
		if (info.maxCopiesOverride != null || info.banned) return false;
		if (info.superTypes.includes('signature') || info.superTypes.includes('champion')) return false;
		return info.domains.every((d) => d === 'calm' || d === 'mind');
	});

const battlefields = indexData.cards
	.filter((c) => idx.cards[c.slug]?.types.includes('battlefield') && !idx.cards[c.slug]?.banned)
	.slice(0, 3)
	.map((c) => c.slug);

const slots = (list: string[]): DeckSlot[] => list.map((card) => ({ card, qty: 1 }));

export function emptyDeck(id: string, name: string, legend?: string): Deck {
	return {
		id,
		name,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		schemaVersion: 1,
		legend: legend ? [{ card: legend, qty: 1 }] : [],
		battlefields: [],
		main: [],
		rune: [],
		side: [],
	};
}

/** A complete deck every legality rule passes (checked here, not assumed). */
export function legalDeck(id = 'legal-fixture', name = 'Fox Legal'): Deck {
	const deck: Deck = {
		...emptyDeck(id, name, LEGEND),
		battlefields: slots(battlefields),
		main: [{ card: CHAMPION, qty: 1 }, ...slots(pool.slice(0, 39))],
		rune: [
			{ card: slugOf('Calm Rune'), qty: 6 },
			{ card: slugOf('Mind Rune'), qty: 6 },
		],
		champion: CHAMPION,
	};
	const report = validate(deck, idx);
	if (!report.legal) throw new Error(`legal fixture is not legal: ${JSON.stringify(report.rules.filter((r) => r.status !== 'pass'))}`);
	return deck;
}

/** Writes the decks before any page script runs (first navigation only, so
 *  the app's own later writes are kept across reloads). */
export async function seedDecks(page: Page, decks: Deck[]): Promise<void> {
	await page.addInitScript(
		([key, file]) => {
			if (sessionStorage.getItem('__e2e_seeded')) return;
			sessionStorage.setItem('__e2e_seeded', '1');
			localStorage.clear();
			localStorage.setItem(key, file);
		},
		[STORAGE_KEY, JSON.stringify({ version: 1, decks })] as const,
	);
}

export async function storedDecks(page: Page): Promise<Deck[]> {
	return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{"decks":[]}').decks, STORAGE_KEY);
}

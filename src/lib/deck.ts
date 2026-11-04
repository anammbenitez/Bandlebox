// Deck domain: construction rules, deck shape, and section metadata.
// Client- and Node-safe: no data imports — pages pass in what they have.

/** Riftbound constructed deckbuilding limits (design.md D3). One source of
 *  truth for both the page UI and the legality checker; bump here when the
 *  official rules change. */
export const DECK_RULES = {
	/** Legends in the Legend zone. */
	legends: 1,
	/** Cards in the main deck. */
	mainSize: 40,
	/** Cards in the rune deck. */
	runeSize: 12,
	/** Battlefields, all distinct. */
	battlefieldCount: 3,
	/** Side deck maximum (raised 8 -> 10 by the 2026-07 tournament-rules
	 *  update; re-confirmed at archive time — design.md Open Question). */
	sideLimit: 10,
	/** Copies of any one card name, per deck that carries the cap (main and
	 *  side; the rune deck is uncapped — any ratio of the legend's colors). */
	maxCopies: 3,
} as const;

export const DECK_SCHEMA_VERSION = 1;

/** One section of a deck: distinct cards with their copy counts. */
export interface DeckSlot {
	/** Index card slug (the site's stable card address everywhere else). */
	card: string;
	qty: number;
}

export interface Deck {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	schemaVersion: number;
	legend: DeckSlot[];
	battlefields: DeckSlot[];
	main: DeckSlot[];
	rune: DeckSlot[];
	side: DeckSlot[];
	/** Champion zone pick (spec: decks remember their champion pick): the
	 *  champion-unit slug shown beside the legend. Optional — absent on decks
	 *  stored before the zone existed; copies always live in `main`. */
	champion?: string;
}

export type SectionKey = 'legend' | 'battlefields' | 'main' | 'rune' | 'side';

export const SECTION_KEYS: SectionKey[] = ['legend', 'battlefields', 'main', 'rune', 'side'];

export const SECTION_LABELS: Record<SectionKey, string> = {
	legend: 'Legend',
	battlefields: 'Battlefields',
	main: 'Main deck',
	rune: 'Rune deck',
	side: 'Side deck',
};

export const SECTION_ORDER: Record<SectionKey, number> = {
	legend: 0,
	battlefields: 1,
	main: 2,
	rune: 3,
	side: 4,
};

/** Card types each section accepts (deck-manager: sections accept only the
 *  right card type). 'main' and 'side' share the main-deck-legal types. */
export const SECTION_CARD_TYPES: Record<SectionKey, string[]> = {
	legend: ['legend'],
	battlefields: ['battlefield'],
	rune: ['rune'],
	main: ['unit', 'spell', 'gear'],
	side: ['unit', 'spell', 'gear'],
};

/** A section with an exact required count shows "x / n"; capped sections show "x / ≤ n". */
export function sectionTarget(key: SectionKey): { exact: number | null; cap: number } {
	switch (key) {
		case 'legend':
			return { exact: DECK_RULES.legends, cap: DECK_RULES.legends };
		case 'battlefields':
			return { exact: DECK_RULES.battlefieldCount, cap: DECK_RULES.battlefieldCount };
		case 'main':
			return { exact: DECK_RULES.mainSize, cap: DECK_RULES.mainSize };
		case 'rune':
			return { exact: DECK_RULES.runeSize, cap: DECK_RULES.runeSize };
		case 'side':
			return { exact: null, cap: DECK_RULES.sideLimit };
	}
}

export function sectionTotal(slots: DeckSlot[]): number {
	return slots.reduce((sum, s) => sum + s.qty, 0);
}

export function deckTotalCopies(deck: Deck): number {
	return SECTION_KEYS.reduce((sum, k) => sum + sectionTotal(deck[k]), 0);
}

export function createDeck(name: string, id: string, now: string): Deck {
	return {
		id,
		name: name.trim(),
		createdAt: now,
		updatedAt: now,
		schemaVersion: DECK_SCHEMA_VERSION,
		legend: [],
		battlefields: [],
		main: [],
		rune: [],
		side: [],
	};
}

/** Sum of copies of one card across a section (slugs are unique rows). */
export function qtyOf(slots: DeckSlot[], slug: string): number {
	return slots.find((s) => s.card === slug)?.qty ?? 0;
}

/** Set (or clear at zero) the copy count of a card in a section, returning
 *  the updated slot array. Rows appear at qty 1 and are removed at 0. */
export function setQty(slots: DeckSlot[], slug: string, qty: number): DeckSlot[] {
	const rest = slots.filter((s) => s.card !== slug);
	return qty <= 0 ? rest : [...rest, { card: slug, qty }].sort((a, b) => a.card.localeCompare(b.card));
}

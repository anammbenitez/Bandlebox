// src/domain/card-stats.ts — a card's Might / Energy / Power figures, each paired
// with the symbol it carries inside card text. One place for the derivation so
// the card detail page and the deck manager's card peek cannot disagree
// (spec: card-text-rendering, card text reads the same on every surface).
//
// Pure and data-free (explicit .ts extensions on relative imports, no catalog
// import) so it runs in the browser build, in Astro front matter, and under the
// Vitest alike.

export type StatKind = 'might' | 'energy' | 'power';

export interface CardStat {
	label: string;
	value: number;
	/** Small suffix such as the might bonus ("+1"), or null. */
	note: string | null;
	kind: StatKind;
	/** Card-text markup for the stat's symbol (`:rb_might:`), or null when it has none. */
	symbol: string | null;
}

/** The structural slice of a catalog card record this module reads. */
export interface StatSource {
	might?: number | null;
	mightBonus?: number | null;
	energy?: number | null;
	power?: number | null;
	domains?: string[];
}

/** Domains that have a rune glyph; Power is paid in runes of the card's own color. */
export const RUNE_DOMAINS = ['fury', 'calm', 'mind', 'body', 'chaos', 'order'];

/** Might, Energy, Power in that order, skipping figures the card does not have. */
export function cardStats(card: StatSource): CardStat[] {
	const powerDomain = (card.domains ?? []).find((d) => RUNE_DOMAINS.includes(d));
	const stats: Array<CardStat | null> = [
		card.might != null
			? {
					label: 'Might',
					value: card.might,
					note: card.mightBonus != null ? `+${card.mightBonus}` : null,
					kind: 'might',
					symbol: ':rb_might:',
				}
			: null,
		card.energy != null
			? { label: 'Energy', value: card.energy, note: null, kind: 'energy', symbol: `:rb_energy_${card.energy}:` }
			: null,
		card.power != null
			? { label: 'Power', value: card.power, note: null, kind: 'power', symbol: powerDomain ? `:rb_rune_${powerDomain}:` : null }
			: null,
	];
	return stats.filter((stat): stat is CardStat => stat !== null);
}

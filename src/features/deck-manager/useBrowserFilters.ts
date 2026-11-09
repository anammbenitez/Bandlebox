// The card browser's filters and the list they produce (deck-manager spec):
// search text, type (preset by the focused section), rarity, set, and domain
// chips (the Legend's colors come preselected), plus how many cards are
// revealed. Kept apart from the markup so the rules can be tested without it.
import { useMemo, useState } from 'react';
import { SECTION_CARD_TYPES, type SectionKey } from '../../domain/deck.ts';
import { isLegalEverywhere, type DeckRuleIndexes } from '../../domain/deck-rules.ts';
import { GRID_STEP, type GridEntry } from '../../domain/grid-item.ts';

/** A Colorless card has no color to match: no chip, and never hidden by one. */
export const NOT_A_FILTER: ReadonlySet<string> = new Set(['colorless']);
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'showcase'];

export interface DomainEntry {
	slug: string;
	label?: string;
	/** OpenRift's emblem, or null when refresh cached none. */
	icon?: string | null;
}

/** A section that accepts one card type presets the type filter to it. */
export function presetType(section: SectionKey): string {
	const allowed = SECTION_CARD_TYPES[section];
	return allowed.length === 1 ? allowed[0] : '';
}

/** The legality-aware domain filter applies everywhere except the Legend and
 *  battlefield sections (battlefields may be any color; the Legend must be
 *  replaceable by any other). */
export function domainFilterApplies(section: SectionKey): boolean {
	return section !== 'battlefields' && section !== 'legend';
}

export interface FilterValues {
	q: string;
	type: string;
	rarity: string;
	set: string;
	chosen: ReadonlySet<string>;
}

/** The cards that pass the filters, in catalog order. */
export function filterCards(searchable: Array<{ entry: GridEntry; text: string }>, idx: DeckRuleIndexes, active: SectionKey, f: FilterValues): GridEntry[] {
	const q = f.q.trim().toLowerCase();
	const byDomain = domainFilterApplies(active) && f.chosen.size > 0;
	return searchable
		.filter(({ entry, text }) => {
			if (f.type && !entry.types.includes(f.type)) return false;
			if (f.rarity && !entry.rarities.includes(f.rarity)) return false;
			if (f.set && !entry.sets.includes(f.set)) return false;
			if (q && !entry.name.toLowerCase().includes(q) && !text.includes(q)) return false;
			if (byDomain) {
				const info = idx.cards[entry.slug];
				if (!info) return false; // unknown cards fail the checker anyway
				// neutral-domain cards stay visible under any chip set
				if (!isLegalEverywhere(info) && !info.domains.every((d) => NOT_A_FILTER.has(d) || f.chosen.has(d))) return false;
			}
			return true;
		})
		.map(({ entry }) => entry);
}

export interface BrowserFiltersInput {
	cards: GridEntry[];
	searchable: Array<{ entry: GridEntry; text: string }>;
	idx: DeckRuleIndexes;
	domains: DomainEntry[];
	legendColors: string[];
	active: SectionKey;
	/** Called after any filter change (the browser scrolls back to the top). */
	onChange?: () => void;
}

export function useBrowserFilters({ cards, searchable, idx, domains, legendColors, active, onChange }: BrowserFiltersInput) {
	const [q, setQ] = useState('');
	const [type, setTypeValue] = useState(presetType(active));
	const [typeFor, setTypeFor] = useState(active);
	const [rarity, setRarityValue] = useState('');
	const [set, setSetValue] = useState('');
	const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(legendColors.filter((d) => !NOT_A_FILTER.has(d))));
	const [shown, setShown] = useState(GRID_STEP);

	// A new focused section presets its type and starts the list from the top
	// (adjusting state while rendering, the React way to follow a prop).
	if (typeFor !== active) {
		setTypeFor(active);
		setTypeValue(presetType(active));
		setShown(GRID_STEP);
	}

	/** Every change starts the list again from its first step. */
	const changed = (apply: () => void) => {
		apply();
		setShown(GRID_STEP);
		onChange?.();
	};

	const results = useMemo(() => filterCards(searchable, idx, active, { q, type, rarity, set, chosen }), [searchable, idx, active, q, type, rarity, set, chosen]);

	const typeOptions = useMemo(() => [...new Set(cards.flatMap((e) => e.types))].filter((t) => SECTION_CARD_TYPES[active].includes(t)), [cards, active]);
	const rarityOptions = useMemo(() => {
		const rank = (r: string) => (RARITY_ORDER.indexOf(r) < 0 ? 99 : RARITY_ORDER.indexOf(r));
		return [...new Set(cards.flatMap((e) => e.rarities))].sort((a, b) => rank(a) - rank(b));
	}, [cards]);
	const setOptions = useMemo(() => [...new Set(cards.flatMap((e) => e.sets))].sort(), [cards]);

	const domainApplies = domainFilterApplies(active);
	const filtering = Boolean(q.trim() || type || rarity || set || (active !== 'battlefields' && chosen.size > 0));
	// How many of the dropdown's filters are set: type (when it is not just the
	// section's own preset), rarity, set, and the domains (as one).
	const activeCount = [type && type !== presetType(active), rarity, set, domainApplies && chosen.size > 0].filter(Boolean).length;

	return {
		q,
		type,
		rarity,
		set,
		chosen,
		shown,
		results,
		filtering,
		activeCount,
		domainApplies,
		filterableDomains: domains.filter((d) => !NOT_A_FILTER.has(d.slug)),
		activeDomains: domains.filter((d) => chosen.has(d.slug) && !NOT_A_FILTER.has(d.slug)),
		typeOptions,
		rarityOptions,
		setOptions,
		setQuery: (value: string) => changed(() => setQ(value)),
		setType: (value: string) => changed(() => setTypeValue(value)),
		setRarity: (value: string) => changed(() => setRarityValue(value)),
		setSet: (value: string) => changed(() => setSetValue(value)),
		toggleDomain: (slug: string) =>
			changed(() =>
				setChosen((current) => {
					const next = new Set(current);
					if (next.has(slug)) next.delete(slug);
					else next.add(slug);
					return next;
				}),
			),
		/** Back to the section's own preset type (the focused pill pressed again). */
		resetType: () => changed(() => setTypeValue(presetType(active))),
		reset: () =>
			changed(() => {
				setQ('');
				setRarityValue('');
				setSetValue('');
				setChosen(new Set());
				setTypeValue(presetType(active));
			}),
		/** The list grew (scrolling near its end). */
		grow: setShown,
	};
}

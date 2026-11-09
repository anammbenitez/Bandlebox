// The grid's browsing state and how it maps to the URL (card-catalog-browser
// spec: "The page URL SHALL encode the current search text and each applied
// filter"). Pure, so it is tested without a browser.
import { GRID_STEP, type GridEntry } from '../../domain/grid-item.ts';

export interface GridFilters {
	/** The search box as typed. */
	q: string;
	type: string;
	rarity: string;
	set: string;
}

export const NO_FILTERS: GridFilters = { q: '', type: '', rarity: '', set: '' };

export function isFiltered(f: GridFilters): boolean {
	return Boolean(f.q.trim() || f.type || f.rarity || f.set);
}

/** Lower-cased search text per entry, computed once. */
export interface Searchable {
	entry: GridEntry;
	text: string;
	name: string;
}

export function searchable(entries: GridEntry[]): Searchable[] {
	return entries.map((entry) => ({ entry, text: (entry.text ?? '').toLowerCase(), name: entry.name.toLowerCase() }));
}

export function filterEntries(items: Searchable[], f: GridFilters): GridEntry[] {
	const q = f.q.trim().toLowerCase();
	return items
		.filter(
			({ entry, text, name }) =>
				(!f.type || entry.types.includes(f.type)) &&
				(!f.rarity || entry.rarities.includes(f.rarity)) &&
				(!f.set || entry.sets.includes(f.set)) &&
				(!q || name.includes(q) || text.includes(q)),
		)
		.map(({ entry }) => entry);
}

export function countLabel(shown: number, total: number, filtered: boolean): string {
	const n = (value: number) => value.toLocaleString('en-US');
	return filtered ? `Showing ${n(shown)} of ${n(total)} cards` : `Showing all ${n(total)} cards`;
}

/** Search (`?q=`, lower-cased and trimmed as before), filters, and the reveal
 *  depth (`r`) when more than the first step is showing. */
export function toSearch(f: GridFilters, rendered: number): string {
	const params = new URLSearchParams();
	if (f.type) params.set('type', f.type);
	if (f.rarity) params.set('rarity', f.rarity);
	if (f.set) params.set('set', f.set);
	const q = f.q.trim().toLowerCase();
	if (q) params.set('q', q);
	if (rendered > GRID_STEP) params.set('r', String(rendered));
	return params.size ? `?${params.toString()}` : '';
}

export interface Restored {
	filters: GridFilters;
	/** Reveal depth requested by the URL (0 = none). */
	depth: number;
}

/** Reads the state back from a URL's search string; null when it has none. */
export function fromSearch(search: string): Restored | null {
	const params = new URLSearchParams(search);
	if (params.size === 0) return null;
	return {
		filters: {
			q: params.get('q') ?? '',
			type: params.get('type') ?? '',
			rarity: params.get('rarity') ?? '',
			set: params.get('set') ?? '',
		},
		depth: Number(params.get('r') || '0'),
	};
}

/** How many to show for a requested depth: whole steps, never past the end. */
export function depthFor(requested: number, available: number): number {
	return requested > 0 ? Math.min(Math.ceil(requested / GRID_STEP) * GRID_STEP, available) : Math.min(GRID_STEP, available);
}

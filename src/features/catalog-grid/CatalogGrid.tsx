// The browse page's grid (island, client:load). The first step of tiles is
// rendered at build from props; once the page runs, the full catalog is read
// from the page's JSON payload (design D3: kept as a JSON tag because island
// props would be HTML-escaped and far larger), filtered in memory, revealed
// in fixed steps on scroll, and mirrored into the URL. No network requests
// for card data: it works offline after a refresh.
import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { GRID_STEP, type GridEntry, type GridItemData } from '../../domain/grid-item.ts';
import { PAYLOAD_IDS } from '../../domain/payload-ids.ts';
import { readJsonTag } from '../../ui/hooks/useJsonTag.ts';
import { Button } from '../../ui/atoms/Button.tsx';
import { SelectField, TextField } from '../../ui/atoms/Field.tsx';
import { usePreferredImage } from '../../ui/hooks/usePreferredImage.ts';
import { CardTile } from '../../ui/molecules/CardTile.tsx';
import { EmptyState } from '../../ui/molecules/EmptyState.tsx';
import {
	countLabel,
	depthFor,
	filterEntries,
	fromSearch,
	isFiltered,
	NO_FILTERS,
	searchable,
	toSearch,
	type GridFilters,
	type Restored,
	type Searchable,
} from './grid-state.ts';
import { restoreGridPlace, useGridPlace } from './hooks/useGridPlace.ts';
import { useRevealWindow } from '../../ui/hooks/useRevealWindow.ts';

export interface CatalogGridProps {
	/** The first step of tiles, for the build-time render. */
	initial: GridItemData[];
	total: number;
	types: string[];
	rarities: string[];
	sets: Array<{ slug: string; name: string }>;
}

interface Boot {
	entries: Searchable[];
	restored: Restored | null;
}

const NO_BOOT: Boot = { entries: [], restored: null };
/** One per page: the router keeps this module alive across pages, so a visit
 *  is told apart by its payload tag (a new page brings a new element). */
const bootByPage = new WeakMap<Element, Boot>();

/** The catalog and the URL's state, read once per page (a stable snapshot). */
function readBoot(): Boot {
	const tag = document.getElementById(PAYLOAD_IDS.grid);
	if (!tag) return NO_BOOT;
	let boot = bootByPage.get(tag);
	if (!boot) {
		boot = { entries: searchable(readJsonTag<GridEntry[]>(PAYLOAD_IDS.grid) ?? []), restored: fromSearch(window.location.search) };
		bootByPage.set(tag, boot);
	}
	return boot;
}

const noSubscribe = () => () => {};

/** Its own component so the scroll position never re-renders the grid. */
function BackToTop({ enabled }: { enabled: boolean }) {
	const showTop = useGridPlace(enabled);
	return (
		<Button
			id="grid-top"
			hidden={!showTop}
			aria-label="Back to top"
			className="fixed bottom-6 right-6 z-20 shadow-lg"
			onClick={(event) => {
				// The button hides itself once back within the first screen; hiding a
				// focused element interrupts Chrome's smooth scroll, so let go first.
				event.currentTarget.blur();
				window.scrollTo({ top: 0, behavior: 'smooth' });
			}}
		>
			Back to top
		</Button>
	);
}

/** The grid tile, in the printing's art the visitor chose for the card. */
function PreferredTile(item: GridItemData) {
	const preferred = usePreferredImage(item.slug);
	return <CardTile {...item} art={item.art && preferred ? { ...item.art, imageId: preferred } : item.art} />;
}

export function CatalogGrid({ initial, total, types, rarities, sets }: CatalogGridProps) {
	// Browser-only state (the catalog payload, the URL) arrives right after
	// hydration; the build-time render and the hydration pass see null.
	const boot = useSyncExternalStore(noSubscribe, readBoot, () => null);
	const [edited, setEdited] = useState<GridFilters | null>(null);
	const [grown, setGrown] = useState<number | null>(null);
	const sentinel = useRef<HTMLLIElement>(null);
	const ready = boot !== null;

	const filters = edited ?? boot?.restored?.filters ?? NO_FILTERS;
	const seq = useMemo(() => (boot ? filterEntries(boot.entries, filters) : null), [boot, filters]);
	const available = seq?.length ?? initial.length;
	const shown = grown ?? (boot?.restored && !edited ? depthFor(boot.restored.depth, available) : GRID_STEP);
	const visible: GridItemData[] = seq ? seq.slice(0, shown) : initial;

	// The URL's depth is on screen: go back to the saved offset. Runs before
	// the place starts being saved (useGridPlace's effect comes after).
	useLayoutEffect(() => {
		if (!boot) return;
		if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
		if (boot.restored) restoreGridPlace();
	}, [boot]);

	// Mirror the state into the address (replace, never a new history entry).
	useLayoutEffect(() => {
		if (!ready) return;
		history.replaceState(history.state, '', toSearch(filters, shown) || window.location.pathname);
	}, [ready, filters, shown]);

	const grow = useCallback((next: number) => setGrown(next), []);
	useRevealWindow({ sentinel, enabled: ready, shown, available, grow });

	function change(next: Partial<GridFilters>): void {
		setEdited({ ...filters, ...next });
		setGrown(GRID_STEP);
		window.scrollTo(0, 0); // a filter change reads its first step from the top
	}

	const onSelect = (key: 'type' | 'rarity' | 'set') => (event: ChangeEvent<HTMLSelectElement>) => change({ [key]: event.target.value });
	const clear = () => change(NO_FILTERS);
	const filtered = isFiltered(filters);

	return (
		<>
			<div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
				<TextField
					id="grid-search"
					className="col-span-2 min-w-0 sm:min-w-48 sm:flex-1"
					type="search"
					placeholder="Search name or card text…"
					autoComplete="off"
					value={filters.q}
					onChange={(event) => change({ q: event.target.value })}
				/>
				<SelectField id="grid-type" value={filters.type} onChange={onSelect('type')}>
					<option value="">All types</option>
					{types.map((t) => (
						<option key={t} value={t}>
							{t}
						</option>
					))}
				</SelectField>
				<SelectField id="grid-rarity" value={filters.rarity} onChange={onSelect('rarity')}>
					<option value="">All rarities</option>
					{rarities.map((r) => (
						<option key={r} value={r}>
							{r}
						</option>
					))}
				</SelectField>
				<SelectField id="grid-set" value={filters.set} onChange={onSelect('set')}>
					<option value="">All sets</option>
					{sets.map((s) => (
						<option key={s.slug} value={s.slug}>
							{s.name} ({s.slug})
						</option>
					))}
				</SelectField>
				<Button id="grid-reset" onClick={clear}>
					Reset
				</Button>
			</div>
			<p id="grid-count" className="mt-3 text-xs text-slate-400 tnum" aria-live="polite">
				{countLabel(available, total, filtered && ready)}
			</p>

			<ul id="grid-list" className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{visible.map((item) => (
					<li key={item.slug} data-slug={item.slug}>
						<PreferredTile {...item} />
					</li>
				))}
				<li id="grid-sentinel" ref={sentinel} className="col-span-full" aria-hidden="true" />
			</ul>

			<EmptyState
				id="grid-empty"
				hidden={!ready || available > 0}
				className="mt-8"
				action={
					<Button id="grid-empty-reset" onClick={clear}>
						Clear filters
					</Button>
				}
			>
				No cards match the current filters. Try <em>Reset</em> or shorter search text.
			</EmptyState>

			<BackToTop enabled={ready} />
		</>
	);
}

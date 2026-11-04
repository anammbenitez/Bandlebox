// Grid controller for the browse page: windowed reveal + in-memory filtering.
// The embedded #grid-data payload is the source of truth; the page statically
// renders the first window through the shared grid-item builder and this
// controller reveals further fixed-size steps on scroll — no navigation, no
// card-data network requests, offline-safe after a completed refresh.

import { GRID_STEP, gridItemHtml, type GridItemData } from '../lib/grid-item';

interface GridArt {
	url: string;
	rotate: boolean;
	setSlug: string;
}

interface GridEntry extends GridItemData {
	types: string[];
	rarities: string[];
	sets: string[];
	variants: number;
	text: string;
	art: GridArt | null;
}

interface Filters {
	q: string;
	type: string;
	rarity: string;
	set: string;
}

// sessionStorage key for the last committed scroll position (restore path).
const PLACE_KEY = 'browse-grid-place';

const dataEl = document.getElementById('grid-data');
const listEl = document.getElementById('grid-list');
const sentinelEl = document.getElementById('grid-sentinel');
const countEl = document.getElementById('grid-count');
const emptyEl = document.getElementById('grid-empty');
const topEl = document.getElementById('grid-top');
const searchEl = document.getElementById('grid-search') as HTMLInputElement | null;
const typeEl = document.getElementById('grid-type') as HTMLSelectElement | null;
const rarityEl = document.getElementById('grid-rarity') as HTMLSelectElement | null;
const setEl = document.getElementById('grid-set') as HTMLSelectElement | null;
const resetEl = document.getElementById('grid-reset') as HTMLButtonElement | null;

if (dataEl && listEl && sentinelEl && countEl && emptyEl) {
	const payload: GridEntry[] = JSON.parse(dataEl.textContent ?? '[]') as GridEntry[];
	const entries: GridEntry[] = payload.map((entry) => ({ ...entry, text: (entry.text ?? '').toLowerCase() }));
	const total = entries.length;

	if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

	// The page initially manifests the SSR first window; pool it so reveals,
	// filters, and back-and-forward reuse these built nodes instead of
	// rebuilding what is already constructed.
	const pool = new Map<string, HTMLElement>();
	for (const li of Array.from(listEl.querySelectorAll<HTMLLIElement>('li[data-slug]'))) {
		pool.set(li.dataset.slug ?? '', li);
	}

	let seq: GridEntry[] = [];
	let renderedCount = 0;

	function itemFor(entry: GridEntry): HTMLElement {
		const pooled = pool.get(entry.slug);
		if (pooled) return pooled;
		const tpl = document.createElement('template');
		tpl.innerHTML = gridItemHtml(entry);
		const li = tpl.content.firstElementChild as HTMLElement;
		pool.set(entry.slug, li);
		return li;
	}

	/* --- filtering --- */

	const readFilters = (): Filters => ({
		q: (searchEl?.value ?? '').trim().toLowerCase(),
		type: typeEl?.value ?? '',
		rarity: rarityEl?.value ?? '',
		set: setEl?.value ?? '',
	});

	const matches = (entry: GridEntry, f: Filters): boolean =>
		(!f.type || entry.types.includes(f.type)) &&
		(!f.rarity || entry.rarities.includes(f.rarity)) &&
		(!f.set || entry.sets.includes(f.set)) &&
		(!f.q || entry.name.toLowerCase().includes(f.q) || entry.text.includes(f.q));

	function updateStatus(): void {
		const f = readFilters();
		const matchesCount = seq.length;
		countEl!.textContent = f.q || f.type || f.rarity || f.set
			? `Showing ${matchesCount.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} cards`
			: `Showing all ${total.toLocaleString('en-US')} cards`;
		emptyEl!.hidden = matchesCount > 0;
	}

	/* --- windowing --- */

	/** Materializes the first `count` rows of the current sequence in the DOM
	 *  reusing pooled nodes; anything beyond that detaches. */
	function renderPrefix(count: number, opts: { toTop?: boolean } = {}): void {
		const target = Math.min(Math.max(count, 0), seq.length);
		const keep = new Set(seq.slice(0, target).map((e) => e.slug));
		for (const li of Array.from(listEl!.querySelectorAll<HTMLLIElement>('li[data-slug]'))) {
			if (!keep.has(li.dataset.slug ?? '')) li.remove(); // stays in pool for reuse
		}
		for (let i = 0; i < target; i++) {
			listEl!.insertBefore(itemFor(seq[i]), sentinelEl!); // in-order move, cheap for pooled nodes
		}
		renderedCount = target;
		if (opts.toTop) window.scrollTo(0, 0);
	}

	/* --- reveal-on-scroll driver --- */

	const maybeFill = (): void => {
		// Intersections re-evaluate on every layout shift, so loop while the
		// sentinel is still within one viewport after appending steps.
		let guard = 0;
		while (renderedCount < seq.length && guard < 50) {
			const top = sentinelEl!.getBoundingClientRect().top;
			if (top > window.innerHeight * 2) break;
			renderPrefix(renderedCount + GRID_STEP);
			updateStatus();
			syncUrlSoon();
			guard++;
		}
	};

	const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(maybeFill, { rootMargin: '100% 0px' }) : null;
	if (io) io.observe(sentinelEl!);

	/* --- URL state + back/restore --- */

	function syncUrl(): void {
		const f = readFilters();
		const params = new URLSearchParams();
		if (f.type) params.set('type', f.type);
		if (f.rarity) params.set('rarity', f.rarity);
		if (f.set) params.set('set', f.set);
		if (f.q) params.set('q', f.q);
		if (renderedCount > GRID_STEP) params.set('r', String(renderedCount)); // reveal depth, for restore
		history.replaceState(null, '', params.size ? `?${params.toString()}` : location.pathname);
	}

	let urlPending = false;
	function syncUrlSoon(): void {
		if (urlPending) return;
		urlPending = true;
		requestAnimationFrame(() => {
			urlPending = false;
			syncUrl();
		});
	}

	/** Pre-render restore: filters and reveal depth from the URL, scroll
	 *  offset from sessionStorage — all before scroll restoration. */
	function restoreFromUrl(): boolean {
		const params = new URLSearchParams(location.search);
		if (params.size === 0) return false;
		const q = params.get('q') ?? '';
		if (searchEl) searchEl.value = q;
		if (typeEl) typeEl.value = params.get('type') ?? '';
		if (rarityEl) rarityEl.value = params.get('rarity') ?? '';
		if (setEl) setEl.value = params.get('set') ?? '';
		seq = entries.filter((e) => matches(e, readFilters()));
		updateStatus();

		const r = Number(params.get('r') || '0');
		const target = r > 0 ? Math.min(Math.ceil(r / GRID_STEP) * GRID_STEP, seq.length) : GRID_STEP;
		renderPrefix(target);

		try {
			const place = JSON.parse(sessionStorage.getItem(PLACE_KEY) ?? 'null') as { href: string; y: number } | null;
			if (place && place.href === `${location.pathname}${location.search}`) {
				const maxY = Math.min(place.y, Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
				window.scrollTo(0, maxY);
			}
		} catch {
			// restore data missing/malformed: stay at top
		}
		syncUrl();
		return true;
	}

	/* --- wiring --- */

	function apply(): void {
		const f = readFilters();
		seq = entries.filter((e) => matches(e, f));
		updateStatus();
		renderPrefix(GRID_STEP, { toTop: true }); // a filter change reads its first step from the top
		syncUrl();
	}

	searchEl?.addEventListener('input', apply);
	typeEl?.addEventListener('change', apply);
	rarityEl?.addEventListener('change', apply);
	setEl?.addEventListener('change', apply);

	const clearFilters = (): void => {
		if (searchEl) searchEl.value = '';
		if (typeEl) typeEl.value = '';
		if (rarityEl) rarityEl.value = '';
		if (setEl) setEl.value = '';
		apply();
	};
	resetEl?.addEventListener('click', clearFilters);
	document.getElementById('grid-empty-reset')?.addEventListener('click', clearFilters);

	if (topEl) {
		topEl.addEventListener('click', () => {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		});
	}

	let lastSave = 0;
	function onScroll(): void {
		const y = window.scrollY;
		if (topEl) topEl.hidden = y <= window.innerHeight; // one screenful of scroll shows
		const now = Date.now();
		if (now - lastSave > 150) {
			lastSave = now;
			try {
				sessionStorage.setItem(PLACE_KEY, JSON.stringify({ href: `${location.pathname}${location.search}`, y }));
			} catch {
				// storage unavailable: restore just degrades to top
			}
		}
	}
	window.addEventListener('scroll', onScroll, { passive: true });
	onScroll();

	if (!restoreFromUrl()) {
		seq = entries;
		renderedCount = Math.min(GRID_STEP, total); // matches the SSR first window already in the DOM
		updateStatus();
		maybeFill(); // very tall viewports may need steps revealed immediately
	}
}

// Single source of the grid item `li` markup, shared by the server-rendered
// first window (src/pages/index.astro) and client-side reveals
// (src/scripts/grid-filters.ts). Client-safe: no imports of the JSON data
// files — all card-derived values are passed in precomputed.
//
// The markup reproduces the original static list exactly, so SSR and
// revealed items are indistinguishable.

export interface GridArt {
	url: string;
	rotate: boolean;
	setSlug: string;
}

/** Everything the visible grid item needs (payload entry extends this). */
export interface GridItemData {
	slug: string;
	name: string;
	/** Precomputed "rarity / types" display line. */
	meta: string;
	/** Null for cards without art (placeholder only). */
	art: GridArt | null;
}

/** One reveal step / initial static window. 60 fills whole rows at every
 *  column count the layout uses (2/3/4/5 -> 30/20/15/12 rows). */
export const GRID_STEP = 60;

function esc(text: string): string {
	return text.replace(/[&<>"']/g, (ch) => {
		switch (ch) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '"':
				return '&quot;';
			default:
				return '&#39;';
		}
	});
}

/**
 * Back to plain HTML with escaped text and attribute values. Use SSR
 * (`set:html`) or `template.innerHTML`; both must get this same output.
 */
export function gridItemHtml(item: GridItemData): string {
	const art = item.art;
	const setBadge = (art?.setSlug ?? '').trim();
	const alt = setBadge
		? `${item.name} card art (${setBadge})`
		: `${item.name} card art`;
	const img = art
		? `<img src="${esc(art.url)}" alt="${esc(alt)}" loading="lazy" width="${art.rotate ? 336 : 240}" height="${art.rotate ? 240 : 336}" class="${art.rotate ? 'absolute left-1/2 top-1/2 w-[140%] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90' : 'absolute inset-0 h-full w-full object-cover'}" onerror="this.onerror=null;this.remove()">`
		: '';
	return (
		`<li data-slug="${esc(item.slug)}">` +
		`<a href="/cards/${esc(item.slug)}" class="group block">` +
		`<div class="relative aspect-[5/7] w-full overflow-hidden rounded-md bg-slate-900">` +
		`<div class="absolute inset-0 flex items-center justify-center text-sm text-slate-500">no art</div>` +
		img +
		`</div>` +
		`<div class="mt-2"><div class="font-medium group-hover:text-amber-200">${esc(item.name)}</div>` +
		`<div class="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-400"><span>${esc(item.meta)}</span>` +
		`<span class="whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">${esc(setBadge || '—')}</span></div></div>` +
		`</a></li>`
	);
}

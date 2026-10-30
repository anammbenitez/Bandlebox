// Vanilla-TS filter island for the card grid (no framework, no network).
// Filters operate over the embedded grid-data payload (the derived index in
// memory) and toggle visibility of the server-rendered items — the initial
// list stays the source of truth, filtering only hides/shows entries.

interface GridEntry {
	slug: string;
	name: string;
	types: string[];
	rarities: string[];
	sets: string[];
	variants: number;
	text: string;
}

const dataEl = document.getElementById('grid-data');
const listEl = document.getElementById('grid-list');
const countEl = document.getElementById('grid-count');
const emptyEl = document.getElementById('grid-empty');
const searchEl = document.getElementById('grid-search') as HTMLInputElement | null;
const typeEl = document.getElementById('grid-type') as HTMLSelectElement | null;
const rarityEl = document.getElementById('grid-rarity') as HTMLSelectElement | null;
const setEl = document.getElementById('grid-set') as HTMLSelectElement | null;
const resetEl = document.getElementById('grid-reset') as HTMLButtonElement | null;

if (dataEl && listEl && countEl && emptyEl) {
	const payload: GridEntry[] = JSON.parse(dataEl.textContent ?? '[]') as GridEntry[];
	const bySlug = new Map<string, GridEntry>();
	for (const entry of payload) bySlug.set(entry.slug, { ...entry, text: (entry.text ?? '').toLowerCase() });

	const items = Array.from(listEl.querySelectorAll<HTMLLIElement>('li[data-slug]'));
	const total = items.length;

	const apply = () => {
		const query = (searchEl?.value ?? '').trim().toLowerCase();
		const type = typeEl?.value ?? '';
		const rarity = rarityEl?.value ?? '';
		const set = setEl?.value ?? '';
		const anyFilter = Boolean(query || type || rarity || set);

		let visible = 0;
		for (const item of items) {
			const entry = bySlug.get(item.dataset.slug ?? '');
			if (!entry) continue;
			const match =
				(!type || entry.types.includes(type)) &&
				(!rarity || entry.rarities.includes(rarity)) &&
				(!set || entry.sets.includes(set)) &&
				(!query || entry.name.toLowerCase().includes(query) || entry.text.includes(query));
			item.classList.toggle('hidden', !match);
			if (match) visible++;
		}

		countEl.textContent = anyFilter
			? `Showing ${visible.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} cards`
			: `Showing all ${total.toLocaleString('en-US')} cards`;
		emptyEl.classList.toggle('hidden', visible > 0);
	};

	searchEl?.addEventListener('input', apply);
	typeEl?.addEventListener('change', apply);
	rarityEl?.addEventListener('change', apply);
	setEl?.addEventListener('change', apply);

	resetEl?.addEventListener('click', () => {
		if (searchEl) searchEl.value = '';
		if (typeEl) typeEl.value = '';
		if (rarityEl) rarityEl.value = '';
		if (setEl) setEl.value = '';
		apply();
	});

	apply();
}

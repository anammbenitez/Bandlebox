// Deck tile grid controller (src/pages/decks/index.astro): Legend-art tiles
// with live legality badges, a deck-sized create tile, and the creation
// modal (Legend + name). State changes still go exclusively through
// deck-store so the manager page and this grid never disagree.

import { DECK_RULES, sectionTotal, type Deck } from '../lib/deck';
import { validate, type DeckRuleIndexes } from '../lib/deck-rules';
import { addDeck, listDecks, removeDeck, renameDeck, takeStorageProblem } from '../lib/deck-store';

interface LegendEntry {
	slug: string;
	name: string;
	url: string | null;
	rotate: boolean;
}

const readJson = <T,>(id: string): T => JSON.parse(document.getElementById(id)?.textContent ?? 'null') as T;

const ruleIndexes: DeckRuleIndexes = readJson('deck-rules-data');
const legends: LegendEntry[] = readJson('deck-legends-data');
const legendBySlug = new Map(legends.map((l) => [l.slug, l]));

const gridEl = document.getElementById('deck-grid') as HTMLUListElement;
const emptyEl = document.getElementById('deck-empty')!;
const warnEl = document.getElementById('deck-storage-warning');

const modalEl = document.getElementById('deck-create-modal') as HTMLElement;
const legendListEl = document.getElementById('modal-legend-list') as HTMLUListElement;
const legendSearchEl = document.getElementById('modal-legend-search') as HTMLInputElement;
const modalSelectedEl = document.getElementById('modal-selected') as HTMLElement;
const modalNameEl = document.getElementById('modal-name') as HTMLInputElement;
const modalAcceptEl = document.getElementById('modal-accept') as HTMLButtonElement;
const modalCancelEl = document.getElementById('modal-cancel') as HTMLButtonElement;

function esc(text: string): string {
	return text.replace(/[&<>"']/g, (ch) =>
		ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '"' ? '&quot;' : '&#39;',
	);
}

function isLegal(deck: Deck): boolean {
	return validate(deck, ruleIndexes).legal;
}

const SHORT = { legend: 'L', battlefields: 'B', main: 'M', rune: 'R', side: 'S' } as const;

function cardCount(deck: Deck): string {
	return `Main ${sectionTotal(deck.main)}/${DECK_RULES.mainSize} · Rune ${sectionTotal(deck.rune)}/${DECK_RULES.runeSize}`;
}

function badgeHtml(deck: Deck): string {
	const legal = isLegal(deck);
	const cls = legal
		? 'border-emerald-400/60 bg-slate-950/80 text-emerald-300'
		: 'border-red-400/60 bg-slate-950/80 text-red-300';
	return `<span class="absolute right-1.5 top-1.5 z-10 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}">${legal ? 'Legal ✓' : 'Not legal'}</span>`;
}

// interaction state on tiles: rename / delete confirmation / name editing
const interactState = new Map<string, 'confirm'>();

function coverHtml(deck: Deck): string {
	const legendSlug = deck.legend[0]?.card;
	const legend = legendBySlug.get(legendSlug ?? '');
	if (!legend?.url) {
		return '<span class="absolute inset-0 grid place-items-center text-center text-[11px] text-slate-500">no legend chosen</span>';
	}
	const extras = [
		`<strong>${esc(legend.name)}</strong>`,
		esc(cardCount(deck)),
		`updated ${esc(new Date(deck.updatedAt).toLocaleDateString())}`,
	].filter(Boolean);
	return (
		`<img src="${esc(legend.url)}" alt="Legend art for ${esc(legend.name)}" loading="lazy"` +
		` class="h-full w-full rounded-md object-cover transition group-hover:opacity-90" onerror="this.remove()">` +
		`<div class="absolute inset-x-0 bottom-0 border-t border-slate-800 bg-slate-950/85 px-2 py-1">` +
		`<span class="block truncate text-xs font-semibold text-slate-100">${extras[0]}</span>` +
		`<span class="block text-[10px] text-slate-400">${extras[1]} · ${extras[2]}</span>` +
		`</div>`
	);
}

function deckTileHtml(deck: Deck, confirming: boolean): string {
	const actions = confirming		? `<span class="absolute left-1.5 top-1.5 z-10 flex flex-col gap-1 text-[10px]">
				<button type="button" data-deck-confirm class="rounded bg-red-500/90 px-2 py-1 font-semibold text-white hover:bg-red-400">Delete — sure?</button>
				<button type="button" data-deck-cancel class="rounded border border-slate-600 bg-slate-950/80 px-2 py-1 text-slate-200 hover:border-slate-400">No</button>
			</span>`
		: `<span class="absolute top-1.5 left-1.5 z-10 flex gap-1 text-[10px] opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
				<button type="button" data-deck-rename class="rounded border border-slate-600 bg-slate-950/80 px-1.5 py-0.5 text-slate-200 hover:border-amber-400/60 hover:text-amber-200">Rename</button>
				<button type="button" data-deck-delete class="rounded border border-slate-600 bg-slate-950/80 px-1.5 py-0.5 text-slate-200 hover:border-red-400/60 hover:text-red-300">Delete</button>
			</span>`;
	return (
		`<li data-id="${esc(deck.id)}" data-tile class="group relative aspect-square overflow-hidden rounded-md border border-slate-800 bg-slate-900 hover:border-amber-400/40">` +
		badgeHtml(deck) +
		actions +
		`<a href="/decks/build#d/${esc(deck.id)}" aria-label="Open ${esc(deck.name)}" class="absolute inset-0">${coverHtml(deck)}</a>` +
		`</li>`
	);
}

function createTileHtml(): string {
	return (
		`<li class="relative aspect-square overflow-hidden rounded-md border border-dashed border-amber-400/40 bg-slate-900 hover:border-amber-400/80">` +
		`<button id="open-create-modal" type="button" aria-label="Create a new deck"` +
		` class="grid h-full w-full place-items-center rounded-md text-amber-300/80 hover:text-amber-200">` +
		`<span class="text-4xl font-light">+</span>` +
		`</button></li>`
	);
}

function render(): void {
	const decks = listDecks();
	gridEl.innerHTML = createTileHtml() + decks.map((d) => deckTileHtml(d, interactState.get(d.id) === 'confirm')).join('');
	emptyEl.hidden = decks.length > 0;
}

/* --- tile actions: rename via prompt, delete via in-place confirm --- */

gridEl.addEventListener('click', (event) => {
	const target = event.target as HTMLElement;
	if (target.closest('#open-create-modal')) {
		openModal();
		return;
	}
	const item = target.closest('li[data-id]') as HTMLElement | null;
	if (!item) return;
	const id = item.dataset.id ?? '';
	const deck = listDecks().find((d) => d.id === id);
	if (!deck) return;

	if (target.closest('[data-deck-rename]')) {
		const next = window.prompt('Rename deck', deck.name)?.trim();
		if (next) renameDeck(id, next);
		render();
		return;
	}
	if (target.closest('[data-deck-delete]')) {
		interactState.set(id, 'confirm');
		render();
		return;
	}
	if (target.closest('[data-deck-confirm]')) {
		interactState.delete(id);
		removeDeck(id);
		render();
		return;
	}
	if (target.closest('[data-deck-cancel]')) {
		interactState.delete(id);
		render();
		return;
	}
});

/* --- creation modal: legend picker + name, both required --- */

let selectedLegend: LegendEntry | null = null;

function legendMatches(entry: LegendEntry, q: string): boolean {
	return !q || entry.name.toLowerCase().includes(q) || entry.slug.includes(q);
}

function renderLegendList(): void {
	const q = legendSearchEl.value.trim().toLowerCase();
	legendListEl.innerHTML = legends
		.filter((entry) => legendMatches(entry, q))
		.slice(0, 48)
		.map(
			(entry) =>
				`<li>` +
				`<button type="button" data-legend-pick="${esc(entry.slug)}" aria-pressed="${selectedLegend?.slug === entry.slug}"` +
				` class="relative block w-full aspect-[5/7] overflow-hidden rounded border ${selectedLegend?.slug === entry.slug ? 'border-amber-400' : 'border-slate-700'} bg-slate-950 hover:border-amber-400/70">` +
				(entry.url
					? `<img src="${esc(entry.url)}" alt="" loading="lazy" class="h-full w-full object-cover" onerror="this.remove()">`
					: `<span class="grid h-full place-items-center text-slate-600">—</span>`) +
				`<span class="absolute inset-x-0 bottom-0 truncate bg-slate-950/80 px-1 py-0.5 text-[9px] text-slate-200">${esc(entry.name)}</span>` +
				`</button></li>`,
		)
		.join('');
}

function updateModalState(): void {
	modalSelectedEl.hidden = !selectedLegend;
	if (selectedLegend) modalSelectedEl.textContent = `Legend: ${selectedLegend.name}`;
	modalAcceptEl.disabled = !selectedLegend || modalNameEl.value.trim().length === 0;
	document.querySelectorAll('[data-legend-pick]').forEach((el) => {
		const pick = el as HTMLElement;
		const active = pick.dataset.legendPick === selectedLegend?.slug;
		pick.setAttribute('aria-pressed', String(active));
		pick.className = `relative block w-full aspect-[5/7] overflow-hidden rounded border ${active ? 'border-amber-400' : 'border-slate-700'} bg-slate-950 hover:border-amber-400/70`;
	});
}

function openModal(): void {
	selectedLegend = null;
	modalNameEl.value = '';
	legendSearchEl.value = '';
	modalEl.hidden = false;
	updateModalState();
	renderLegendList();
	legendSearchEl.focus();
}

function closeModal(): void {
	// Cancel reverts: nothing written, nothing kept.
	selectedLegend = null;
	modalEl.hidden = true;
}

legendListEl.addEventListener('click', (event) => {
	const pick = (event.target as HTMLElement).closest('button[data-legend-pick]') as HTMLElement | null;
	if (!pick) return;
	const slug = pick.dataset.legendPick ?? '';
	selectedLegend = legendBySlug.get(slug) ?? null;
	updateModalState();
	renderLegendList();
});

legendSearchEl.addEventListener('input', renderLegendList);
modalNameEl.addEventListener('input', updateModalState);
modalCancelEl.addEventListener('click', closeModal);
modalEl.addEventListener('click', (event) => {
	if (event.target === modalEl) closeModal(); // backdrop click
});
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !modalEl.hidden) closeModal();
});

modalAcceptEl.addEventListener('click', () => {
	const name = modalNameEl.value.trim();
	if (!name || !selectedLegend) return; // both required (button disabled too)
	const deck = addDeck(name, selectedLegend.slug);
	closeModal();
	location.href = `/decks/build#d/${deck.id}`;
});

/* --- go --- */

if (takeStorageProblem() && warnEl) warnEl.hidden = false;
render();

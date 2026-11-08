// Deck tile grid controller (src/pages/decks/index.astro): Legend-art tiles
// with live legality badges, a deck-sized create tile, and the creation
// modal (Legend + name). State changes still go exclusively through
// deck-store so the manager page and this grid never disagree.

import { imgAttrs } from '../lib/card-image';
import { DECK_RULES, sectionTotal, type Deck } from '../lib/deck';
import { validate, type DeckRuleIndexes } from '../lib/deck-rules';
import { addDeck, listDecks, removeDeck, renameDeck, takeStorageProblem } from '../lib/deck-store';

interface LegendEntry {
	slug: string;
	name: string;
	/** OpenRift image id; covers use the `tile` role, the picker the `thumb` role. */
	imageId: string | null;
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
	return `<span class="deck-badge" data-legal="${legal}"><i class="dot"></i>${legal ? 'Legal' : 'Not legal'}</span>`;
}

// interaction state on tiles: rename / delete confirmation / name editing
const interactState = new Map<string, 'confirm'>();

/** Tile face: the deck's Legend art, cropped to the card's 5:7 face. */
function coverHtml(deck: Deck): string {
	const legendSlug = deck.legend[0]?.card;
	const legend = legendBySlug.get(legendSlug ?? '');
	const art = legend?.imageId ? imgAttrs(legend.imageId, 'tile') : null;
	return legend && art
		? `<img src="${esc(art.src)}" alt="Legend art for ${esc(legend.name)}" loading="lazy"` +
				` class="h-full w-full object-cover" onerror="${esc(art.onerror)}">`
		: '<span class="absolute inset-0 grid place-items-center px-2 text-center text-[11px] text-slate-500">no legend chosen</span>';
}

function deckTileHtml(deck: Deck, confirming: boolean): string {
	const actions = confirming
		? `<span class="absolute left-1.5 top-1.5 z-10 flex flex-col items-start gap-1">
				<button type="button" data-deck-confirm class="tile-action" data-variant="danger">Delete — sure?</button>
				<button type="button" data-deck-cancel class="tile-action">Keep</button>
			</span>`
		: `<span class="absolute top-1.5 left-1.5 z-10 flex max-w-[calc(100%-5.5rem)] flex-wrap gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
				<button type="button" data-deck-rename class="tile-action">Rename</button>
				<button type="button" data-deck-delete class="tile-action">Delete</button>
			</span>`;
	return (
		`<li data-id="${esc(deck.id)}" data-tile class="dt-item group" data-tilt title="${esc(deck.name)} · updated ${esc(new Date(deck.updatedAt).toLocaleDateString())}">` +
		badgeHtml(deck) +
		actions +
		`<a href="/decks/build#d/${esc(deck.id)}" aria-label="Open ${esc(deck.name)}" class="dt-face" data-tilt-face>${coverHtml(deck)}</a>` +
		`<div class="dt-label">` +
		`<span class="dt-name">${esc(deck.name)}</span>` +
		`<span class="dt-counts tnum">${esc(cardCount(deck))}</span>` +
		`</div>` +
		`</li>`
	);
}

function createTileHtml(): string {
	return (
		`<li class="dt-item">` +
		`<div class="dt-face" data-empty>` +
		`<button id="open-create-modal" type="button" aria-label="Create a new deck" class="create-tile">` +
		`<span class="create-tile-icon">` +
		`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">` +
		`<path d="M7 2.5v9M2.5 7h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>` +
		`</svg></span>` +
		`</button></div>` +
		`<div class="dt-label"><span class="dt-name">New deck</span></div>` +
		`</li>`
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

/** Picker thumbnails are small, so they take the `thumb` role (240w). */
function pickerImgHtml(imageId: string): string {
	const art = imgAttrs(imageId, 'thumb');
	return `<img src="${esc(art.src)}" alt="" loading="lazy" class="h-full w-full object-cover" onerror="${esc(art.onerror)}">`;
}

function renderLegendList(): void {
	const q = legendSearchEl.value.trim().toLowerCase();
	const found = legends.filter((entry) => legendMatches(entry, q));
	legendListEl.innerHTML = found.length
		? found
				.slice(0, 48)
				.map(
					(entry) =>
						`<li>` +
						`<button type="button" data-legend-pick="${esc(entry.slug)}" aria-pressed="${selectedLegend?.slug === entry.slug}"` +
						` class="legend-pick">` +
						(entry.imageId
							? pickerImgHtml(entry.imageId)
							: `<span class="grid h-full place-items-center text-slate-600">—</span>`) +
						`<span class="legend-pick-label truncate">${esc(entry.name)}</span>` +
						`</button></li>`,
				)
				.join('')
		: `<li class="col-span-full py-3 text-center text-xs text-slate-500">No legends match that search.</li>`;
}

function updateModalState(): void {
	modalSelectedEl.hidden = !selectedLegend;
	if (selectedLegend) modalSelectedEl.textContent = `Legend: ${selectedLegend.name}`;
	modalAcceptEl.disabled = !selectedLegend || modalNameEl.value.trim().length === 0;
	document.querySelectorAll('[data-legend-pick]').forEach((el) => {
		const pick = el as HTMLElement;
		pick.setAttribute('aria-pressed', String(pick.dataset.legendPick === selectedLegend?.slug));
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
	document.getElementById('open-create-modal')?.focus();
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

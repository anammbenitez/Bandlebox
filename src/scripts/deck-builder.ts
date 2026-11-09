// Deck manager controller (src/pages/decks/build.astro): deck state, section
// rows, the card browser (art-only card impressions, pill/domain filters,
// drag-and-drop, copy chips), the rune ratio writer, the live legality
// checklist, and share. Storage decisions live in deck-store so page state
// and saved state never diverge (spec: deck-library).
//
// Hash contract: #d/<id> = a saved deck from deck-store; #s/<payload> = a
// shared deck, opened as view+copy (design.md non-goal: no in-place editing
// of shared decks). Anything else shows the hint to create a deck first.

import { imgAttrs } from '../lib/card-image';
import { GRID_STEP, type GridArt } from '../lib/grid-item';
import {
	cleanDeckName,
	DECK_RULES,
	qtyOf,
	type Deck,
	type SectionKey,
	SECTION_CARD_TYPES,
	SECTION_KEYS,
	SECTION_LABELS,
	sectionTotal,
	setQty,
} from '../lib/deck';
import { cardPageHref } from '../lib/deck-return';
import { adoptDeck, getDeck, saveDeck, takeStorageProblem } from '../lib/deck-store';
import { buildDeckRuleIndexes, isLegalEverywhere, validate, type DeckRuleIndexes, type LegalityReport } from '../lib/deck-rules';
import { decodeDeck, encodeDeck, hashToPayload, isSharePayload } from '../lib/deck-share';
import { initCardPeek } from './card-peek';

// --- payload programs -------------------------------------------------------

interface GridEntry {
	slug: string;
	name: string;
	types: string[];
	rarities: string[];
	sets: string[];
	text: string;
	meta: string;
	art: GridArt | null;
}
interface DomainEntry {
	slug: string;
	label?: string;
	/** OpenRift's emblem for the domain, or null when the refresh did not cache one. */
	icon?: string | null;
}

const readJson = <T,>(id: string): T => JSON.parse(document.getElementById(id)?.textContent ?? 'null') as T;

const cards: GridEntry[] = readJson('deck-card-data');
const idx: DeckRuleIndexes = readJson('deck-rules-data');
const domains: DomainEntry[] = (readJson('deck-domains-data') ?? []) as DomainEntry[];
const bySlug = new Map(cards.map((entry) => [entry.slug, entry]));
const searchable = cards.map((entry) => ({ entry, text: entry.text.toLowerCase() }));

// --- element handles --------------------------------------------------------

const nameTextEl = document.getElementById('deck-name-text')!;
const nameFieldEl = document.getElementById('deck-name-field')!;
const nameInput = document.getElementById('deck-name-input') as HTMLInputElement;
const metaEl = document.getElementById('deck-meta')!;
const verdictEl = document.getElementById('deck-verdict')!;
const renameBtn = document.getElementById('deck-rename') as HTMLButtonElement;
const shareBtn = document.getElementById('deck-share') as HTMLButtonElement;
const saveSharedBtn = document.getElementById('deck-save-shared') as HTMLButtonElement;
const actionsEl = document.getElementById('deck-actions')!;
const storageWarnEl = document.getElementById('deck-storage-warning')!;
const unknownWarnEl = document.getElementById('deck-unknown-warning')!;
const missingEl = document.getElementById('deck-missing')!;
const brokenEl = document.getElementById('deck-broken-share')!;
const appEl = document.getElementById('deck-app')!;

const searchEl = document.getElementById('bd-search') as HTMLInputElement;
const typeEl = document.getElementById('bd-type') as HTMLSelectElement;
const rarityEl = document.getElementById('bd-rarity') as HTMLSelectElement;
const setEl = document.getElementById('bd-set') as HTMLSelectElement;
const resetEl = document.getElementById('bd-reset') as HTMLButtonElement;
const pillsEl = document.getElementById('bd-pills') as HTMLDivElement;
const domainsEl = document.getElementById('bd-domains') as HTMLDivElement;
const domainGroupEl = document.getElementById('bd-domain-group')!;
// the filter dropdown: a native popover under the "Filters" button
const filtersBtn = document.getElementById('bd-filters-btn') as HTMLButtonElement;
const filtersPop = document.getElementById('bd-filters') as HTMLElement;
const filtersBadgeEl = document.getElementById('bd-filters-badge')!;
const filtersCountEl = document.getElementById('bd-filters-count')!;
const activeDomainsEl = document.getElementById('bd-active-domains')!;
const listEl = document.getElementById('bd-list') as HTMLUListElement;
const sentinelEl = document.getElementById('bd-sentinel')!;
const countEl = document.getElementById('bd-count')!;
const emptyEl = document.getElementById('bd-empty')!;
const checklistEl = document.getElementById('deck-checklist') as HTMLUListElement;

// --- deck chrome ------------------------------------------------------------
// The deck page is a viewport-height shell (see pages/decks/build.astro), so
// the name/meta/actions bar never scrolls away and needs no measured offset.

function esc(text: string): string {
	return text.replace(/[&<>"']/g, (ch) =>
		ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '"' ? '&quot;' : '&#39;',
	);
}

// --- deck state -------------------------------------------------------------

let deck: Deck | null = null;
let shared = false;
let activeSection: SectionKey = 'main';
const selectedDomains = new Set<string>();

/** Domains that are not something to filter by: a Colorless card has no color
 *  to match, so it has no chip and a chip set never hides it (the way a Neutral
 *  card is never hidden either). */
const NOT_A_FILTER: ReadonlySet<string> = new Set(['colorless']);

/** Riftbound domain palette (fury red, chaos purple, mind blue, calm green,
 *  body orange, order yellow) — the rune ratio inputs carry their color as
 *  a left edge instead of a text name. */
const DOMAIN_COLORS: Record<string, string> = {
	fury: '#ef4444',
	chaos: '#a855f7',
	mind: '#3b82f6',
	calm: '#22c55e',
	body: '#f97316',
	order: '#eab308',
};

// The hover card on every card face (spec: card-peek). It shows the card alone,
// but must be told when the deck is rebuilt: the faces are replaced under a
// resting pointer, and it must not reopen on them until the pointer moves.
const peek = initCardPeek({ root: appEl });

const copyLimit = (slug: string): number => idx.cards[slug]?.maxCopiesOverride ?? DECK_RULES.maxCopies;

function isKnown(slug: string): boolean {
	return Boolean(idx.cards[slug]);
}

function typeAllowed(section: SectionKey, types: string[] | undefined): boolean {
	if (!types) return false;
	return types.some((t) => SECTION_CARD_TYPES[section].includes(t));
}

function legendDomains(): string[] | null {
	const legendSlug = deck?.legend[0]?.card;
	return legendSlug ? idx.cards[legendSlug]?.domains ?? null : null;
}

function loadDeckFromHash(): void {
	const hash = location.hash;
	if (isSharePayload(hash)) {
		void (async () => {
			try {
				const { deck: fromShare, broken } = await decodeDeck(hashToPayload(hash));
				if (broken) {
					brokenEl.hidden = false;
					appEl.hidden = true;
					return;
				}
				deck = fromShare;
				shared = true;
				bootDeck();
			} catch (err) {
				console.warn('shared deck failed to open', err);
				brokenEl.hidden = false;
				appEl.hidden = true;
			}
		})();
		return;
	}
	const ownMatch = /^#d\/(.+)$/.exec(hash);
	if (ownMatch) {
		const found = getDeck(ownMatch[1]);
		if (!found) {
			missingEl.hidden = false;
			appEl.hidden = true;
			return;
		}
		deck = found;
		shared = false;
		bootDeck();
		return;
	}
	showTitle('Deck manager');
	setTitleEditable(false);
	metaEl.textContent =
		'Open a deck from your deck list, or create one there first — decks always live in your browser.';
	const noneEl = document.getElementById('deck-none');
	if (noneEl) noneEl.hidden = false;
	appEl.hidden = true;
}

/** Default rune deck (spec: written color ratios): a fresh empty rune deck
 *  with a chosen Legend starts split evenly across its colors — 6 and 6 for
 *  two-color Legends. Existing runes are never clobbered. */
function seedDefaultRunes(): void {
	if (!deck || shared) return;
	if (deck.rune.length > 0) return;
	const colors = legendDomains() ?? [];
	if (colors.length === 0) return;
	const per = Math.floor(DECK_RULES.runeSize / Math.max(1, colors.length));
	const leftovers = DECK_RULES.runeSize - per * colors.length;
	const targets = colors.map((domain, i) => [domain, per + (i < leftovers ? 1 : 0)] as const);
	if (targets.every(([, target]) => target <= 0)) return;
	mutate((d) => {
		for (const [domain, target] of targets) {
			const canonical = `${domain}-rune`;
			if (isKnown(canonical)) d.rune = setQty(d.rune, canonical, target);
		}
	});
}

function bootDeck(): void {
	showTitle(deck?.name || 'Deck');
	actionsEl.hidden = false;
	shareBtn.hidden = shared;
	// a shared deck is read-only: a title that looked editable would silently
	// do nothing, so it is plain text there and Rename is hidden with it
	setTitleEditable(!shared);
	saveSharedBtn.hidden = !shared;
	const warning = shared ? null : takeStorageProblem();
	if (warning && storageWarnEl) {
		storageWarnEl.hidden = false;
		storageWarnEl.textContent = warning;
	}
	renderHint();
	// domain chips seed from the Legend's colors (once per opened deck)
	selectedDomains.clear();
	for (const domain of legendDomains() ?? []) if (!NOT_A_FILTER.has(domain)) selectedDomains.add(domain);
	renderUnknownWarning();
	seedDefaultRunes();
	renderDomains();
	renderRatio();
	renderSections();
	renderCounts();
	renderChecklist();
	renderChampion();
	focusSection('main'); // builds filter options + first window
}

function renderUnknownWarning(): void {
	if (!deck) return;
	const names = SECTION_KEYS.flatMap((k) => deck![k].map((s) => s.card))
		.filter((slug) => !isKnown(slug))
		.map((slug) => bySlug.get(slug)?.name ?? slug)
		.filter((n, i, all) => all.indexOf(n) === i);
	unknownWarnEl.hidden = names.length === 0;
	if (names.length) {
		unknownWarnEl.textContent =
			`${names.length} card${names.length > 1 ? 's' : ''} in this deck are not in the local snapshot ` +
			`(shared link against different data?): ${names.join(', ')}. The deck still opens — fix or remove these cards` +
			(shared ? ' after saving it as your deck.' : ' to make it legal.');
	}
}

// --- mutations --------------------------------------------------------------

function mutate(fn: (d: Deck) => void): void {
	if (!deck || shared) return;
	peek.closeForDeckChange(); // the faces are about to be rebuilt; never show stale counts
	fn(deck);
	// the champion pick tracks its pick's main-deck copies (spec: champion
	// copies are main-deck copies) and the Legend's tag: clear it when its
	// copies all leave, or when a replaced legend leaves it without a match
	if (deck.champion && (qtyOf(deck.main, deck.champion) === 0 || !championZoneVerdict(deck.champion))) {
		delete deck.champion;
	}
	deck = saveDeck(deck);
	renderSections();
	renderChecklist();
	renderCounts();
	renderRatio();
	refreshChips();
	renderChampion();
}

function currentQty(section: SectionKey, slug: string): number {
	return qtyOf(deck![section], slug);
}

function canAdd(section: SectionKey, slug: string): { ok: boolean; why: string } {
	const info = idx.cards[slug];
	if (!isKnown(slug)) return { ok: false, why: 'not in this snapshot' };
	if (!typeAllowed(section, info.types)) return { ok: false, why: 'card type does not fit this section' };
	switch (section) {
		case 'legend':
			return deck!.legend.length > 0
				? { ok: false, why: `a deck runs exactly ${DECK_RULES.legends} legend` }
				: { ok: true, why: '' };
		case 'battlefields':
			return currentQty(section, slug) >= 1 ? { ok: false, why: 'battlefields are distinct picks' } : { ok: true, why: '' };
		case 'main':
		case 'side': {
			const next = currentQty(section, slug) + 1;
			return next > copyLimit(slug) ? { ok: false, why: `copy limit ${copyLimit(slug)}` } : { ok: true, why: '' };
		}
		case 'rune':
			return { ok: true, why: '' }; // rune ratio is uncapped by rule
	}
}

/** Pointer-level refusal: briefly rings the card face and surfaces the reason
 *  in its tooltip (the section note already carries the message). */
const refusalTimers = new WeakMap<HTMLElement, number>();
function flashAddButton(button: HTMLElement, why: string): void {
	const host = button.closest<HTMLElement>('[data-slug], [data-champion-face], [data-champion-zone]') ?? button;
	// The card's own title (name, copy count) is kept and the reason appended;
	// it is saved once so a second refusal during the flash restores the real
	// title instead of freezing the first reason in place.
	if (!host.dataset.refuseSaved) {
		host.dataset.refuseSaved = '1';
		host.dataset.refuseTitle = host.title;
	}
	const pending = refusalTimers.get(host);
	if (pending) window.clearTimeout(pending);
	host.classList.remove('refuse-flash');
	void host.offsetWidth; // restart the animation
	host.classList.add('refuse-flash');
	const base = host.dataset.refuseTitle ?? '';
	host.title = base ? `${base} — ${why}` : why;
	refusalTimers.set(
		host,
		window.setTimeout(() => {
			host.classList.remove('refuse-flash');
			host.title = host.dataset.refuseTitle ?? '';
			if (host.title === '') host.removeAttribute('title');
			delete host.dataset.refuseSaved;
			delete host.dataset.refuseTitle;
			refusalTimers.delete(host);
		}, 1400),
	);
}

/** Refusals are announced politely with a short clear, so repeating the same
 *  message is spoken again instead of being ignored as unchanged. */
let liveTimer = 0;
function announceRefusal(message: string): void {
	const live = document.getElementById('deck-live');
	if (!live) return;
	window.clearTimeout(liveTimer);
	live.textContent = '';
	liveTimer = window.setTimeout(() => {
		live.textContent = message;
	}, 60);
}

/** Visible refusal on the drop-target section (no placement). The reason
 *  rides as a small note over the section instead of replacing its count, so
 *  long messages never squeeze the header row. */
function flashRefusal(section: SectionKey, why: string): void {
	const el = document.querySelector<HTMLElement>(`[data-section="${section}"]`);
	if (!el) return;
	el.classList.remove('drag-refuse');
	void el.offsetWidth; // restart the CSS animation
	el.classList.add('drag-refuse');
	el.querySelector('.refusal-note')?.remove();
	const note = document.createElement('span');
	note.className = 'refusal-note';
	note.textContent = why;
	note.setAttribute('aria-hidden', 'true'); // the live region speaks it instead
	el.appendChild(note);
	announceRefusal(`${SECTION_LABELS[section]}: ${why}`);
	setTimeout(() => note.remove(), 1800);
}

/** Shared mutate+add used by drag drops and chips; refusal falls back to the
 *  section itself since there may be no button to flash. */
function tryAdd(section: SectionKey, slug: string, flash: HTMLElement | null = null): void {
	if (!deck) return;
	const verdict = canAdd(section, slug);
	if (!verdict.ok) {
		flashRefusal(section, verdict.why);
		if (flash) flashAddButton(flash, verdict.why);
		return;
	}
	mutate((d) => {
		d[section] = setQty(d[section], slug, currentQty(section, slug) + 1);
	});
}

// --- rendering: sections ----------------------------------------------------

const ICON_MINUS =
	'<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const ICON_PLUS =
	'<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 2.5v7M2.5 6h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

/** Every card face in the manager is a `tile`-role image (400w, degrading to
 *  240w, then removed). `extra` carries the per-face attributes. */
function faceImgHtml(art: GridArt, extra: string): string {
	const a = imgAttrs(art.imageId, 'tile', { rotate: art.rotate });
	return `<img ${extra} src="${esc(a.src)}" alt="" loading="lazy" onerror="${esc(a.onerror)}">`;
}

function thumbHtml(slug: string): string {
	const entry = bySlug.get(slug);
	if (!entry?.art) return '<span class="absolute inset-0 grid place-items-center text-[10px] text-slate-500">no art</span>';
	return faceImgHtml(entry.art, entry.art.rotate ? 'data-rotate' : 'class="h-full w-full object-cover"');
}

/** A card's own page, remembering this deck so the page can link back to it
 *  (deck-return.ts). Read at render time: the address is the deck manager's own. */
function cardHref(slug: string): string {
	return cardPageHref(slug, `${location.pathname}${location.search}${location.hash}`);
}

/** The Legend section shows its single card as a big face (like the browser
 *  impressions — reference: card art + "L1" badge; spec: no copy chip on the
 *  legend face). The legend is replaced by placing another legend, as before. */
function legendCardHtml(section: SectionKey, slug: string, qty: number, name: string): string {
	return (
		`<li data-slug="${esc(slug)}" class="face relative aspect-[5/7] w-full max-w-44">` +
		`<a href="${esc(cardHref(slug))}" aria-label="${esc(name)}" class="absolute inset-0">${thumbHtml(slug)}</a>` +
		`<div title="Legend copies" class="card-badge">L${qty}</div>` +
		`</li>`
	);
}

function rowHtml(section: SectionKey, slug: string, qty: number): string {
	const name = idx.names[slug] ?? bySlug.get(slug)?.name ?? slug;
	if (section === 'legend' && qty > 0) {
		return legendCardHtml(section, slug, qty, name);
	}
	if (section === 'battlefields') {
		// field-zone presentation (spec: battlefields lie horizontally): a
		// landscape card, raw art cropped to the wide box — no rotated crops
		const entry = bySlug.get(slug);
		const art = entry?.art
			? faceImgHtml(entry.art, 'class="h-full w-full object-cover"')
			: `<span class="absolute inset-0 grid place-items-center text-[10px] text-slate-500">no art</span>`;
		return (
			`<li data-slug="${esc(slug)}"` +
			` data-landscape class="face relative aspect-[7/5] min-w-[9rem] flex-1 basis-[calc(33.333%-0.375rem)]">` +
			`<span class="sr-only">${esc(name)}</span>` +
			`<span class="absolute inset-0">${art}</span>` +
			(shared
				? `<div class="face-bar justify-center"><span class="count-chip">${esc(SHORT[section])} ${qty}</span></div>`
				: `<div class="face-bar">` +
					`<button type="button" data-section-row="${esc(section)}" data-slug="${esc(slug)}" data-qty="-1" class="stepper" aria-label="Remove ${esc(name)}">${ICON_MINUS}</button>` +
					`<span class="count-chip">${esc(SHORT[section])} ${qty}</span>` +
					`<button type="button" data-section-row="${esc(section)}" data-slug="${esc(slug)}" data-qty="1" class="stepper" aria-label="Add ${esc(name)}">${ICON_PLUS}</button>` +
					`</div>`) +
			`</li>`
		);
	}
	// deck-side card faces (user reference): plate sized by the panel's
	// auto-fill track — badge chip with the section-committed copies, minus/plus
	// overlaid — smaller than the Legend
	return (
		`<li data-slug="${esc(slug)}"` +
		` class="face relative aspect-[5/7]">` +
		`<span class="sr-only">${esc(name)}</span>` +
		(shared
			? `<span class="absolute inset-0">${thumbHtml(slug)}</span>`
			: `<span class="absolute inset-0 cursor-pointer">${thumbHtml(slug)}</span>`) +
		`<div class="face-bar">` +
		(shared
			? `<span class="count-chip px-1">${esc(SHORT[section])} ${qty}</span>`
			: `<button type="button" data-section-row="${esc(section)}" data-slug="${esc(slug)}" data-qty="-1" class="stepper" aria-label="Remove copy of ${esc(name)}">${ICON_MINUS}</button>` +
				`<span class="count-chip">${esc(SHORT[section])} ${qty}</span>` +
				`<button type="button" data-section-row="${esc(section)}" data-slug="${esc(slug)}" data-qty="1" class="stepper" aria-label="Add copy of ${esc(name)}">${ICON_PLUS}</button>`) +
		`</div>` +
		`</li>`
	);
}

function deckTotalCopiesCounted(d: Deck): number {
	return SECTION_KEYS.reduce((sum, key) => sum + sectionTotal(d[key]), 0);
}

/** Browser footer copy: a shared deck is read-only, so the add hint is wrong. */
function renderHint(): void {
	const hintEl = document.getElementById('bd-hint');
	if (!hintEl) return;
	hintEl.textContent = shared
		? 'Shared view — save it as your deck to edit, or open any card to read it.'
		: 'Added cards enter the focused section. Copy counts come from the deck panel.';
}

function renderCounts(): void {
	if (!deck) return;
	// the ledger and the section headers both read these counts
	for (const section of SECTION_KEYS) {
		const els = document.querySelectorAll<HTMLElement>(`[data-count="${section}"]`);
		for (const el of els) el.textContent = String(sectionTotal(deck[section]));
	}
	const total = deckTotalCopiesCounted(deck);
	const jump = document.getElementById('deck-jump-count');
	if (jump) jump.textContent = String(total);
	metaEl.textContent =
		`${total} cards · ${SECTION_LABELS[activeSection]} focused` + (shared ? ' · shared view' : '');
}

const SECTION_HINT: Record<SectionKey, string> = {
	legend: 'Place one Legend from the browser.',
	battlefields: 'Pick three different battlefields.',
	main: 'Add units, spells, and gear — 40 cards.',
	rune: 'Set the rune ratio above.',
	side: 'Up to 10 optional cards.',
};

function renderSections(): void {
	if (!deck) return;
	for (const section of SECTION_KEYS) {
		const rows = document.querySelector<HTMLUListElement>(`ul[data-rows="${section}"]`);
		if (!rows) continue;
		const slots = deck[section].slice().sort((a, b) => a.card.localeCompare(b.card));
		rows.innerHTML = slots.length
			? slots.map((s) => rowHtml(section, s.card, s.qty)).join('')
			: `<li class="section-empty col-span-full">${esc(SECTION_HINT[section])}</li>`;
	}
}

// section qty rows (+/−/remove), section-focus buttons, and drop targets all
// live under the five [data-section] blocks inside #deck-app
appEl.addEventListener('click', (event) => {
	const target = event.target as HTMLElement;
	const focus = target.closest('button[data-focus-section]') as HTMLElement | null;
	if (focus) {
		focusSection(focus.dataset.focusSection as SectionKey);
		return;
	}
	const row = target.closest('button[data-section-row][data-slug]') as HTMLElement | null;
	if (row) {
		const slug = row.dataset.slug ?? '';
		const section = row.dataset.sectionRow as SectionKey;
		if (row.dataset.remove !== undefined) {
			// remove deletes the whole row, whatever its count was
			mutate((d) => {
				d[section] = setQty(d[section], slug, -1);
			});
			return;
		}
		// increases go through the same cap gate as add/chip/drag; decreases
		// are always allowed (pulling copies is never illegal)
		changeQty(section, slug, Number(row.dataset.qty ?? '0'), row);
	}
});

/** One gate for quantity changes (spec: the copy cap survives every path):
 *  positive deltas must satisfy canAdd; refusals flash the section. */
function changeQty(section: SectionKey, slug: string, delta: number, flashOn: HTMLElement | null = null): void {
	if (!deck) return;
	if (delta > 0) {
		const verdict = canAdd(section, slug);
		if (!verdict.ok) {
			flashRefusal(section, verdict.why);
			if (flashOn) flashAddButton(flashOn, verdict.why);
			return;
		}
	}
	mutate((d) => {
		d[section] = setQty(d[section], slug, currentQty(section, slug) + delta);
	});
}

// --- rune ratio writer (Runes section only) ---------------------------------

function runeRatioHost(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-section="rune"] [data-rune-ratio]');
}

const runeInputsByDomain = new Map<string, HTMLInputElement>();

function renderRatio(): void {
	if (!deck || shared) {
		for (const host of [runeRatioHost()]) if (host) host.hidden = true;
		return;
	}
	const colors = legendDomains() ?? [];
	const host = runeRatioHost();
	if (!host) return;
	if (colors.length === 0) {
		host.hidden = true;
		return;
	}
	// build inputs once per legend; refresh values without stealing focus
	const wanted = [...new Set(colors)];
	const existing = new Set(runeInputsByDomain.keys());
	if (existing.size !== wanted.length || !wanted.every((c) => existing.has(c))) {
		runeInputsByDomain.clear();
		host.hidden = false;
		host.className = 'mb-2 flex flex-wrap items-center gap-2';
		host.innerHTML =
			`<span class="text-[10px] font-semibold tracking-[0.08em] uppercase text-slate-500">Rune ratio</span>` +
			wanted
				.map((domain) => {
					const label = domains.find((d) => d.slug === domain)?.label ?? domain;
					// the domain is carried by a color dot beside the count, not by
					// a colored border: the number stays the only thing to read
					return (
						`<label class="rune-counter" style="--dot:${esc(DOMAIN_COLORS[domain] ?? '#98a3af')}" title="${esc(label)} runes">` +
						`<i class="dot"></i>` +
						`<input type="number" min="0" max="12" step="1" value="0" data-ratio="${esc(domain)}"` +
						` aria-label="${esc(label)} rune count"` +
						` class="rune-counter-input tnum"` +
						`>` +
						`</label>`
					);
				})
				.join('');
		for (const input of Array.from(host.querySelectorAll<HTMLInputElement>('input[data-ratio]'))) {
			runeInputsByDomain.set(input.dataset.ratio ?? '', input);
			input.addEventListener('input', () => {
				const domain = input.dataset.ratio ?? '';
				const target = Math.max(0, Math.floor(Number(input.value) || 0));
				if (!Number.isFinite(target)) return;
				syncRuneRatio(domain, target);
			});
		}
	}
	// refresh displayed totals (skip the input the user is typing in)
	const active = document.activeElement;
	for (const [domain, input] of runeInputsByDomain.entries()) {
		if (input === active) continue;
		input.value = String(runeCopiesFor(domain));
	}
}

function runeCopiesFor(domain: string): number {
	if (!deck) return 0;
	return deck.rune.reduce(
		(sum, slot) => sum + ((idx.cards[slot.card]?.domains ?? []).includes(domain) ? slot.qty : 0),
		0,
	);
}

/** Set a color's copy total: raise fills the canonical rune card of that
 *  color, lower pulls surplus from the largest piles first. */
function syncRuneRatio(domain: string, target: number): void {
	if (!deck) return;
	mutate((d) => {
		let current = d.rune.reduce(
			(sum, slot) => sum + ((idx.cards[slot.card]?.domains ?? []).includes(domain) ? slot.qty : 0),
			0,
		);
		if (target > current) {
			const canonical = `${domain}-rune`;
			const slug = isKnown(canonical) ? canonical : Object.keys(idx.cards).find((s) => (idx.cards[s]?.types ?? []).includes('rune') && (idx.cards[s]?.domains ?? []).includes(domain));
			if (slug) {
				d.rune = setQty(d.rune, slug, qtyOf(d.rune, slug) + (target - current));
				current = target;
			}
		} else if (target < current) {
			let surplus = current - target;
			const sameColor = d.rune
				.filter((slot) => (idx.cards[slot.card]?.domains ?? []).includes(domain))
				.sort((a, b) => b.qty - a.qty || a.card.localeCompare(b.card));
			for (const slot of sameColor) {
				if (surplus <= 0) break;
				const take = Math.min(slot.qty, surplus);
				d.rune = setQty(d.rune, slot.card, slot.qty - take);
				surplus -= take;
			}
		}
	});
}

// --- rendering: checklist ---------------------------------------------------

const STATUS_ICON: Record<string, string> = {
	pass:
		'<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" class="text-emerald-400">' +
		'<path d="M2.75 7.4 5.5 10.15 11.25 4.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	fail:
		'<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" class="text-red-400">' +
		'<circle cx="7" cy="7" r="5.25" stroke="currentColor" stroke-width="1.4"/>' +
		'<path d="M5.1 5.1 8.9 8.9M8.9 5.1 5.1 8.9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
	pending:
		'<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" class="text-amber-400">' +
		'<circle cx="7" cy="7" r="5.25" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.2 2.2"/></svg>',
};

function renderChecklist(): void {
	if (!deck) return;
	const report: LegalityReport = validate(deck, idx);
	verdictEl.dataset.legal = String(report.legal);
	verdictEl.innerHTML = `<i class="dot"></i>${report.legal ? 'Legal' : 'Not legal'}`;
	checklistEl.innerHTML = report.rules
		.map(
			(rule) =>
				`<li class="check-item" data-status="${rule.status}">` +
				STATUS_ICON[rule.status] +
				`<span class="min-w-0">` +
				`<span>${esc(rule.label)}</span>` +
				(rule.status === 'pass' ? '' : ` <span class="check-detail">${esc(rule.detail)}</span>`) +
				(rule.failures.length
					? (() => {
							const shown = rule.failures.slice(0, 6);
							const rest = rule.failures.length - shown.length;
							return `<span class="check-failure">${shown.map(esc).join('<br>')}${rest > 0 ? `<br>+${rest} more` : ''}</span>`;
						})()
					: '') +
				`</span></li>`,
		)
		.join('');
}

// --- browser filters --------------------------------------------------------

const readFilters = () => ({
	q: searchEl.value.trim().toLowerCase(),
	type: typeEl.value,
	rarity: rarityEl.value,
	set: setEl.value,
});

const matches = (entry: GridEntry, f: ReturnType<typeof readFilters>) => {
	if (f.type && !entry.types.includes(f.type)) return false;
	if (f.rarity && !entry.rarities.includes(f.rarity)) return false;
	if (f.set && !entry.sets.includes(f.set)) return false;
	if (f.q && !entry.name.toLowerCase().includes(f.q) && !entry.text.includes(f.q)) return false;
	// domain filter: only when chips are set and this is not a battlefields or
	// legend browsing view — battlefields may be any color, and the legend must
	// be replaceable by any other legend (user request)
	if (activeSection !== 'battlefields' && activeSection !== 'legend' && selectedDomains.size > 0) {
		const info = idx.cards[entry.slug];
		if (!info) return false; // unknown cards fail the checker anyway
		// neutral-domain (generic) cards stay visible under any chip set
		if (!isLegalEverywhere(info) && !info.domains.every((d) => NOT_A_FILTER.has(d) || selectedDomains.has(d))) return false;
	}
	return true;
};

let seq: GridEntry[] = [];
let renderedCount = 0;
const pool = new Map<string, HTMLElement>();

const SHORT = { legend: 'L', battlefields: 'B', main: 'M', rune: 'R', side: 'S' } as const;

/** Chip content: per-section counts (short codes) or a markers. */
function chipText(slug: string): string {
	if (!deck) return '';
	if (!isKnown(slug)) return '?';
	const parts = SECTION_KEYS.flatMap((section) => {
		const qty = qtyOf(deck![section], slug);
		return qty ? [`${SHORT[section]}${qty}`] : [];
	});
	return parts.length ? parts.join('·') : '—';
}

/** Human-readable location of a card's copies, for the count chip's tooltip. */
function chipTitle(slug: string): string {
	if (!deck) return '';
	const parts = SECTION_KEYS.flatMap((section) => {
		const qty = qtyOf(deck![section], slug);
		return qty ? [`${qty} in ${SECTION_LABELS[section]}`] : [];
	});
	return parts.length ? parts.join(' · ') : 'Not in the deck';
}

// the deck-aware browser entry: art-only card impression + copy chip overlay
function entryHtml(entry: GridEntry): string {
	const chipControls = shared
		? `<span class="count-chip px-1">${esc(chipText(entry.slug))}</span>`
		: `<button type="button" data-chip-minus="${esc(entry.slug)}" class="stepper" aria-label="Pull copies from ${esc(SECTION_LABELS[activeSection])}">${ICON_MINUS}</button>` +
			`<span data-chip-count title="${esc(chipTitle(entry.slug))}" class="count-chip min-w-5 text-center">${esc(chipText(entry.slug))}</span>` +
			`<button type="button" data-chip-plus="${esc(entry.slug)}" class="stepper" aria-label="Add copy to ${esc(SECTION_LABELS[activeSection])}">${ICON_PLUS}</button>`;
	return (
		`<li data-slug="${esc(entry.slug)}"` +
		(shared ? '' : ' draggable="true"') +
		` class="face group relative aspect-[5/7] cursor-pointer">` +
		`<a href="${esc(cardHref(entry.slug))}" aria-label="${esc(entry.name)}" class="absolute inset-0">${thumbHtml(entry.slug)}</a>` +
		`<div class="face-bar">${chipControls}</div>` +
		`</li>`
	);
}

function itemFor(entry: GridEntry): HTMLElement {
	const pooled = pool.get(entry.slug);
	if (pooled) return pooled;
	const tpl = document.createElement('template');
	tpl.innerHTML = entryHtml(entry);
	const li = tpl.content.firstElementChild as HTMLElement;
	pool.set(entry.slug, li);
	return li;
}

function renderPrefix(count: number, toTop = false): void {
	const target = Math.min(Math.max(count, 0), seq.length);
	const keep = new Set(seq.slice(0, target).map((e) => e.slug));
	for (const li of Array.from(listEl.querySelectorAll('li[data-slug]'))) {
		if (!keep.has(li.dataset.slug ?? '')) li.remove();
	}
	for (let i = 0; i < target; i++) listEl.appendChild(itemFor(seq[i]));
	renderedCount = target;
	// filtering resets the list; the browser column is its own scroller now,
	// so bring that back to the top rather than the (unscrollable) page
	if (toTop) document.getElementById('deck-browser')?.scrollTo({ top: 0 });
}

const maybeFill = (): void => {
	let guard = 0;
	while (renderedCount < seq.length && guard < 50) {
		const top = sentinelEl.getBoundingClientRect().top;
		if (sentinelEl.isConnected && top > window.innerHeight * 2) break;
		renderPrefix(renderedCount + GRID_STEP);
		guard++;
	}
};

const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(maybeFill, { rootMargin: '100% 0px' }) : null;
io?.observe(sentinelEl);

// Direct scroll fallback: reveal must survive IO edge cases (synthetic scroll
// contexts, viewport recalcs) — the while loop breaks once the sentinel is
// beyond two viewports, so this stays cheap per scroll tick.
window.addEventListener('scroll', maybeFill, { passive: true });

/** The domain filter does not apply to battlefields (any color) or the Legend
 *  (any other Legend must stay choosable), so chips set there change nothing. */
const domainFilterApplies = (): boolean => activeSection !== 'battlefields' && activeSection !== 'legend';

/** How many of the dropdown's filters are set: type (when it is not just the
 *  section's own preset), rarity, set, and the domains (as one). */
function activeFilterCount(): number {
	const allowed = SECTION_CARD_TYPES[activeSection];
	const presetType = allowed.length === 1 ? allowed[0] : '';
	let count = 0;
	if (typeEl.value && typeEl.value !== presetType) count++;
	if (rarityEl.value) count++;
	if (setEl.value) count++;
	if (domainFilterApplies() && selectedDomains.size > 0) count++;
	return count;
}

/** The emblems of the domains the filter is set to, beside the card count, so the
 *  Legend's colors stay in view with the dropdown closed. */
function renderActiveDomains(): void {
	const chosen = domains.filter((d) => selectedDomains.has(d.slug) && !NOT_A_FILTER.has(d.slug));
	if (!domainFilterApplies() || chosen.length === 0) {
		activeDomainsEl.hidden = true;
		activeDomainsEl.innerHTML = '';
		return;
	}
	const names = chosen.map((d) => d.label ?? d.slug);
	activeDomainsEl.hidden = false;
	activeDomainsEl.setAttribute('role', 'img');
	activeDomainsEl.setAttribute('aria-label', `Filtered to ${names.join(', ')}`);
	activeDomainsEl.title = `Domains: ${names.join(', ')}`;
	activeDomainsEl.innerHTML = chosen
		.map((d) =>
			d.icon
				? `<img src="${esc(d.icon)}" alt="" width="16" height="16" data-domain="${esc(d.slug)}" decoding="async">`
				: `<span>${esc(d.label ?? d.slug)}</span>`,
		)
		.join('');
}

function apply(): void {
	const f = readFilters();
	seq = searchable.filter(({ entry }) => matches(entry, f)).map(({ entry }) => entry);
	const active = f.q || f.type || f.rarity || f.set || (activeSection !== 'battlefields' && selectedDomains.size > 0);
	const shown = seq.length.toLocaleString('en-US');
	const total = cards.length.toLocaleString('en-US');
	countEl.textContent = active ? `Showing ${shown} of ${total} cards` : `Showing all ${total} cards`;
	// the dropdown repeats the count (it covers the line above) and the button
	// says how many filters are set
	filtersCountEl.textContent = active ? `${shown} of ${total} cards` : `All ${total} cards`;
	const set = activeFilterCount();
	filtersBadgeEl.hidden = set === 0;
	filtersBadgeEl.innerHTML = set === 0 ? '' : `${set}<span class="sr-only"> ${set === 1 ? 'filter' : 'filters'} set</span>`;
	renderActiveDomains();
	emptyEl.hidden = seq.length > 0;
	renderPrefix(GRID_STEP, true);
	refreshChips();
}

function buildFilterOptions(): void {
	const allowed = SECTION_CARD_TYPES[activeSection];
	const allTypes = [...new Set(cards.flatMap((entry) => entry.types))];
	typeEl.innerHTML =
		`<option value="">Any type</option>` +
		allTypes
			.filter((t) => allowed.includes(t))
			.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
			.join('');
	const order = ['common', 'uncommon', 'rare', 'epic', 'showcase'];
	const found = [...new Set(cards.flatMap((entry) => entry.rarities))].sort(
		(a, b) => (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)),
	);
	rarityEl.innerHTML = `<option value="">All rarities</option>` + found.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
	const sets = [...new Set(cards.flatMap((entry) => entry.sets))].sort();
	setEl.innerHTML = `<option value="">All sets</option>` + sets.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
}

function focusSection(section: SectionKey): void {
	activeSection = section;
	buildFilterOptions();
	// the browser presets to the section's card type (spec: deck-manager)
	const allowed = SECTION_CARD_TYPES[section];
	typeEl.value = allowed.length === 1 ? allowed[0] : '';
	apply();
	for (const key of SECTION_KEYS) {
		const el = document.querySelector<HTMLElement>(`[data-section="${key}"]`);
		if (el) el.dataset.active = String(key === activeSection);
	}
	// the composition ledger carries the same focus as the section headers
	for (const cell of Array.from(document.querySelectorAll<HTMLElement>('[data-ledger-section]'))) {
		const on = cell.dataset.ledgerSection === activeSection;
		cell.dataset.active = String(on);
		cell.setAttribute('aria-pressed', String(on));
	}
	for (const pill of Array.from(pillsEl.querySelectorAll<HTMLButtonElement>('button[data-pill]'))) {
		pill.setAttribute('aria-pressed', String(pill.dataset.pill === activeSection));
	}
	renderCounts(); // the meta line names the focused section
}

/* --- pills: generic section filters (spec: pill filters) --- */

pillsEl.addEventListener('click', (event) => {
	const pill = (event.target as HTMLElement).closest('button[data-pill]') as HTMLElement | null;
	if (!pill) return;
	if (pill.dataset.pill === 'all') {
		// All clears the type preset; additions keep routing to the focused section
		typeEl.value = '';
		apply();
		return;
	}
	focusSection(pill.dataset.pill as SectionKey);
});

/* --- domain chips: legend colors preselected (spec: domain filter) --- */

function renderDomains(): void {
	const filterable = domains.filter((d) => !NOT_A_FILTER.has(d.slug));
	domainGroupEl.hidden = filterable.length === 0;
	if (filterable.length === 0) return;
	// A chip is the domain's emblem alone (its alt text names it); a domain with
	// no emblem cached is printed as its name instead. The "Domains" label is
	// the dropdown's own.
	domainsEl.innerHTML =
		filterable
			.map((d) => {
				const label = d.label ?? d.slug;
				const face = d.icon
					? `<img class="pill-emblem" src="${esc(d.icon)}" alt="${esc(label)}" width="22" height="22" decoding="async">`
					: esc(label);
				return `<button type="button" data-domain="${esc(d.slug)}" aria-pressed="${selectedDomains.has(d.slug)}"` +
					` class="pill"${d.icon ? ' data-emblem' : ''} title="${esc(label)} cards">${face}</button>`;
			})
			.join('');
}

domainsEl.addEventListener('click', (event) => {
	const chip = (event.target as HTMLElement).closest('button[data-domain]') as HTMLElement | null;
	if (!chip) return;
	const domain = chip.dataset.domain ?? '';
	if (selectedDomains.has(domain)) selectedDomains.delete(domain);
	else selectedDomains.add(domain);
	// the chip changes in place: replacing it would drop the keyboard focus that
	// is on it (and the dropdown's focus with it)
	chip.setAttribute('aria-pressed', String(selectedDomains.has(domain)));
	apply();
});

/* --- filter dropdown: a native popover, placed under its button --- */

/** The panel is in the top layer (nothing clips it), so it is placed from the
 *  button's rect: its top under the button, its right edge on the button's, kept
 *  inside the window. Below lg the bar scrolls with the column, so the button can
 *  leave the window while the panel is open: the panel then stays at the window's
 *  top edge instead of leaving with it. Width must match `.filter-pop` in
 *  global.css (22rem). */
function placeFilters(): void {
	const rect = filtersBtn.getBoundingClientRect();
	const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
	const width = Math.min(22 * rem, window.innerWidth - rem);
	const right = Math.min(Math.max(window.innerWidth - rect.right, rem / 2), window.innerWidth - width - rem / 2);
	const top = Math.min(Math.max(rect.bottom + 6, rem / 2), window.innerHeight - 10 * rem);
	filtersPop.style.setProperty('--pop-top', `${Math.round(top)}px`);
	filtersPop.style.setProperty('--pop-right', `${Math.round(right)}px`);
}

filtersPop.addEventListener('beforetoggle', (event) => {
	if ((event as Event & { newState?: string }).newState === 'open') placeFilters();
});

// the button moves when the page or the column scrolls (below lg the bar is not
// pinned), and filtering scrolls the column to its top: the panel follows
const followFilters = (): void => {
	if (filtersPop.matches(':popover-open')) placeFilters();
};
window.addEventListener('resize', followFilters);
document.getElementById('deck-browser')?.addEventListener('scroll', followFilters, { passive: true });

searchEl.addEventListener('input', apply);
typeEl.addEventListener('change', apply);
rarityEl.addEventListener('change', apply);
setEl.addEventListener('change', apply);
resetEl.addEventListener('click', () => {
	searchEl.value = '';
	rarityEl.value = '';
	setEl.value = '';
	selectedDomains.clear();
	renderDomains();
	const allowed = SECTION_CARD_TYPES[activeSection];
	typeEl.value = allowed.length === 1 ? allowed[0] : '';
	apply();
});

// add/chips/click-add live in the browser list only (section rows go through #deck-app)
listEl.addEventListener('click', (event) => {
	const target = event.target as HTMLElement;
	const card = target.closest('li[data-slug]') as HTMLElement | null;
	if (!card) return;
	const slug = card.dataset.slug ?? '';
	const plus = target.closest('button[data-chip-plus]') as HTMLElement | null;
	const minus = target.closest('button[data-chip-minus]') as HTMLElement | null;
	if (plus && !plus.disabled) {
		// left-click navigation is intercepted: the card face is the add control
		event.preventDefault();
		clickAdd(slug, plus);
		return;
	}
	if (minus && !minus.disabled) {
		event.preventDefault();
		pullFromAny(slug, minus);
		return;
	}
	// plain card click = add to the corresponding section (shared view passive)
	if (shared) return;
	// a keyboard-activated link (Enter/Space on the anchor, detail 0) follows
	// its href to the card page; pointer clicks keep the add shortcut
	if (event.detail === 0) return;
	event.preventDefault();
	// zone-directed champion placement (spec: champion zone beside the legend):
	// while the zone's picker is active, a tag-matching champion click places it
	if (championPicking) {
		if (!championZoneVerdict(slug)) {
			flashAddButton(card, 'champion must match the legend');
			return;
		}
		championPicking = false;
		placeChampion(slug, card);
		return;
	}
	clickAdd(slug, null);
});

/** Route a card to its natural section (user request: clicking adds to the
 *  corresponding grid): single-placement types own their list; main/side-legal
 *  cards default to the main deck (side stays reachable via drag and chips). */
function naturalSection(slug: string): SectionKey | null {
	const info = idx.cards[slug];
	if (!info) return null;
	if (info.types.includes('legend')) return 'legend';
	if (info.types.includes('rune')) return 'rune';
	if (info.types.includes('battlefield')) return 'battlefields';
	if (info.types.some((t) => ['unit', 'spell', 'gear'].includes(t))) return 'main';
	return null;
}

/** Click-add with routing: clicking a DIFFERENT legend replaces the placed
 *  one (user request); clicking the placed legend is a visible refusal. */
function clickAdd(slug: string, flash: HTMLElement | null = null): void {
	if (!deck) return;
	const routed = naturalSection(slug);
	if (!routed) return;
	if (routed === 'legend') {
		const placed = deck.legend[0];
		if (placed && placed.card !== slug) {
			mutate((d) => {
				d.legend = [{ card: slug, qty: 1 }];
			});
			return;
		}
		if (placed) {
			flashRefusal('legend', 'this legend is already placed');
			if (flash) flashAddButton(flash, 'already the deck legend');
			return;
		}
	}
	tryAdd(routed, slug, flash);
}

/** Chip minus pulls copies: natural section first, then wherever copies live. */
function pullFromAny(slug: string, flash: HTMLElement | null = null): void {
	if (!deck) return;
	const routed = naturalSection(slug);
	const order = routed ? [routed, ...SECTION_KEYS.filter((s) => s !== routed)] : SECTION_KEYS;
	for (const section of order) {
		if (currentQty(section, slug) > 0) {
			mutate((d) => {
				d[section] = setQty(d[section], slug, currentQty(section, slug) - 1);
			});
			return;
		}
	}
	flashRefusal(routed ?? 'main', 'no copies in the deck');
	if (flash) flashAddButton(flash, 'no copies in the deck');
}

/** Overlays current deck counts onto already-visible browser entries. */
function refreshChips(): void {
	for (const li of Array.from(listEl.querySelectorAll<HTMLElement>('li[data-slug]'))) {
		const chip = li.querySelector('[data-chip-count]');
		if (!chip) continue;
		// keep the aria/labels aligned with the focused section
		const plus = li.querySelector<HTMLButtonElement>('[data-chip-plus]');
		const minus = li.querySelector<HTMLButtonElement>('[data-chip-minus]');
		if (plus) plus.setAttribute('aria-label', `Add copy to ${SECTION_LABELS[activeSection]}`);
		if (minus) minus.setAttribute('aria-label', `Pull copies from ${SECTION_LABELS[activeSection]}`);
		chip.textContent = chipText(li.dataset.slug ?? '');
		chip.setAttribute('title', chipTitle(li.dataset.slug ?? ''));
	}
}

// --- drag and drop: sections as drop targets (spec: drag into sections) -----

let draggingSlug: string | null = null;

listEl.addEventListener('dragstart', (event) => {
	const card = (event.target as HTMLElement).closest('li[data-slug]') as HTMLElement | null;
	if (!card || shared) {
		event.preventDefault();
		return;
	}
	draggingSlug = card.dataset.slug ?? null;
	if (event.dataTransfer) event.dataTransfer.setData('text/plain', draggingSlug ?? '');
});

listEl.addEventListener('dragend', () => {
	draggingSlug = null;
	hideDragHints();
});

function hideDragHints(): void {
	for (const el of Array.from(appEl.querySelectorAll('[data-section]'))) {
		el.classList.remove('drag-accept', 'drag-refuse');
	}
}

const SECTION_FROM_KEY: Record<string, SectionKey> = {
	legend: 'legend',
	battlefields: 'battlefields',
	main: 'main',
	rune: 'rune',
	side: 'side',
};

for (const el of Array.from(appEl.querySelectorAll<HTMLElement>('[data-section]'))) {
	const section = SECTION_FROM_KEY[el.dataset.section ?? ''];
	if (!section) continue;
	el.addEventListener('dragover', (event) => {
		if (!draggingSlug || shared) return;
		const verdict = deck ? canAdd(section, draggingSlug) : { ok: false, why: '' };
		el.classList.toggle('drag-accept', verdict.ok);
		if (verdict.ok) event.preventDefault();
	});
	el.addEventListener('dragleave', (event) => {
		if (event.target === el) el.classList.remove('drag-accept');
	});
	el.addEventListener('drop', (event) => {
		event.preventDefault();
		if (!draggingSlug || shared) return;
		const slug = draggingSlug;
		draggingSlug = null;
		hideDragHints();
		const verdict = canAdd(section, slug);
		if (verdict.ok) {
			mutate((d) => {
				d[section] = setQty(d[section], slug, currentQty(section, slug) + 1);
			});
		} else {
			flashRefusal(section, verdict.why);
		}
	});
}

// --- champion zone beside the legend (spec: champion zone) -------------------
//
// At most one Champion per deck: a single champion-unit card sharing the
// Legend's champion tag, up to the standard 3-copy cap. Copies live in (and
// are counted by) the main deck — the zone only stores which card is picked.

const championZoneEl = document.querySelector<HTMLElement>('[data-champion-zone]')!;
const championFaceEl = document.querySelector<HTMLElement>('[data-champion-face]')!;
const championCountEl = document.querySelector<HTMLElement>('[data-champion-count]')!;
const CHAMPION_CHIP_CAP = 3;

let championPicking = false;

/** The Legend's champion tag resolves like the legality checker's
 *  champion-unit rule (deck-rules): the legend's first champion-ish tag. */
function legendChampionTag(): string | null {
	const legend = idx.cards[deck?.legend[0]?.card ?? ''];
	const tag = legend?.tags.find((t) => idx.championTags.includes(t));
	return tag ?? null;
}

function championZoneVerdict(slug: string): boolean {
	const info = idx.cards[slug];
	if (!info || !info.types.includes('unit') || !info.superTypes.includes('champion')) return false;
	const tag = legendChampionTag();
	return Boolean(tag && info.tags.includes(tag));
}

/** Drops the pick in (storing the champion designation) and routes one copy
 *  into the main deck through its standard cap gate. Pick and copy land in
 *  one mutation so the pick-tracking cleanup never sees zero copies. */
function placeChampion(slug: string, flash: HTMLElement | null = null): void {
	if (!deck || shared) return;
	if (!championZoneVerdict(slug)) {
		flashAddButton(flash ?? championFaceEl, 'champion must match the legend');
		return;
	}
	const verdict = canAdd('main', slug);
	if (!verdict.ok) {
		flashAddButton(flash ?? championFaceEl, verdict.why);
		return;
	}
	mutate((d) => {
		d.champion = slug;
		d.main = setQty(d.main, slug, qtyOf(d.main, slug) + 1);
	});
}

const ICON_TRASH =
	'<svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 3.1h6M4 3.1V2.1h2v1M3.1 3.1l.45 4.9h2.9l.45-4.9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** The zone mirrors the pick: empty placement state or the champion face with
 *  the relocated copy chip; the zone's own Select/Switch control sits in the
 *  header row and is always available to (re)start pick mode. */
function renderChampion(): void {
	if (!deck) return;
	const pickBtn = document.querySelector<HTMLButtonElement>('[data-champion-pick]');
	if (pickBtn) {
		pickBtn.disabled = Boolean(shared);
		pickBtn.setAttribute('aria-pressed', String(championPicking));
		pickBtn.textContent = championPicking
			? 'Picking — click a champion'
			: deck?.champion ? 'Switch champion' : 'Select champion';
	}
	const slug = deck?.champion ?? '';
	if (!slug || !championZoneVerdict(slug)) {
		championCountEl.textContent = `0 / ≤ ${CHAMPION_CHIP_CAP}`;
		championFaceEl.innerHTML = shared
			? `<div class="card-corner flex aspect-[5/7] w-full max-w-32 items-center justify-center border border-dashed border-slate-800 bg-slate-900/40 px-2 text-center text-[10px] leading-tight text-slate-500">no champion picked</div>`
			: `<div class="card-corner flex aspect-[5/7] w-full max-w-32 flex-col items-center justify-center gap-1.5 border border-dashed ${championPicking ? 'border-amber-400/70' : 'border-slate-700'} bg-slate-900/40 px-2 text-center text-slate-500">` +
				`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` +
				`<span class="text-[10px] leading-tight">champion unit of the legend's tag</span>` +
				`</div>`;
		return;
	}
	const qty = qtyOf(deck.main, slug);
	const cap = Math.min(CHAMPION_CHIP_CAP, copyLimit(slug));
	championCountEl.textContent = `${qty} / ${cap}`;
	championFaceEl.innerHTML =
		`<div data-slug="${esc(slug)}" class="face relative aspect-[5/7] w-full max-w-32">` +
		`<a href="/cards/${esc(slug)}" aria-label="${esc(idx.names[slug] ?? slug)}" class="absolute inset-0">${thumbHtml(slug)}</a>` +
		`<div title="Champion copies in the main deck" class="card-badge">C${qty}</div>` +
		(shared
			? `<div class="face-bar justify-center"><span class="count-chip">× ${qty} copies</span></div>`
			: `<div class="face-bar">` +
				`<button type="button" data-section-row="main" data-slug="${esc(slug)}" data-qty="-1" class="stepper" aria-label="Pull a copy from ${esc(idx.names[slug] ?? slug)}">${ICON_MINUS}</button>` +
				`<span class="count-chip">${qty}</span>` +
				`<button type="button" data-section-row="main" data-slug="${esc(slug)}" data-qty="1" class="stepper" aria-label="Add a copy to ${esc(idx.names[slug] ?? slug)}">${ICON_PLUS}</button>` +
				`<button type="button" data-section-row="main" data-slug="${esc(slug)}" data-qty="-1" data-remove class="stepper" aria-label="Remove ${esc(idx.names[slug] ?? slug)} from the deck">${ICON_TRASH}</button>` +
				`</div>`) +
		`</div>`;
}

championZoneEl.addEventListener('click', (event) => {
	if (shared) return;
	if (!(event.target as HTMLElement).closest('button[data-champion-pick]')) return;
	championPicking = !championPicking;
	renderChampion();
});

championZoneEl.addEventListener('dragover', (event) => {
	if (!draggingSlug || shared || !championZoneVerdict(draggingSlug)) return;
	// a tag-matching champion dropped here belongs to the zone: keep it away
	// from the Legend section's own drop handling
	event.stopPropagation();
	championZoneEl.classList.add('drag-accept');
	event.preventDefault(); // accept the drop on the zone
});

championZoneEl.addEventListener('dragleave', (event) => {
	if (event.target === championZoneEl) championZoneEl.classList.remove('drag-accept');
});

championZoneEl.addEventListener('drop', (event) => {
	if (!draggingSlug || shared) return;
	const slug = draggingSlug;
	if (championZoneVerdict(slug)) {
		event.preventDefault();
		event.stopPropagation();
		draggingSlug = null;
		hideDragHints();
		placeChampion(slug);
		return;
	}
	// a champion unit of the wrong tag refuses here, visibly (a non-champion
	// card falls through to the Legend section's normal refusal)
	if (isChampionUnitCard(slug)) {
		event.preventDefault();
		event.stopPropagation();
		draggingSlug = null;
		hideDragHints();
		flashRefusal('legend', 'champion must match the legend');
	}
});

function isChampionUnitCard(slug: string): boolean {
	const info = idx.cards[slug];
	return Boolean(info?.types.includes('unit') && info.superTypes.includes('champion'));
}

// --- header actions ---------------------------------------------------------

// Below lg, Deck / Back to cards swap the two panes rather than scrolling: the
// deck lives in the URL hash (#d/<id> / #s/<payload>), so an #anchor would
// replace it, and the two framed columns each own their scroll now — the page
// itself never scrolls, so the browser's scroll offset is kept by hand.
let cardsScrollTop = 0;
const browserPaneEl = document.getElementById('deck-browser');
const viewerPaneEl = document.getElementById('deck-viewer');
for (const trigger of Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-to]'))) {
	trigger.addEventListener('click', () => {
		const goingToDeck = trigger.dataset.scrollTo === 'deck-viewer';
		if (goingToDeck) {
			cardsScrollTop = browserPaneEl?.scrollTop ?? 0;
			appEl.dataset.view = 'deck';
			// the trigger itself is now display:none; hand focus to the pane so
			// keyboard and screen-reader users are not dropped back to the body
			viewerPaneEl?.focus({ preventScroll: true });
		} else {
			appEl.dataset.view = 'cards';
			browserPaneEl?.focus({ preventScroll: true });
			// display:none dropped the offset; put the list back where it was
			browserPaneEl?.scrollTo({ top: cardsScrollTop });
		}
	});
}

// --- deck title (spec: deck title is edited in place) -------------------------
// One editing state with two doors: click the title, or press Rename. Enter and
// leaving the field both end in blur, and blur is the only commit, so there is
// one path. A rename changes the name alone: it never goes through mutate(),
// whose re-render would replace the very button the user is pressing to leave
// the field (blur fires on mousedown, before the click).

const TITLE_HINT = 'Enter to save · Esc to cancel';
const TITLE_SAVED_MS = 1600;
let titleCancelled = false;
let titleTimer = 0;

/** Shows a name in both faces of the title (the text and the field). */
function showTitle(name: string): void {
	nameTextEl.textContent = name;
	nameInput.value = name;
	nameFieldEl.dataset.value = name;
}

/** An owned deck shows the field and Rename; a shared deck or no deck shows
 *  plain text and neither (spec: shared decks keep a read-only title). */
function setTitleEditable(editable: boolean): void {
	nameTextEl.hidden = editable;
	nameFieldEl.hidden = !editable;
	renameBtn.hidden = !editable;
}

function commitTitle(): void {
	const cancelled = titleCancelled;
	titleCancelled = false;
	if (!deck || shared) return;
	window.clearTimeout(titleTimer);
	const next = cancelled ? '' : cleanDeckName(nameInput.value);
	if (next === '' || next === deck.name) {
		// cancelled, blank or unchanged: the stored name comes back, nothing is saved
		showTitle(deck.name || 'Deck');
		renderCounts();
		return;
	}
	deck.name = next;
	deck = saveDeck(deck);
	showTitle(deck.name);
	announceRefusal(`Deck renamed to ${deck.name}`);
	metaEl.textContent = 'Saved ✓';
	// back to the counts as they are then, not as they were
	titleTimer = window.setTimeout(renderCounts, TITLE_SAVED_MS);
}

nameInput.addEventListener('focus', () => {
	if (!deck || shared) return;
	window.clearTimeout(titleTimer);
	titleCancelled = false;
	metaEl.textContent = TITLE_HINT;
});

nameInput.addEventListener('input', () => {
	nameFieldEl.dataset.value = nameInput.value;
});

nameInput.addEventListener('keydown', (event) => {
	if (event.isComposing) return; // an IME's Enter confirms the composition
	if (event.key === 'Enter') {
		event.preventDefault();
		nameInput.blur();
	} else if (event.key === 'Escape') {
		event.preventDefault();
		titleCancelled = true;
		nameInput.blur();
	}
});

nameInput.addEventListener('blur', commitTitle);

renameBtn.addEventListener('click', () => {
	if (!deck || shared) return;
	nameInput.focus();
	nameInput.select();
});

shareBtn.addEventListener('click', async () => {
	if (!deck) return;
	const payload = await encodeDeck(deck);
	const url = `${location.origin}/decks/build#s/${payload}`;
	try {
		await navigator.clipboard.writeText(url);
		shareBtn.textContent = 'Link copied ✓';
	} catch {
		window.prompt('Copy this deck link', url);
	}
	setTimeout(() => {
		shareBtn.textContent = 'Copy deck link';
	}, 1600);
});

saveSharedBtn.addEventListener('click', () => {
	if (!deck) return;
	const adopted = adoptDeck(deck);
	deck = adopted;
	shared = false;
	history.replaceState(null, '', `/decks/build#d/${deck.id}`);
	showTitle(deck.name);
	setTitleEditable(true);
	shareBtn.hidden = false;
	saveSharedBtn.hidden = true;
	renderUnknownWarning();
	renderRatio();
	renderChampion();
	renderHint();
	renderCounts();
	// browser impressions were built in the read-only shared shape; drop the
	// pooled nodes so they are rebuilt with their copy chips
	pool.clear();
	listEl.replaceChildren();
	apply();
});

// --- go ---------------------------------------------------------------------

loadDeckFromHash();

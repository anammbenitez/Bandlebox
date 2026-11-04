// Deck manager controller (src/pages/decks/build.astro): deck state, section
// rows, the card browser (art-only card impressions, pill/domain filters,
// drag-and-drop, copy chips), the rune ratio writer, the live legality
// checklist, and share. Storage decisions live in deck-store so page state
// and saved state never diverge (spec: deck-library).
//
// Hash contract: #d/<id> = a saved deck from deck-store; #s/<payload> = a
// shared deck, opened as view+copy (design.md non-goal: no in-place editing
// of shared decks). Anything else shows the hint to create a deck first.

import { GRID_STEP } from '../lib/grid-item';
import {
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
import { adoptDeck, getDeck, saveDeck, takeStorageProblem } from '../lib/deck-store';
import { buildDeckRuleIndexes, isLegalEverywhere, validate, type DeckRuleIndexes, type LegalityReport } from '../lib/deck-rules';
import { decodeDeck, encodeDeck, hashToPayload, isSharePayload } from '../lib/deck-share';

// --- payload programs -------------------------------------------------------

interface GridArt {
	url: string;
	rotate: boolean;
	setSlug: string;
}
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
}

const readJson = <T,>(id: string): T => JSON.parse(document.getElementById(id)?.textContent ?? 'null') as T;

const cards: GridEntry[] = readJson('deck-card-data');
const idx: DeckRuleIndexes = readJson('deck-rules-data');
const domains: DomainEntry[] = (readJson('deck-domains-data') ?? []) as DomainEntry[];
const bySlug = new Map(cards.map((entry) => [entry.slug, entry]));
const searchable = cards.map((entry) => ({ entry, text: entry.text.toLowerCase() }));

// --- element handles --------------------------------------------------------

const nameEl = document.getElementById('deck-name')!;
const metaEl = document.getElementById('deck-meta')!;
const verdictEl = document.getElementById('deck-verdict')!;
const renameBtn = document.getElementById('deck-rename') as HTMLButtonElement;
const shareBtn = document.getElementById('deck-share') as HTMLButtonElement;
const saveSharedBtn = document.getElementById('deck-save-shared') as HTMLButtonElement;
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
const listEl = document.getElementById('bd-list') as HTMLUListElement;
const sentinelEl = document.getElementById('bd-sentinel')!;
const countEl = document.getElementById('bd-count')!;
const emptyEl = document.getElementById('bd-empty')!;
const checklistEl = document.getElementById('deck-checklist') as HTMLUListElement;

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
	nameEl.textContent = 'Deck manager';
	metaEl.textContent =
		'Open a deck from your deck list, or create one there first — decks always live in your browser.';
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
	nameEl.textContent = deck?.name || 'Deck';
	shareBtn.hidden = shared;
	saveSharedBtn.hidden = !shared;
	const warning = shared ? null : takeStorageProblem();
	if (warning && storageWarnEl) {
		storageWarnEl.hidden = false;
		storageWarnEl.textContent = warning;
	}
	// domain chips seed from the Legend's colors (once per opened deck)
	selectedDomains.clear();
	for (const domain of legendDomains() ?? []) selectedDomains.add(domain);
	renderUnknownWarning();
	seedDefaultRunes();
	renderDomains();
	renderRatio();
	renderSections();
	renderCounts();
	renderChecklist();
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
	fn(deck);
	deck = saveDeck(deck);
	renderSections();
	renderChecklist();
	renderCounts();
	renderRatio();
	refreshChips();
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

function flashAddButton(button: HTMLElement, why: string): void {
	const original = button.textContent ?? 'Add';
	button.textContent = `✕ ${why}`;
	button.disabled = true;
	setTimeout(() => {
		button.textContent = original;
		button.disabled = false;
	}, 1100);
}

/** Visible refusal on the drop-target section (no placement). */
function flashRefusal(section: SectionKey, why: string): void {
	const el = document.querySelector<HTMLElement>(`[data-section="${section}"]`);
	if (!el) return;
	el.classList.remove('drag-refuse');
	void el.offsetWidth; // restart the CSS animation
	el.classList.add('drag-refuse');
	const counter = el.querySelector<HTMLElement>('[data-count]');
	if (counter) {
		const original = counter.textContent;
		counter.textContent = `✕ ${why}`;
		setTimeout(() => {
			counter.textContent = original;
			renderCounts();
		}, 900);
	}
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

function thumbHtml(slug: string): string {
	const entry = bySlug.get(slug);
	if (!entry?.art) return '<span class="absolute inset-0 grid place-items-center text-[10px] text-slate-600">no art</span>';
	if (entry.art.rotate) {
		return `<img data-rotate src="${esc(entry.art.url)}" alt="" loading="lazy" onerror="this.remove()">`;
	}
	return `<img src="${esc(entry.art.url)}" alt="" loading="lazy" class="h-full w-full object-cover" onerror="this.remove()">`;
}

/** The Legend section shows its single card as a big face (like the browser
 *  impressions — reference: card art + "L1" badge + controls), not a row. */
function legendCardHtml(section: SectionKey, slug: string, qty: number, name: string): string {
	return (
		`<li data-slug="${esc(slug)}" class="relative mx-auto w-44 aspect-[5/7] overflow-hidden rounded-md border border-amber-400/60 bg-slate-900 shadow">` +
		`<a href="/cards/${esc(slug)}" aria-label="${esc(name)}" class="absolute inset-0">${thumbHtml(slug)}</a>` +
		`<div class="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full border border-slate-800 bg-slate-950/90 text-xs font-bold text-amber-200">L${qty}</div>` +
		`<div class="absolute inset-x-0 bottom-0 border-t border-slate-800 bg-slate-950/85 px-1.5 py-1">` +
		(shared
			? `<span class="text-[10px] text-slate-400">× ${qty}</span>`
			: `<span class="mt-0.5 flex items-center justify-center gap-1 text-xs">` +
				`<button type="button" data-section-row="${esc(section)}" data-slug="${esc(slug)}" data-qty="-1" class="h-6 w-6 rounded border border-slate-700 text-slate-300 hover:border-slate-500">−</button>` +
				`<span class="w-5 text-center text-slate-200">${qty}</span>` +
				`<button type="button" data-section-row="${esc(section)}" data-slug="${esc(slug)}" data-qty="1" class="h-6 w-6 rounded border border-slate-700 text-slate-300 hover:border-slate-500">+</button>` +
				`<button type="button" data-section-row="${esc(section)}" data-slug="${esc(slug)}" data-qty="-1" data-remove class="h-6 rounded border border-slate-700 px-1.5 text-xs text-slate-400 hover:border-red-400/60 hover:text-red-300">remove</button>` +
				`</span>`) +
		`</div>` +
		`</li>`
	);
}

function rowHtml(section: SectionKey, slug: string, qty: number): string {
	const name = idx.names[slug] ?? bySlug.get(slug)?.name ?? slug;
	if (section === 'legend' && qty > 0) {
		return legendCardHtml(section, slug, qty, name);
	}
	// deck-side card faces (user reference): 5 per row, badge chip with the
	// section-committed copies, minus/plus overlaid — smaller than the Legend
	return (
		`<li data-slug="${esc(slug)}" title="${esc(name)} — ${qty} in the deck"` +
		` class="relative aspect-[5/7] overflow-hidden rounded border border-slate-800 bg-slate-900 hover:border-slate-600">` +
		(shared
			? `<span class="absolute inset-0">${thumbHtml(slug)}</span>`
			: `<span class="absolute inset-0 cursor-pointer">${thumbHtml(slug)}</span>`) +
		`<div class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-0.5 border-t border-slate-800 bg-slate-950/85 px-0.5 py-0.5">` +
		(shared
			? `<span class="px-1 text-[10px] font-semibold text-slate-200">${esc(SHORT[section])} ${qty}</span>`
			: `<button type="button" data-section-row="${esc(section)}" data-slug="${esc(slug)}" data-qty="-1" class="rounded bg-slate-800/90 px-1 text-[10px] leading-4 text-slate-300 hover:text-white" aria-label="Remove copy of ${esc(name)}">−</button>` +
				`<span class="text-[10px] font-semibold text-slate-100">${esc(SHORT[section])} ${qty}</span>` +
				`<button type="button" data-section-row="${esc(section)}" data-slug="${esc(slug)}" data-qty="1" class="rounded bg-slate-800/90 px-1 text-[10px] leading-4 text-slate-300 hover:text-white" aria-label="Add copy of ${esc(name)}">+</button>`) +
		`</div>` +
		`</li>`
	);
}

function deckTotalCopiesCounted(d: Deck): number {
	return SECTION_KEYS.reduce((sum, key) => sum + sectionTotal(d[key]), 0);
}

function renderCounts(): void {
	if (!deck) return;
	for (const section of SECTION_KEYS) {
		const el = document.querySelector<HTMLElement>(`[data-count="${section}"]`);
		if (el) el.textContent = String(sectionTotal(deck[section]));
	}
	metaEl.textContent =
		`${deckTotalCopiesCounted(deck)} cards · ${SECTION_LABELS[activeSection]} focused` + (shared ? ' · shared view' : '');
}

function renderSections(): void {
	if (!deck) return;
	for (const section of SECTION_KEYS) {
		const rows = document.querySelector<HTMLUListElement>(`ul[data-rows="${section}"]`);
		if (!rows) continue;
		const slots = deck[section].slice().sort((a, b) => a.card.localeCompare(b.card));
		rows.innerHTML = slots.map((s) => rowHtml(section, s.card, s.qty)).join('');
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
		host.className = 'mt-2 flex flex-wrap items-center gap-2';
		host.innerHTML =
			`<span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Rune ratio</span>` +
			wanted
				.map((domain) => {
					const label = domains.find((d) => d.slug === domain)?.label ?? domain;
					// the color names live in the tooltip/aria only — the inputs are
					// told apart by their domain-colored left edge
					return (
						`<label class="inline-block">` +
						`<input type="number" min="0" max="12" step="1" value="0" data-ratio="${esc(domain)}"` +
						` title="${esc(label)} runes" aria-label="${esc(label)} rune count"` +
						` style="border-left: 4px solid ${esc(DOMAIN_COLORS[domain] ?? '#94a3b8')}"` +
						` class="w-14 rounded border-y border-r border-slate-700 bg-slate-950 px-1.5 py-1 text-sm text-slate-100 outline-none focus:border-y-amber-400/70"` +
						`></label>`
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

const STATUS_MARK = { pass: '✓', fail: '✕', pending: '…' } as const;
const STATUS_CLASS: Record<string, string> = {
	pass: 'bg-emerald-400/10 text-emerald-300',
	fail: 'bg-red-500/10 text-red-300',
	pending: 'bg-amber-400/10 text-amber-200',
};

function renderChecklist(): void {
	if (!deck) return;
	const report: LegalityReport = validate(deck, idx);
	verdictEl.textContent = report.legal ? 'Legal ✓' : 'Not legal';
	verdictEl.className =
		'rounded-full border px-3 py-1 text-xs font-semibold ' +
		(report.legal ? 'border-emerald-400/50 text-emerald-300' : 'border-red-400/50 text-red-300');
	checklistEl.innerHTML = report.rules
		.map(
			(rule) =>
				`<li class="flex gap-2">` +
				`<span class="mt-0.5 rounded px-1 text-xs ${STATUS_CLASS[rule.status]}">${STATUS_MARK[rule.status]}</span>` +
				`<span class="min-w-0">` +
				`<span class="${rule.status === 'pass' ? 'text-slate-400' : rule.status === 'fail' ? 'text-slate-200' : 'text-amber-200'}">${esc(rule.label)}</span>` +
				(rule.status === 'pass' ? '' : ` <span class="block text-xs text-slate-400">${esc(rule.detail)}</span>`) +
				(rule.failures.length
					? `<span class="block break-words text-xs text-red-300/90">${rule.failures.map(esc).join('<br>')}</span>`
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
		if (!isLegalEverywhere(info) && !info.domains.every((d) => selectedDomains.has(d))) return false;
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

// the deck-aware browser entry: art-only card impression + copy chip overlay
function entryHtml(entry: GridEntry): string {
	const chipControls = shared
		? `<span class="text-[10px] font-semibold tracking-wide text-slate-200">${esc(chipText(entry.slug))}</span>`
		: `<button type="button" data-chip-minus="${esc(entry.slug)}" class="rounded bg-slate-800/90 px-1 text-[10px] leading-4 text-slate-300 hover:text-white" aria-label="Pull copies from ${esc(SECTION_LABELS[activeSection])}">−</button>` +
			`<span data-chip-count class="min-w-6 text-center text-[10px] font-semibold tracking-wide text-slate-100">${esc(chipText(entry.slug))}</span>` +
			`<button type="button" data-chip-plus="${esc(entry.slug)}" class="rounded bg-slate-800/90 px-1 text-[10px] leading-4 text-slate-300 hover:text-white" aria-label="Add copy to ${esc(SECTION_LABELS[activeSection])}">+</button>`;
	return (
		`<li data-slug="${esc(entry.slug)}"` +
		(shared ? '' : ' draggable="true"') +
		` title="${esc(entry.name)} — ${esc(entry.meta)}"` +
		` class="group relative aspect-[5/7] overflow-hidden rounded-md border border-slate-800 bg-slate-900 hover:border-amber-400/60">` +
		`<a href="/cards/${esc(entry.slug)}" aria-label="${esc(entry.name)}" class="absolute inset-0">${thumbHtml(entry.slug)}</a>` +
		`<div class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-0.5 border-t border-slate-800 bg-slate-950/85 px-1 py-0.5">` +
		chipControls +
		`</div>` +
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
	if (toTop) window.scrollTo(0, 0);
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

function apply(): void {
	const f = readFilters();
	seq = searchable.filter(({ entry }) => matches(entry, f)).map(({ entry }) => entry);
	const active = f.q || f.type || f.rarity || f.set || (activeSection !== 'battlefields' && selectedDomains.size > 0);
	countEl.textContent = active
		? `Showing ${seq.length.toLocaleString('en-US')} of ${cards.length.toLocaleString('en-US')} cards`
		: `Showing all ${cards.length.toLocaleString('en-US')} cards`;
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
		document
			.querySelector(`[data-focus-section="${key}"]`)
			?.classList.toggle('ring-1', key === activeSection);
		document
			.querySelector(`[data-focus-section="${key}"]`)
			?.classList.toggle('ring-amber-400/60', key === activeSection);
	}
	for (const pill of Array.from(pillsEl.querySelectorAll<HTMLButtonElement>('button[data-pill]'))) {
		pill.setAttribute('aria-pressed', String(pill.dataset.pill === activeSection));
		pill.className =
			'rounded-full border px-3 py-1 text-xs ' +
			(pill.dataset.pill === activeSection
				? 'border-amber-400 bg-amber-400/10 text-amber-200'
				: 'border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-400/60');
	}
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
	if (domains.length === 0) {
		domainsEl.hidden = true;
		return;
	}
	domainsEl.innerHTML =
		`<span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Domains</span>` +
		domains
			.map((d) => {
				const label = d.label ?? d.slug;
				return `<button type="button" data-domain="${esc(d.slug)}" aria-pressed="${selectedDomains.has(d.slug)}"` +
					` class="rounded-full border px-2 py-0.5 text-xs ${selectedDomains.has(d.slug) ? 'border-amber-400 bg-amber-400/10 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}">${esc(label)}</button>`;
			})
			.join('');
}

domainsEl.addEventListener('click', (event) => {
	const chip = (event.target as HTMLElement).closest('button[data-domain]') as HTMLElement | null;
	if (!chip) return;
	const domain = chip.dataset.domain ?? '';
	if (selectedDomains.has(domain)) selectedDomains.delete(domain);
	else selectedDomains.add(domain);
	renderDomains();
	apply();
});

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
	event.preventDefault();
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

// --- header actions ---------------------------------------------------------

renameBtn.addEventListener('click', () => {
	if (!deck || shared) return;
	const next = window.prompt('Rename deck', deck.name)?.trim();
	if (next) {
		mutate((d) => {
			d.name = next;
		});
		nameEl.textContent = next;
	}
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
	nameEl.textContent = deck.name;
	shareBtn.hidden = false;
	saveSharedBtn.hidden = true;
	renderUnknownWarning();
	renderRatio();
	apply();
});

// --- go ---------------------------------------------------------------------

loadDeckFromHash();

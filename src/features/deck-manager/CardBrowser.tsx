// The deck manager's card browser (deck-manager spec): section pills, search,
// the filter dropdown (type, rarity, set, domain chips with the Legend's colors
// preselected), and the cards as art-only faces with a copy chip. Clicking a
// face adds it to its natural section; the chip's +/- add to or pull from the
// focused section; a face can be dragged onto any section.
import { memo, useLayoutEffect, useRef, type DragEvent, type MouseEvent, type RefObject } from 'react';
import { qtyOf, SECTION_CODE, SECTION_KEYS, SECTION_LABELS, type Deck, type SectionKey } from '../../domain/deck.ts';
import { isKnown } from '../../domain/deck-editing.ts';
import { cardPageHref } from '../../domain/deck-return.ts';
import type { DeckRuleIndexes } from '../../domain/deck-rules.ts';
import type { GridEntry } from '../../domain/grid-item.ts';
import { Frame } from '../../ui/organisms/Frame.tsx';
import { useCurrentAddress } from '../../ui/hooks/useCurrentAddress.ts';
import { useRevealWindow } from '../../ui/hooks/useRevealWindow.ts';
import { FaceArt, ICON_MINUS, ICON_PLUS } from './faces.tsx';
import { useBrowserFilters, type DomainEntry } from './useBrowserFilters.ts';

export type { DomainEntry };

export interface BrowserActions {
	/** A plain click on a face (routes, or places a champion while picking). */
	clickFace(slug: string, el: HTMLElement): void;
	plus(slug: string, el: HTMLElement): void;
	minus(slug: string, el: HTMLElement): void;
	focusSection(section: SectionKey): void;
	dragStart(slug: string): void;
	dragEnd(): void;
}

interface CardBrowserProps {
	deck: Deck;
	shared: boolean;
	idx: DeckRuleIndexes;
	cards: GridEntry[];
	searchable: Array<{ entry: GridEntry; text: string }>;
	domains: DomainEntry[];
	legendColors: string[];
	active: SectionKey;
	actions: BrowserActions;
	totalCopies: number;
	onShowDeck: () => void;
	/** The browser's scrolling column, owned by the manager (it scrolls and focuses it). */
	scrollerRef?: RefObject<HTMLElement | null>;
}

function chipText(deck: Deck, idx: DeckRuleIndexes, slug: string): string {
	if (!isKnown(idx, slug)) return '?';
	const parts = SECTION_KEYS.flatMap((section) => {
		const qty = qtyOf(deck[section], slug);
		return qty ? [`${SECTION_CODE[section]}${qty}`] : [];
	});
	return parts.length ? parts.join('·') : '—';
}

function chipTitle(deck: Deck, slug: string): string {
	const parts = SECTION_KEYS.flatMap((section) => {
		const qty = qtyOf(deck[section], slug);
		return qty ? [`${qty} in ${SECTION_LABELS[section]}`] : [];
	});
	return parts.length ? parts.join(' · ') : 'Not in the deck';
}

interface BrowserTileProps {
	entry: GridEntry;
	href: string;
	shared: boolean;
	/** The focused section's name, for the chip buttons' labels. */
	sectionLabel: string;
	/** Where this card's copies are, as the chip shows it. */
	chip: string;
	chipTitle: string;
}

/** One card face. Every prop is a plain value and events are delegated to the
 *  list, so a tile re-renders only when its own copies (or the focused
 *  section) change, not on every deck change (react-best-practices: rerender-memo). */
const BrowserTile = memo(function BrowserTile({ entry, href, shared, sectionLabel, chip, chipTitle }: BrowserTileProps) {
	return (
		<li data-slug={entry.slug} draggable={shared ? undefined : true} className="face group relative aspect-[5/7] cursor-pointer">
			<a href={href} aria-label={entry.name} className="absolute inset-0">
				<FaceArt art={entry.art} />
			</a>
			<div className="face-bar">
				{shared ? (
					<span className="count-chip px-1">{chip}</span>
				) : (
					<>
						<button type="button" data-chip-minus={entry.slug} className="stepper" aria-label={`Pull copies from ${sectionLabel}`}>
							{ICON_MINUS}
						</button>
						<span data-chip-count="" title={chipTitle} className="count-chip min-w-5 text-center">
							{chip}
						</span>
						<button type="button" data-chip-plus={entry.slug} className="stepper" aria-label={`Add copy to ${sectionLabel}`}>
							{ICON_PLUS}
						</button>
					</>
				)}
			</div>
		</li>
	);
});

export function CardBrowser(props: CardBrowserProps) {
	const { deck, shared, idx, cards, searchable, domains, legendColors, active, actions, totalCopies, onShowDeck, scrollerRef } = props;
	const ownScroller = useRef<HTMLElement>(null);
	const scroller = scrollerRef ?? ownScroller;
	const sentinel = useRef<HTMLLIElement>(null);
	const filtersBtn = useRef<HTMLButtonElement>(null);
	const filtersPop = useRef<HTMLDivElement>(null);

	const filters = useBrowserFilters({
		cards,
		searchable,
		idx,
		domains,
		legendColors,
		active,
		onChange: () => scroller.current?.scrollTo({ top: 0 }),
	});
	const { q, type, rarity, set, chosen, shown, results: seq, filtering, activeCount: setCount, domainApplies, filterableDomains: filterable, activeDomains, typeOptions, rarityOptions, setOptions } = filters;
	const shownCount = seq.length.toLocaleString('en-US');
	const total = cards.length.toLocaleString('en-US');

	useRevealWindow({ sentinel, enabled: true, shown, available: seq.length, grow: filters.grow });

	// The dropdown is a native popover in the top layer: place it under its
	// button (right edges aligned), inside the window, and follow the button.
	useLayoutEffect(() => {
		const btn = filtersBtn.current;
		const pop = filtersPop.current;
		if (!btn || !pop) return;
		const place = () => {
			const rect = btn.getBoundingClientRect();
			const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
			const width = Math.min(22 * rem, window.innerWidth - rem);
			const right = Math.min(Math.max(window.innerWidth - rect.right, rem / 2), window.innerWidth - width - rem / 2);
			const top = Math.min(Math.max(rect.bottom + 6, rem / 2), window.innerHeight - 10 * rem);
			pop.style.setProperty('--pop-top', `${Math.round(top)}px`);
			pop.style.setProperty('--pop-right', `${Math.round(right)}px`);
		};
		const onToggle = (event: Event) => {
			if ((event as Event & { newState?: string }).newState === 'open') place();
		};
		const follow = () => {
			if (pop.matches(':popover-open')) place();
		};
		pop.addEventListener('beforetoggle', onToggle);
		window.addEventListener('resize', follow);
		const column = scroller.current;
		column?.addEventListener('scroll', follow, { passive: true });
		return () => {
			pop.removeEventListener('beforetoggle', onToggle);
			window.removeEventListener('resize', follow);
			column?.removeEventListener('scroll', follow);
		};
	}, [scroller]);

	function onListClick(event: MouseEvent<HTMLUListElement>) {
		const target = event.target as HTMLElement;
		const card = target.closest<HTMLElement>('li[data-slug]');
		if (!card) return;
		const slug = card.dataset.slug ?? '';
		const plus = target.closest<HTMLButtonElement>('button[data-chip-plus]');
		const minus = target.closest<HTMLButtonElement>('button[data-chip-minus]');
		if (plus && !plus.disabled) {
			event.preventDefault();
			actions.plus(slug, plus);
			return;
		}
		if (minus && !minus.disabled) {
			event.preventDefault();
			actions.minus(slug, minus);
			return;
		}
		if (shared) return;
		// a keyboard-activated link (detail 0) follows its href to the card page;
		// pointer clicks keep the add shortcut
		if (event.detail === 0) return;
		event.preventDefault();
		actions.clickFace(slug, card);
	}

	function onListDragStart(event: DragEvent<HTMLUListElement>) {
		const slug = (event.target as HTMLElement).closest<HTMLElement>('li[data-slug]')?.dataset.slug;
		if (!slug || shared) {
			event.preventDefault();
			return;
		}
		event.dataTransfer.setData('text/plain', slug);
		actions.dragStart(slug);
	}

	const here = useCurrentAddress();
	const label = SECTION_LABELS[active];

	return (
		<Frame tone="quiet" className="bd-frame min-h-0 min-w-0 flex flex-col">
			<section ref={scroller} id="deck-browser" aria-label="Card browser" tabIndex={-1} className="scroll-column min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
				<div id="bd-chrome" className="browser-chrome">
					<div id="bd-pills" className="flex flex-wrap items-center gap-1.5">
						{SECTION_KEYS.filter((k) => k !== 'side').map((key) => (
							<button key={key} type="button" data-pill={key} aria-pressed={key === active} className="pill" onClick={() => {
									if (key === active) filters.resetType();
									actions.focusSection(key);
								}}>
								{key === 'rune' ? 'Runes' : SECTION_LABELS[key]}
							</button>
						))}
						<button
							type="button"
							data-pill="all"
							aria-pressed="false"
							className="pill"
							onClick={() => filters.setType('')}
						>
							All
						</button>
					</div>
					<div className="mt-2 flex items-center gap-2">
						<input
							id="bd-search"
							className="field min-w-0 flex-1"
							type="search"
							placeholder="Search name or text…"
							aria-label="Search cards by name or card text"
							autoComplete="off"
							value={q}
							onChange={(e) => filters.setQuery(e.target.value)}
						/>
						<button ref={filtersBtn} id="bd-filters-btn" type="button" className="btn shrink-0" popoverTarget="bd-filters">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M2.5 4.5h5M12 4.5h1.5M2.5 11.5h1.5M8.5 11.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
								<circle cx="9.75" cy="4.5" r="1.75" stroke="currentColor" strokeWidth="1.6" />
								<circle cx="6.25" cy="11.5" r="1.75" stroke="currentColor" strokeWidth="1.6" />
							</svg>
							Filters
							<span id="bd-filters-badge" className="filter-badge" hidden={setCount === 0}>
								{setCount > 0 && (
									<>
										{setCount}
										<span className="sr-only"> {setCount === 1 ? 'filter' : 'filters'} set</span>
									</>
								)}
							</span>
						</button>
					</div>
					<div ref={filtersPop} id="bd-filters" popover="auto" role="group" aria-label="Card filters" className="filter-pop">
						<div className="filter-pop-body">
							<div id="bd-domain-group" className="filter-group" hidden={filterable.length === 0}>
								<p id="bd-domains-label" className="label">
									Domains
								</p>
								<div id="bd-domains" role="group" aria-labelledby="bd-domains-label" className="flex flex-wrap items-center gap-1.5">
									{filterable.map((d) => {
										const name = d.label ?? d.slug;
										return (
											<button
												key={d.slug}
												type="button"
												data-domain={d.slug}
												aria-pressed={chosen.has(d.slug)}
												className="pill"
												data-emblem={d.icon ? '' : undefined}
												title={`${name} cards`}
												onClick={() => filters.toggleDomain(d.slug)}
											>
												{d.icon ? <img className="pill-emblem" src={d.icon} alt={name} width="22" height="22" decoding="async" /> : name}
											</button>
										);
									})}
								</div>
							</div>
							<div className="filter-grid">
								<label className="filter-group">
									<span className="label">Type</span>
									<select
										id="bd-type"
										className="field"
										value={type}
										onChange={(e) => filters.setType(e.target.value)}
									>
										<option value="">Any type</option>
										{typeOptions.map((t) => (
											<option key={t} value={t}>
												{t}
											</option>
										))}
									</select>
								</label>
								<label className="filter-group">
									<span className="label">Rarity</span>
									<select
										id="bd-rarity"
										className="field"
										value={rarity}
										onChange={(e) => filters.setRarity(e.target.value)}
									>
										<option value="">All rarities</option>
										{rarityOptions.map((r) => (
											<option key={r} value={r}>
												{r}
											</option>
										))}
									</select>
								</label>
								<label className="filter-group filter-wide">
									<span className="label">Set</span>
									<select
										id="bd-set"
										className="field"
										value={set}
										onChange={(e) => filters.setSet(e.target.value)}
									>
										<option value="">All sets</option>
										{setOptions.map((s) => (
											<option key={s} value={s}>
												{s}
											</option>
										))}
									</select>
								</label>
							</div>
							<div className="filter-foot">
								<p id="bd-filters-count" className="text-xs text-slate-400 tnum">
									{filtering ? `${shownCount} of ${total} cards` : `All ${total} cards`}
								</p>
								<button
									id="bd-reset"
									type="button"
									className="btn"
									data-size="sm"
									onClick={filters.reset}
								>
									Reset
								</button>
							</div>
						</div>
					</div>
				</div>
				<div className="mt-2 flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<p id="bd-count" className="text-xs text-slate-400 tnum" aria-live="polite">
							{filtering ? `Showing ${shownCount} of ${total} cards` : `Showing all ${total} cards`}
						</p>
						{domainApplies && activeDomains.length > 0 ? (
							<span
								id="bd-active-domains"
								className="active-domains"
								role="img"
								aria-label={`Filtered to ${activeDomains.map((d) => d.label ?? d.slug).join(', ')}`}
								title={`Domains: ${activeDomains.map((d) => d.label ?? d.slug).join(', ')}`}
							>
								{activeDomains.map((d) =>
									d.icon ? <img key={d.slug} src={d.icon} alt="" width="16" height="16" data-domain={d.slug} decoding="async" /> : <span key={d.slug}>{d.label ?? d.slug}</span>,
								)}
							</span>
						) : (
							<span id="bd-active-domains" className="active-domains" hidden />
						)}
					</div>
					<button type="button" className="btn lg:hidden" data-size="sm" data-scroll-to="deck-viewer" onClick={onShowDeck}>
						Deck <span id="deck-jump-count" className="tnum">{totalCopies}</span>
					</button>
				</div>
				<ul id="bd-list" className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3" onClick={onListClick} onDragStart={onListDragStart} onDragEnd={() => actions.dragEnd()}>
					{seq.slice(0, shown).map((entry) => (
						<BrowserTile
							key={entry.slug}
							entry={entry}
							href={cardPageHref(entry.slug, here)}
							shared={shared}
							sectionLabel={label}
							chip={chipText(deck, idx, entry.slug)}
							chipTitle={chipTitle(deck, entry.slug)}
						/>
					))}
				</ul>
				<li ref={sentinel} id="bd-sentinel" className="col-span-full" aria-hidden="true" />
				<p id="bd-empty" hidden={seq.length > 0} className="empty-state mt-4">
					No cards match the filters.
				</p>
				<p id="bd-hint" className="mt-2 text-[11px] text-slate-500">
					{shared
						? 'Shared view — save it as your deck to edit, or open any card to read it.'
						: 'Added cards enter the focused section. Copy counts come from the deck panel.'}
				</p>
			</section>
		</Frame>
	);
}

// The deck manager (island, client:load; deck-manager spec). The deck comes
// from the address: #d/<id> opens a saved deck, #s/<payload> a shared one as
// view and copy. The build render and the hydration pass show the neutral
// bar; everything else appears once the deck is open (design D7).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sectionTotal, SECTION_KEYS, type SectionKey } from '../../domain/deck.ts';
import { fitsChampionZone, isChampionUnit, isKnown, legendDomains } from '../../domain/deck-editing.ts';
import { decodeDeck, encodeDeck, hashToPayload, isSharePayload } from '../../domain/deck-share.ts';
import { deckStore, useDeckStore } from '../../state/deck-store.ts';
import { useHash, useManagerData } from './boot.ts';
import { CardBrowser, type DomainEntry } from './CardBrowser.tsx';
import { DeckBar } from './DeckBar.tsx';
import { DeckViewer, useLegality } from './DeckViewer.tsx';
import { CardPeek, type CardPeekHandle } from './peek/CardPeek.tsx';
import { announce, flashFace, flashSection, registerLiveRegion } from './refusals.ts';

export function DeckManager({ domains }: { domains: DomainEntry[] }) {
	const data = useManagerData();
	const hash = useHash();
	const deck = useDeckStore((s) => s.open);
	const shared = useDeckStore((s) => s.shared);
	const status = useDeckStore((s) => s.status);
	const problem = useDeckStore((s) => s.problem);
	const [active, setActive] = useState<SectionKey>('main');
	const [picking, setPicking] = useState(false);
	const [dragging, setDragging] = useState<string | null>(null);
	const [view, setView] = useState<'cards' | 'deck'>('cards');
	const appRef = useRef<HTMLDivElement>(null);
	const browserRef = useRef<HTMLElement>(null);
	const viewerRef = useRef<HTMLElement>(null);
	const peek = useRef<CardPeekHandle>(null);
	const cardsScroll = useRef(0);
	const legal = useLegality(deck, data?.idx ?? null);

	// Open the deck the address names.
	useEffect(() => {
		if (!data) return;
		const store = deckStore().getState();
		store.load();
		if (isSharePayload(hash)) {
			let live = true;
			decodeDeck(hashToPayload(hash)).then(
				({ deck: fromShare, broken }) => {
					if (!live) return;
					if (broken) store.setStatus('broken');
					else store.openShared(fromShare);
				},
				(err) => {
					console.warn('shared deck failed to open', err);
					if (live) store.setStatus('broken');
				},
			);
			return () => {
				live = false;
			};
		}
		const own = /^#d\/(.+)$/.exec(hash);
		if (own && store.openOwned(own[1])) store.seedRunes(data.idx);
		else if (!own) store.setStatus('none');
	}, [data, hash]);

	const idx = data?.idx;
	const store = deckStore().getState;

	/** Every change closes the peek first: the faces are about to be rebuilt. */
	const edit = useCallback(<T,>(fn: () => T): T => {
		peek.current?.deckChanged();
		return fn();
	}, []);

	const unknown = useMemo(() => {
		if (!deck || !data) return [];
		return SECTION_KEYS.flatMap((k) => deck[k].map((s) => s.card))
			.filter((slug) => !isKnown(data.idx, slug))
			.map((slug) => data.bySlug.get(slug)?.name ?? slug)
			.filter((n, i, all) => all.indexOf(n) === i);
	}, [deck, data]);

	const ready = status === 'ready' && deck && data && idx;
	const totalCopies = deck ? SECTION_KEYS.reduce((sum, key) => sum + sectionTotal(deck[key]), 0) : 0;
	const legendColors = deck && idx ? (legendDomains(deck, idx) ?? []) : [];

	return (
		<>
			<DeckBar
				name={ready ? deck.name : null}
				fallbackTitle={status === 'none' ? 'Deck manager' : 'Deck'}
				fallbackMeta={status === 'none' ? 'Open a deck from your deck list, or create one there first — decks always live in your browser.' : '0 cards'}
				shared={shared}
				legal={legal}
				totalCopies={totalCopies}
				active={active}
				onRename={(name) => {
					const done = store().renameOpen(name);
					if (done) announce(`Deck renamed to ${store().open?.name ?? name}`);
					return done;
				}}
				onShare={async () => {
					if (!deck) return;
					const url = `${window.location.origin}/decks/build#s/${await encodeDeck(deck)}`;
					try {
						await navigator.clipboard.writeText(url);
					} catch {
						window.prompt('Copy this deck link', url);
						throw new Error('copied by hand');
					}
				}}
				onSaveShared={() => {
					const adopted = store().adoptShared();
					if (adopted) history.replaceState(null, '', `/decks/build#d/${adopted.id}`);
				}}
			/>

			{/* refusals are visual by nature (the section flashes); this live region
			    carries the same message to screen readers */}
			<p id="deck-live" ref={registerLiveRegion} className="sr-only" role="status" aria-live="polite" />

			<CardPeek ref={peek} root={appRef} />

			<div id="deck-storage-warning" hidden={!ready || shared || !problem} className="callout mt-4" data-tone="warning">
				{problem}
			</div>
			<div id="deck-unknown-warning" hidden={!ready || unknown.length === 0} className="callout mt-4" data-tone="warning">
				{unknown.length > 0 &&
					`${unknown.length} card${unknown.length > 1 ? 's' : ''} in this deck are not in the local snapshot ` +
						`(shared link against different data?): ${unknown.join(', ')}. The deck still opens — fix or remove these cards` +
						(shared ? ' after saving it as your deck.' : ' to make it legal.')}
			</div>
			<p id="deck-missing" hidden={status !== 'missing'} className="empty-state mt-6">
				This deck could not be loaded — it may have been deleted. Head back to{' '}
				<a className="text-amber-300 underline" href="/decks">
					your decks
				</a>
				.
			</p>
			<p id="deck-broken-share" hidden={status !== 'broken'} className="empty-state mt-6">
				This deck link is not a valid deck payload. Ask for the link again — copying it fresh usually fixes it.
			</p>
			<div id="deck-none" hidden={status !== 'none'} className="mt-6">
				<a className="btn" data-variant="primary" href="/decks">
					Go to your decks
				</a>
			</div>

			{/* The two working columns are equal on large screens; each sits in its own frame. */}
			<div ref={appRef} id="deck-app" data-view={view} hidden={!ready} className="mt-1 grid min-h-0 flex-1 gap-6 lg:grid-cols-2 lg:gap-x-2">
				{ready && (
					<>
						<CardBrowser
							key={`${deck.id}:${shared}`}
							deck={deck}
							shared={shared}
							idx={idx}
							cards={data.cards}
							searchable={data.searchable}
							domains={domains}
							legendColors={legendColors}
							active={active}
							totalCopies={totalCopies}
							scrollerRef={browserRef}
							onShowDeck={() => {
								cardsScroll.current = browserRef.current?.scrollTop ?? 0;
								setView('deck');
								viewerRef.current?.focus({ preventScroll: true });
							}}
							actions={{
								clickFace: (slug, el) =>
									edit(() => {
										if (picking) {
											if (!fitsChampionZone(deck, idx, slug)) {
												flashFace(el, 'champion must match the legend');
												return;
											}
											setPicking(false);
											const verdict = store().placeChampion(idx, slug);
											if (!verdict.ok) flashFace(el, verdict.why);
											return;
										}
										const result = store().clickAdd(idx, slug);
										if (!result.ok && result.why && result.section) flashSection(result.section, result.why);
									}),
								plus: (slug, el) =>
									edit(() => {
										const result = store().clickAdd(idx, slug);
										if (!result.ok && result.why && result.section) {
											flashSection(result.section, result.why);
											flashFace(el, result.why === 'this legend is already placed' ? 'already the deck legend' : result.why);
										}
									}),
								minus: (slug, el) =>
									edit(() => {
										const result = store().pullFromAny(idx, slug);
										if (!result.ok && result.section) {
											flashSection(result.section, result.why);
											flashFace(el, result.why);
										}
									}),
								focusSection: (section) => {
									setActive(section);
									browserRef.current?.scrollTo({ top: 0 });
								},
								dragStart: (slug) => setDragging(slug),
								dragEnd: () => setDragging(null),
							}}
						/>
						<aside ref={viewerRef} id="deck-viewer" aria-label="Deck" tabIndex={-1} className="min-h-0 min-w-0 flex flex-col">
							{/* below lg the viewer swaps places with the browser */}
							<div className="pane-switch mb-2 flex items-center justify-between lg:hidden">
								<span className="text-xs font-semibold tracking-[0.08em] uppercase text-slate-400">Deck</span>
								<button
									type="button"
									className="btn"
									data-size="sm"
									data-scroll-to="bd-list"
									onClick={() => {
										setView('cards');
										browserRef.current?.focus({ preventScroll: true });
										browserRef.current?.scrollTo({ top: cardsScroll.current });
									}}
								>
									<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
										<path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
									Back to cards
								</button>
							</div>
							<DeckViewer
								deck={deck}
								shared={shared}
								idx={idx}
								bySlug={data.bySlug}
								domains={domains}
								active={active}
								championPicking={picking}
								dragging={dragging}
								actions={{
									changeQty: (section, slug, delta, el) =>
										edit(() => {
											const verdict = store().changeQty(idx, section, slug, delta);
											if (!verdict.ok && verdict.why) {
												flashSection(section, verdict.why);
												flashFace(el, verdict.why);
											}
										}),
									removeRow: (section, slug) => edit(() => store().removeRow(idx, section, slug)),
									dropOn: (section, slug) =>
										edit(() => {
											setDragging(null);
											const verdict = store().addTo(idx, section, slug);
											if (!verdict.ok && verdict.why) flashSection(section, verdict.why);
										}),
									dropChampion: (slug, zone) =>
										edit(() => {
											setDragging(null);
											if (fitsChampionZone(deck, idx, slug)) {
												const verdict = store().placeChampion(idx, slug);
												if (!verdict.ok) flashFace(zone, verdict.why);
											} else if (isChampionUnit(idx, slug)) {
												flashSection('legend', 'champion must match the legend');
											}
										}),
									toggleChampionPicking: () => setPicking((on) => !on),
									setRuneRatio: (domain, target) => edit(() => store().setRuneRatio(idx, domain, target)),
									focusSection: (section) => {
										setActive(section);
										browserRef.current?.scrollTo({ top: 0 });
									},
								}}
							/>
						</aside>
					</>
				)}
			</div>
		</>
	);
}

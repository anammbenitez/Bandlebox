// The decks, shared by every island on a page (openspec change
// migrate-to-react, design D5/D6): the library list for /decks and the open
// deck for the deck manager. A Zustand store over a DeckRepository, so the
// storage behind it can change later without touching components.
//
// Editing actions take the rule indexes and return a Verdict, so a refused add
// can be shown where it happened. Every accepted change goes through commit():
// the champion pick is settled, the deck saved, the library refreshed.
import { createStore, useStore, type StoreApi } from 'zustand';
import { cleanDeckName, qtyOf, SECTION_KEYS, type Deck, type SectionKey } from '../domain/deck.ts';
import {
	canAdd,
	naturalSection,
	placeChampion as placeChampionRule,
	recolorRunesForLegend,
	seedDefaultRunes,
	setRuneRatio as setRuneRatioRule,
	settleChampion,
	withQty,
	type Verdict,
} from '../domain/deck-editing.ts';
import type { DeckRuleIndexes } from '../domain/deck-rules.ts';
import type { DeckRepository } from '../domain/repositories/deck-repository.ts';
import { localStorageDeckRepository } from '../domain/repositories/local-storage-deck-repository.ts';

/** What the deck manager is showing. */
export type OpenStatus = 'loading' | 'none' | 'missing' | 'broken' | 'ready';

export interface DeckStoreState {
	/** False until the browser's decks have been read (build output and the
	 *  hydration pass render a neutral shell meanwhile). */
	loaded: boolean;
	library: Deck[];
	/** The deck open in the manager. */
	open: Deck | null;
	/** The open deck came from a share link: read-only until saved. */
	shared: boolean;
	/** The one-time "not being saved" message, once taken. */
	problem: string | null;
	status: OpenStatus;

	load(): void;
	create(name: string, legendSlug?: string): Deck;
	rename(id: string, name: string): void;
	remove(id: string): void;

	openOwned(id: string): boolean;
	openShared(deck: Deck): void;
	close(): void;
	/** No deck in the address, or a share link that does not decode. */
	setStatus(status: 'none' | 'broken'): void;
	/** Saves the open shared deck as the reader's own (new identity). */
	adoptShared(): Deck | null;
	/** Renames the open deck; false when nothing changed (blank or same). */
	renameOpen(name: string): boolean;

	addTo(idx: DeckRuleIndexes, section: SectionKey, slug: string): Verdict;
	changeQty(idx: DeckRuleIndexes, section: SectionKey, slug: string, delta: number): Verdict;
	/** Takes every copy of a card out of a section. */
	removeRow(idx: DeckRuleIndexes, section: SectionKey, slug: string): void;
	/** A click on a browser card: to its natural section; another Legend replaces the placed one. */
	clickAdd(idx: DeckRuleIndexes, slug: string): Verdict & { section: SectionKey | null };
	/** The browser chip's minus: natural section first, then wherever copies live. */
	pullFromAny(idx: DeckRuleIndexes, slug: string): Verdict & { section: SectionKey | null };
	placeChampion(idx: DeckRuleIndexes, slug: string): Verdict;
	setRuneRatio(idx: DeckRuleIndexes, domain: string, target: number): void;
	/** Seeds the default rune split for a fresh deck with a Legend. */
	seedRunes(idx: DeckRuleIndexes): void;
}

const OK: Verdict = { ok: true, why: '' };

export function createDeckStore(repo: DeckRepository): StoreApi<DeckStoreState> {
	return createStore<DeckStoreState>()((set, get) => {
		/** Saves an edit of the open (owned) deck. A Legend that is newly placed
		 *  (a different one, or one placed after the last was removed) re-colors
		 *  the rune deck in this same save; removing a Legend leaves the runes. */
		function commit(idx: DeckRuleIndexes, next: Deck): void {
			const placed = next.legend[0]?.card;
			const recolored = placed && placed !== get().open?.legend[0]?.card ? recolorRunesForLegend(next, idx) : next;
			const deck = repo.save(settleChampion(recolored, idx));
			set({ open: deck, library: repo.list() });
		}

		function editable(): Deck | null {
			const { open, shared } = get();
			return open && !shared ? open : null;
		}

		return {
			loaded: false,
			library: [],
			open: null,
			shared: false,
			problem: null,
			status: 'loading',

			load() {
				set({ loaded: true, library: repo.list(), problem: get().problem ?? repo.takeProblem() });
			},
			create(name, legendSlug) {
				const deck = repo.create(name, legendSlug);
				set({ library: repo.list() });
				return deck;
			},
			rename(id, name) {
				repo.rename(id, name);
				set({ library: repo.list() });
			},
			remove(id) {
				repo.remove(id);
				set({ library: repo.list() });
			},

			openOwned(id) {
				const deck = repo.get(id);
				set({ open: deck ?? null, shared: false, status: deck ? 'ready' : 'missing' });
				return Boolean(deck);
			},
			openShared(deck) {
				set({ open: deck, shared: true, status: 'ready' });
			},
			close() {
				set({ open: null, shared: false, status: 'loading' });
			},
			setStatus(status) {
				set({ open: null, shared: false, status });
			},
			adoptShared() {
				const { open, shared } = get();
				if (!open || !shared) return null;
				const adopted = repo.adopt(open);
				set({ open: adopted, shared: false, library: repo.list() });
				return adopted;
			},
			renameOpen(name) {
				const deck = editable();
				const next = cleanDeckName(name);
				if (!deck || next === '' || next === deck.name) return false;
				set({ open: repo.save({ ...deck, name: next }), library: repo.list() });
				return true;
			},

			addTo(idx, section, slug) {
				const deck = editable();
				if (!deck) return { ok: false, why: '' };
				const verdict = canAdd(deck, idx, section, slug);
				if (verdict.ok) commit(idx, withQty(deck, section, slug, qtyOf(deck[section], slug) + 1));
				return verdict;
			},
			changeQty(idx, section, slug, delta) {
				const deck = editable();
				if (!deck) return { ok: false, why: '' };
				if (delta > 0) {
					const verdict = canAdd(deck, idx, section, slug);
					if (!verdict.ok) return verdict;
				}
				commit(idx, withQty(deck, section, slug, qtyOf(deck[section], slug) + delta));
				return OK;
			},
			removeRow(idx, section, slug) {
				const deck = editable();
				if (deck) commit(idx, withQty(deck, section, slug, 0));
			},
			clickAdd(idx, slug) {
				const deck = editable();
				const section = naturalSection(idx, slug);
				if (!deck || !section) return { ok: false, why: '', section };
				if (section === 'legend') {
					const placed = deck.legend[0];
					if (placed && placed.card !== slug) {
						commit(idx, { ...deck, legend: [{ card: slug, qty: 1 }] });
						return { ...OK, section };
					}
					if (placed) return { ok: false, why: 'this legend is already placed', section };
				}
				return { ...get().addTo(idx, section, slug), section };
			},
			pullFromAny(idx, slug) {
				const deck = editable();
				const routed = naturalSection(idx, slug);
				if (!deck) return { ok: false, why: '', section: routed };
				const order = routed ? [routed, ...SECTION_KEYS.filter((s) => s !== routed)] : SECTION_KEYS;
				for (const section of order) {
					const qty = qtyOf(deck[section], slug);
					if (qty > 0) {
						commit(idx, withQty(deck, section, slug, qty - 1));
						return { ...OK, section };
					}
				}
				return { ok: false, why: 'no copies in the deck', section: routed ?? 'main' };
			},
			placeChampion(idx, slug) {
				const deck = editable();
				if (!deck) return { ok: false, why: '' };
				const result = placeChampionRule(deck, idx, slug);
				if (result.verdict.ok) commit(idx, result.deck);
				return result.verdict;
			},
			setRuneRatio(idx, domain, target) {
				const deck = editable();
				if (deck) commit(idx, setRuneRatioRule(deck, idx, domain, target));
			},
			seedRunes(idx) {
				const deck = editable();
				if (!deck) return;
				const seeded = seedDefaultRunes(deck, idx);
				if (seeded !== deck) commit(idx, seeded);
			},
		};
	});
}

let browserStore: StoreApi<DeckStoreState> | null = null;

/** The store every island on the page shares, over the browser's library. */
export function deckStore(): StoreApi<DeckStoreState> {
	browserStore ??= createDeckStore(localStorageDeckRepository);
	return browserStore;
}

/** Subscribe to a narrow slice: a component re-renders only when it changes. */
export function useDeckStore<T>(selector: (state: DeckStoreState) => T): T {
	return useStore(deckStore(), selector);
}

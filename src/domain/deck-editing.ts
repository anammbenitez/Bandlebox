// How a deck is edited (deck-manager spec): which section a card goes to,
// when an add is refused and why, the rune ratio, and the champion pick.
// Extracted from the pre-React deck builder script (openspec change
// migrate-to-react, task 7.1) so the deck store and its tests share one set of
// rules. Pure: every function takes the deck and the rule indexes and returns a
// new deck or a verdict; nothing here touches the DOM or storage.

import { DECK_RULES, qtyOf, SECTION_CARD_TYPES, setQty, type Deck, type SectionKey } from './deck.ts';
import { legendChampionTag, type DeckRuleIndexes } from './deck-rules.ts';

export interface Verdict {
	ok: boolean;
	/** Why an add was refused (shown on the section and read aloud). */
	why: string;
}

const OK: Verdict = { ok: true, why: '' };

export function isKnown(idx: DeckRuleIndexes, slug: string): boolean {
	return Boolean(idx.cards[slug]);
}

export function copyLimit(idx: DeckRuleIndexes, slug: string): number {
	return idx.cards[slug]?.maxCopiesOverride ?? DECK_RULES.maxCopies;
}

function typeAllowed(section: SectionKey, types: string[] | undefined): boolean {
	return Boolean(types?.some((t) => SECTION_CARD_TYPES[section].includes(t)));
}

/** The colors of the deck's Legend, or null without a Legend. */
export function legendDomains(deck: Deck, idx: DeckRuleIndexes): string[] | null {
	const slug = deck.legend[0]?.card;
	return slug ? (idx.cards[slug]?.domains ?? null) : null;
}

/** Whether one more copy of a card may go into a section. */
export function canAdd(deck: Deck, idx: DeckRuleIndexes, section: SectionKey, slug: string): Verdict {
	const info = idx.cards[slug];
	if (!isKnown(idx, slug)) return { ok: false, why: 'not in this snapshot' };
	if (!typeAllowed(section, info?.types)) return { ok: false, why: 'card type does not fit this section' };
	switch (section) {
		case 'legend':
			return deck.legend.length > 0 ? { ok: false, why: `a deck runs exactly ${DECK_RULES.legends} legend` } : OK;
		case 'battlefields':
			return qtyOf(deck.battlefields, slug) >= 1 ? { ok: false, why: 'battlefields are distinct picks' } : OK;
		case 'main':
		case 'side': {
			const limit = copyLimit(idx, slug);
			return qtyOf(deck[section], slug) + 1 > limit ? { ok: false, why: `copy limit ${limit}` } : OK;
		}
		case 'rune':
			return OK; // the rune ratio is uncapped by rule
	}
}

/** Where a click sends a card: single-placement types own their section;
 *  main-legal cards go to the main deck (the side is reached by drag). */
export function naturalSection(idx: DeckRuleIndexes, slug: string): SectionKey | null {
	const info = idx.cards[slug];
	if (!info) return null;
	if (info.types.includes('legend')) return 'legend';
	if (info.types.includes('rune')) return 'rune';
	if (info.types.includes('battlefield')) return 'battlefields';
	if (info.types.some((t) => ['unit', 'spell', 'gear'].includes(t))) return 'main';
	return null;
}

export function withQty(deck: Deck, section: SectionKey, slug: string, qty: number): Deck {
	return { ...deck, [section]: setQty(deck[section], slug, qty) };
}

export function isChampionUnit(idx: DeckRuleIndexes, slug: string): boolean {
	const info = idx.cards[slug];
	return Boolean(info?.types.includes('unit') && info.superTypes.includes('champion'));
}

/** Whether a card may sit in the champion zone: a champion unit carrying the
 *  Legend's champion tag. The tag is the legality checker's own
 *  (`legendChampionTag` in deck-rules.ts), so the zone and the checklist's
 *  champion-unit rule can never judge a card differently. */
export function fitsChampionZone(deck: Deck, idx: DeckRuleIndexes, slug: string): boolean {
	const tag = legendChampionTag(idx.cards[deck.legend[0]?.card ?? ''], idx.championTags);
	return isChampionUnit(idx, slug) && Boolean(tag && idx.cards[slug]?.tags.includes(tag));
}

/** After any change: the pick follows its main-deck copies and the Legend's
 *  tag, so it clears when its copies all leave or the Legend stops matching. */
export function settleChampion(deck: Deck, idx: DeckRuleIndexes): Deck {
	if (deck.champion && (qtyOf(deck.main, deck.champion) === 0 || !fitsChampionZone(deck, idx, deck.champion))) {
		const { champion: _gone, ...rest } = deck;
		return rest;
	}
	return deck;
}

/** Places the champion pick and one main-deck copy in one change. */
export function placeChampion(deck: Deck, idx: DeckRuleIndexes, slug: string): { deck: Deck; verdict: Verdict } {
	if (!fitsChampionZone(deck, idx, slug)) return { deck, verdict: { ok: false, why: 'champion must match the legend' } };
	const verdict = canAdd(deck, idx, 'main', slug);
	if (!verdict.ok) return { deck, verdict };
	return { deck: { ...withQty(deck, 'main', slug, qtyOf(deck.main, slug) + 1), champion: slug }, verdict: OK };
}

/** Copies of a color across the rune deck. */
export function runeCopiesFor(deck: Deck, idx: DeckRuleIndexes, domain: string): number {
	return deck.rune.reduce((sum, slot) => sum + ((idx.cards[slot.card]?.domains ?? []).includes(domain) ? slot.qty : 0), 0);
}

/** Sets a color's rune total: raising fills that color's canonical rune card,
 *  lowering pulls surplus from the largest piles first. */
export function setRuneRatio(deck: Deck, idx: DeckRuleIndexes, domain: string, target: number): Deck {
	let rune = deck.rune;
	const current = runeCopiesFor(deck, idx, domain);
	if (target > current) {
		const canonical = `${domain}-rune`;
		const slug = isKnown(idx, canonical)
			? canonical
			: Object.keys(idx.cards).find((s) => (idx.cards[s]?.types ?? []).includes('rune') && (idx.cards[s]?.domains ?? []).includes(domain));
		if (slug) rune = setQty(rune, slug, qtyOf(rune, slug) + (target - current));
	} else if (target < current) {
		let surplus = current - target;
		const sameColor = rune
			.filter((slot) => (idx.cards[slot.card]?.domains ?? []).includes(domain))
			.sort((a, b) => b.qty - a.qty || a.card.localeCompare(b.card));
		for (const slot of sameColor) {
			if (surplus <= 0) break;
			const take = Math.min(slot.qty, surplus);
			rune = setQty(rune, slot.card, slot.qty - take);
			surplus -= take;
		}
	}
	return { ...deck, rune };
}

/** A fresh empty rune deck with a Legend starts split evenly across its
 *  colors (6 and 6 for two colors). Existing runes are never replaced. */
export function seedDefaultRunes(deck: Deck, idx: DeckRuleIndexes): Deck {
	if (deck.rune.length > 0) return deck;
	const colors = legendDomains(deck, idx) ?? [];
	if (colors.length === 0) return deck;
	const per = Math.floor(DECK_RULES.runeSize / colors.length);
	const leftovers = DECK_RULES.runeSize - per * colors.length;
	let rune = deck.rune;
	colors.forEach((domain, i) => {
		const canonical = `${domain}-rune`;
		const target = per + (i < leftovers ? 1 : 0);
		if (target > 0 && isKnown(idx, canonical)) rune = setQty(rune, canonical, target);
	});
	return rune === deck.rune ? deck : { ...deck, rune };
}

/** The rune deck after the Legend changed: re-colored to the Legend's colors.
 *
 *  Call it with the deck that already holds the new Legend. The rune deck's
 *  total is always preserved (12, 10, 8, whatever it was). Let the Legend's
 *  colors be [c1, c2]. Every rune of another color is deleted (a multi-domain
 *  rune card is kept when any of its domains is a Legend color, otherwise
 *  deleted and counted under its first domain). Each new color keeps the count
 *  the deck already has of that same color; a color with no count yet takes, by
 *  position, the count of a deleted color (deleted colors in the order they
 *  stand in the rune deck, each count once). Any deleted count still left over
 *  is added to the Legend's colors in order, round-robin from the first, so the
 *  total never shrinks. Fury 8 / Chaos 4 under Fury + Calm becomes Fury 8 /
 *  Calm 4; under Calm + Mind, Calm 8 / Mind 4. Fury 5 / Chaos 4 / Order 3
 *  under Fury + Calm: Calm takes Chaos' 4, the 3 left over go Fury, Calm, Fury:
 *  Fury 7 / Calm 5. Fury 6 / Calm 4 / Chaos 2 becomes Fury 7 / Calm 5.
 *  A one-color Legend gets the whole preserved total in its color.
 *  Same-color counts are kept as they are, and nothing is deleted from them: 12
 *  Fury under Fury + Calm stays Fury 12 / Calm 0 (the slider moves it).
 *  An empty rune deck gets the default even split of 12. A Legend with no
 *  known color leaves the runes alone, as there is nothing to color them by. A
 *  deck whose runes already match is returned as it is. */
export function recolorRunesForLegend(deck: Deck, idx: DeckRuleIndexes): Deck {
	const colors = [...new Set(legendDomains(deck, idx) ?? [])];
	if (colors.length === 0) return deck;
	if (deck.rune.length === 0) return seedDefaultRunes(deck, idx);
	const wears = (card: string) => (idx.cards[card]?.domains ?? []).some((d) => colors.includes(d));

	// deleted colors, in rune-deck order, with their counts
	const deletedByColor = new Map<string, number>();
	for (const slot of deck.rune) {
		if (wears(slot.card)) continue;
		const own = (idx.cards[slot.card]?.domains ?? [])[0] ?? slot.card;
		deletedByColor.set(own, (deletedByColor.get(own) ?? 0) + slot.qty);
	}
	if (deletedByColor.size === 0) return deck;

	let next: Deck = { ...deck, rune: deck.rune.filter((slot) => wears(slot.card)) };
	const spare = [...deletedByColor.values()];
	for (const color of colors) {
		if (runeCopiesFor(deck, idx, color) > 0) continue;
		const take = spare.shift();
		if (take) next = setRuneRatio(next, idx, color, take);
	}
	const leftover = spare.reduce((sum, n) => sum + n, 0);
	const extra = new Map<string, number>();
	for (let i = 0; i < leftover; i++) {
		const color = colors[i % colors.length]!;
		extra.set(color, (extra.get(color) ?? 0) + 1);
	}
	for (const [color, add] of extra) next = setRuneRatio(next, idx, color, runeCopiesFor(next, idx, color) + add);

	const sum = (d: Deck) => d.rune.reduce((n, slot) => n + slot.qty, 0);
	return sum(next) === sum(deck) ? next : deck; // no rune card to hold a color: leave the runes alone
}

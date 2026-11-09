// src/domain/deck-fit.ts — how one card sits in the open deck: color identity
// against the Legend, champion tag against the Legend, copies held against the
// copy limit, and the Constructed ban. This is what the deck manager's card
// peek prints under a card's facts (spec: card-peek).
//
// Every verdict calls the same decision the legality checklist uses
// (deck-rules.ts), so the peek and the checklist cannot disagree. Pure: no
// data imports and no DOM, so it runs in the browser and under the Node verify
// scripts (explicit .ts extensions on relative imports).

import { DECK_RULES, qtyOf, SECTION_KEYS, SECTION_LABELS, type Deck, type SectionKey } from './deck.ts';
import { domainVerdict, legendChampionTag, type DeckRuleIndexes } from './deck-rules.ts';

/** Color identity of a card against the deck's Legend. */
export type ColorFit =
	| { state: 'fits' }
	/** Some domain is outside the Legend's colors. */
	| { state: 'off'; legendColors: string[] }
	/** No Legend placed yet, so nothing can be judged wrong. */
	| { state: 'pending' }
	/** The card has no domain data at all (still fails the checklist's rule). */
	| { state: 'unclassified' }
	/** Battlefields and Legends are not judged by color. */
	| { state: 'n/a' };

/** A champion unit's tag against the Legend's champion tag. */
export type ChampionFit =
	| { state: 'match'; tag: string }
	| { state: 'mismatch'; tag: string | null }
	| { state: 'pending' }
	/** Not a champion unit: no tag line at all. */
	| { state: 'n/a' };

export interface DeckFit {
	/** False when the slug is not in the rule indexes (a shared deck against other data). */
	known: boolean;
	color: ColorFit;
	champion: ChampionFit;
	/** Sections currently holding the card, in deck order, with their copy counts. */
	held: Array<{ section: SectionKey; qty: number }>;
	/** Copies the card may run: its own override or the standard cap, 1 for a
	 *  Legend or battlefield, null for runes (any ratio of the Legend's colors). */
	limit: number | null;
	banned: boolean;
}

/** One printed line of the peek's "in this deck" block. `bad` is a rule problem
 *  (outside the colors, over the limit, banned); `muted` is information. */
export interface FitLine {
	tone: 'good' | 'bad' | 'muted';
	text: string;
}

export interface FitLabels {
	/** Display name of a domain slug; defaults to the slug itself. */
	domain?: (slug: string) => string;
	/** Display name of a section; defaults to the deck's own section labels. */
	section?: (key: SectionKey) => string;
}

/** The words the peek prints under a card's facts, from its DeckFit. Order is
 *  by consequence: a ban first, then colors, champion tag, then copies. */
export function fitLines(fit: DeckFit, labels: FitLabels = {}): FitLine[] {
	const domain = labels.domain ?? ((slug: string) => slug);
	const section = labels.section ?? ((key: SectionKey) => SECTION_LABELS[key]);
	const lines: FitLine[] = [];

	if (!fit.known) {
		lines.push({ tone: 'muted', text: 'Not in this snapshot, so it cannot be checked against the deck' });
	}
	if (fit.banned) lines.push({ tone: 'bad', text: 'Banned in Constructed' });

	switch (fit.color.state) {
		case 'fits':
			lines.push({ tone: 'good', text: "Fits your Legend's colors" });
			break;
		case 'off':
			lines.push({
				tone: 'bad',
				text: `Outside your Legend's colors (${fit.color.legendColors.map(domain).join(' and ')})`,
			});
			break;
		case 'pending':
			lines.push({ tone: 'muted', text: 'Colors depend on your Legend, so choose one first' });
			break;
		case 'unclassified':
			lines.push({ tone: 'bad', text: 'No color data for this card' });
			break;
		case 'n/a':
			break;
	}

	switch (fit.champion.state) {
		case 'match':
			lines.push({ tone: 'good', text: `Champion tag ${fit.champion.tag} matches your Legend` });
			break;
		case 'mismatch':
			lines.push({
				tone: 'muted',
				text: fit.champion.tag
					? `Does not share your Legend's champion tag (${fit.champion.tag})`
					: "Does not share your Legend's champion tag",
			});
			break;
		case 'pending':
			lines.push({ tone: 'muted', text: 'Champion tag depends on your Legend' });
			break;
		case 'n/a':
			break;
	}

	if (fit.known) {
		const held = fit.held.map((h) => `${h.qty} in ${section(h.section)}`).join(', ');
		const limit = fit.limit === null ? 'no copy limit' : `limit ${fit.limit}`;
		const over = fit.limit !== null && fit.held.some((h) => h.qty > (fit.limit as number));
		lines.push({
			tone: over ? 'bad' : 'muted',
			text: `${fit.held.length ? held : 'Not in the deck'} · ${limit}`,
		});
	}
	return lines;
}

/** Copy limit shown to the player. Mirrors what the section gates enforce:
 *  one Legend, one of each battlefield, uncapped runes, else the card's cap. */
function copyLimitFor(types: string[], maxCopiesOverride: number | null): number | null {
	if (types.includes('rune')) return null;
	if (types.includes('battlefield')) return 1;
	if (types.includes('legend')) return DECK_RULES.legends;
	return maxCopiesOverride ?? DECK_RULES.maxCopies;
}

/** The deck-aware facts for one card. A null deck reads as an empty deck. */
export function deckFit(slug: string, deck: Deck | null, idx: DeckRuleIndexes): DeckFit {
	const info = idx.cards[slug];
	const held = deck
		? SECTION_KEYS.flatMap((section) => {
				const qty = qtyOf(deck[section], slug);
				return qty > 0 ? [{ section, qty }] : [];
			})
		: [];
	if (!info) {
		return { known: false, color: { state: 'n/a' }, champion: { state: 'n/a' }, held, limit: null, banned: false };
	}

	const legendSlug = deck?.legend[0]?.card;
	const legendInfo = legendSlug ? idx.cards[legendSlug] : undefined;
	const hasLegend = Boolean(legendInfo);

	let color: ColorFit;
	if (info.types.includes('battlefield') || info.types.includes('legend')) {
		color = { state: 'n/a' };
	} else if (!legendInfo) {
		color = { state: 'pending' };
	} else {
		const verdict = domainVerdict(info, legendInfo.domains);
		color =
			verdict === 'fits'
				? { state: 'fits' }
				: verdict === 'off'
					? { state: 'off', legendColors: [...legendInfo.domains] }
					: { state: 'unclassified' };
	}

	let champion: ChampionFit;
	if (!(info.types.includes('unit') && info.superTypes.includes('champion'))) {
		champion = { state: 'n/a' };
	} else if (!hasLegend) {
		champion = { state: 'pending' };
	} else {
		const legendTag = legendChampionTag(legendInfo, idx.championTags);
		champion = info.tags.includes(legendTag ?? '')
			? { state: 'match', tag: legendTag as string }
			: { state: 'mismatch', tag: legendTag ?? null };
	}

	return {
		known: true,
		color,
		champion,
		held,
		limit: copyLimitFor(info.types, info.maxCopiesOverride),
		banned: info.banned,
	};
}

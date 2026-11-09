// Legality checker (design.md D4): pure functions over (deck, indexes).
// Deck mode is side-effect entry of the rules engine — rules per
// specs/deck-legality, structure per design.md. No data imports: the caller
// (a page's server front matter) builds indexes from the local snapshot and
// passes them in, so this stays client- and Node-verifiable.

import {
	DECK_RULES,
	type Deck,
	type DeckSlot,
	type SectionKey,
	SECTION_KEYS,
	sectionTotal,
} from './deck.ts';

export interface CardInfo {
	types: string[];
	superTypes: string[];
	domains: string[];
	tags: string[];
	maxCopiesOverride: number | null;
	banned: boolean;
}

/** Everything validate() needs, serialized straight from the snapshot. */
export interface DeckRuleIndexes {
	/** slug -> per-card fact sheet (missing entries mean unknown card). */
	cards: Record<string, CardInfo>;
	/** slug -> display name; unknown slugs are reported by the known-cards rule. */
	names: Record<string, string>;
	/** Tags that appear on champion units anywhere in the snapshot — used to
	 *  find the Legend's champion tag robustly (its first such tag). */
	championTags: string[];
}

interface SnapshotLike {
	cards: Record<string, {
		types?: string[];
		superTypes?: string[];
		domains?: string[];
		tags?: string[];
		bans?: Array<{ formatId?: string; formatName?: string } | string>;
		maxCopiesOverride?: number | null;
	} | undefined>;
}

interface IndexLike {
	cards: Array<{ cardId: string; slug: string; name: string; types: string[]; printings: Array<{ rarity: string | null }> }>;
}

/** Construct deck-rule indexes from the OpenRift snapshot + derived index. */
export function buildDeckRuleIndexes(snapshot: SnapshotLike, derived: IndexLike): DeckRuleIndexes {
	const cards: Record<string, CardInfo> = {};
	const names: Record<string, string> = {};
	const championTags = new Set<string>();
	for (const card of derived.cards) {
		const info = snapshot.cards[card.cardId];
		cards[card.slug] = {
			types: info?.types ?? card.types ?? [],
			superTypes: info?.superTypes ?? [],
			domains: info?.domains ?? [],
			tags: info?.tags ?? [],
			maxCopiesOverride: info?.maxCopiesOverride ?? null,
			banned: (info?.bans ?? []).some((ban) =>
				typeof ban === 'string' ? ban === 'standard' : ban?.formatId === 'standard' || ban?.formatName === 'Constructed',
			),
		};
		names[card.slug] = card.name;
		if (cards[card.slug].superTypes.includes('champion')) {
			for (const tag of cards[card.slug].tags) championTags.add(tag);
		}
	}
	return { cards, names, championTags: [...championTags] };
}

export type RuleStatus = 'pass' | 'fail' | 'pending';

export interface RuleResult {
	/** Stable rule id, e.g. 'main-size'. */
	id: string;
	/** Human label as shown in the checklist. */
	label: string;
	status: RuleStatus;
	/** Why it failed or what it needs; card names for inclusion rules. */
	detail: string;
	/** Offending card display names. */
	failures: string[];
}

export interface LegalityReport {
	legal: boolean;
	rules: RuleResult[];
}

function slugCount(slots: DeckSlot[]): Map<string, number> {
	return new Map(slots.map((s) => [s.card, s.qty]));
}

/** Neutral-domain (generic) cards are legal in every deck (spec: deck-legality,
 *  neutral domain); a card missing domain data entirely is unclassified and
 *  still fails the domain rule — only a PRESENT neutral domain widens scope. */
export function isLegalEverywhere(info: CardInfo | undefined): boolean {
	if (!info) return false;
	return info.domains.includes('neutral');
}

/** How a card sits against a Legend's rune colors (spec: deck-legality domain
 *  identity). `unclassified` = no domain data at all, which still fails the rule;
 *  `fits` includes neutral-domain cards; `off` = some domain is outside the Legend's.
 *  The legality checklist and the card peek both read this one decision. */
export type DomainVerdict = 'fits' | 'off' | 'unclassified';

export function domainVerdict(info: CardInfo, legendDomains: ReadonlySet<string> | readonly string[]): DomainVerdict {
	if (info.domains.length === 0) return 'unclassified';
	if (isLegalEverywhere(info)) return 'fits';
	const allowed = legendDomains instanceof Set ? legendDomains : new Set(legendDomains);
	return info.domains.some((d) => !allowed.has(d)) ? 'off' : 'fits';
}

/** The Legend's champion tag: its first tag that appears on a champion unit anywhere
 *  in the snapshot, else its first tag. A champion unit must carry this tag. */
export function legendChampionTag(legendInfo: CardInfo | undefined, championTags: readonly string[]): string | undefined {
	const known = new Set(championTags);
	return legendInfo?.tags?.find((tag) => known.has(tag)) ?? legendInfo?.tags?.[0];
}

const CARD_SECTIONS: SectionKey[] = ['main', 'rune', 'side'];

export function validate(deck: Deck, idx: DeckRuleIndexes): LegalityReport {
	const infoOf = (slug: string) => idx.cards[slug];
	const nameOf = (slug: string) => idx.names[slug] ?? slug;

	const legendInfo = deck.legend.length ? infoOf(deck.legend[0].card) : undefined;
	const legendDomains = new Set(legendInfo?.domains ?? []);
	const legendTag = legendChampionTag(legendInfo, idx.championTags);

	const rules: RuleResult[] = [];

	/* --- structure --- */

	rules.push({
		id: 'legend-count',
		label: `Legend: exactly ${DECK_RULES.legends}`,
		status: deck.legend.length === DECK_RULES.legends && sectionTotal(deck.legend) === DECK_RULES.legends ? 'pass' : 'fail',
		detail:
			deck.legend.length === DECK_RULES.legends && sectionTotal(deck.legend) === DECK_RULES.legends
				? '1 legend in the Legend zone'
				: `${sectionTotal(deck.legend)} legend cop${sectionTotal(deck.legend) === 1 ? 'y' : 'ies'} across ${deck.legend.length} card${deck.legend.length === 1 ? '' : 's'}`,
		failures: deck.legend.filter((slot) => slot.qty > 1).map((slot) => `${nameOf(slot.card)} (${slot.qty} copies — 1 max)`),
	});

	const mainCount = sectionTotal(deck.main);
	rules.push({
		id: 'main-size',
		label: `Main deck: exactly ${DECK_RULES.mainSize}`,
		status: mainCount === DECK_RULES.mainSize ? 'pass' : 'fail',
		detail: `${mainCount} of ${DECK_RULES.mainSize}`,
		failures: [],
	});

	const runeCount = sectionTotal(deck.rune);
	rules.push({
		id: 'rune-size',
		label: `Rune deck: exactly ${DECK_RULES.runeSize}`,
		status: runeCount === DECK_RULES.runeSize ? 'pass' : 'fail',
		detail: `${runeCount} of ${DECK_RULES.runeSize}`,
		failures: [],
	});

	const battlefieldSlots = deck.battlefields.slice();
	rules.push({
		id: 'battlefield-count',
		label: `Battlefields: exactly ${DECK_RULES.battlefieldCount} distinct`,
		status:
			sectionTotal(deck.battlefields) === DECK_RULES.battlefieldCount &&
			new Set(deck.battlefields.map((s) => s.card)).size === deck.battlefields.length &&
			!deck.battlefields.some((s) => s.qty > 1)
				? 'pass'
				: 'fail',
		detail: deck.battlefields.some((s) => s.qty > 1)
			? 'battlefields take one copy each'
			: new Set(deck.battlefields.map((s) => s.card)).size < deck.battlefields.length
				? 'the same battlefield was picked more than once'
				: `${deck.battlefields.length} of ${DECK_RULES.battlefieldCount}`,
		failures: battlefieldSlots
			.filter((slot) => slot.qty > 1)
			.map((slot) => `${nameOf(slot.card)} (${slot.qty} copies — 1 max)`),
	});

	const sideCount = sectionTotal(deck.side);
	rules.push({
		id: 'side-size',
		label: `Side deck: at most ${DECK_RULES.sideLimit}`,
		status: sideCount <= DECK_RULES.sideLimit ? 'pass' : 'fail',
		detail: `${sideCount} of a possible ${DECK_RULES.sideLimit}`,
		failures: [],
	});

	/* --- copy limits (main deck + side deck; rune ratio is uncapped) --- */

	const copyFailures: string[] = [];
	let copyDetail = `up to ${DECK_RULES.maxCopies} copies per card`;
	for (const section of ['main', 'side'] as SectionKey[]) {
		for (const [slug, qty] of slugCount(deck[section])) {
			const limit = infoOf(slug)?.maxCopiesOverride ?? DECK_RULES.maxCopies;
			if (qty > limit) {
				copyFailures.push(`${nameOf(slug)} (limit ${limit}, has ${qty})`);
				copyDetail = `a card cannot exceed its copy limit`;
			}
		}
	}
	rules.push({
		id: 'copy-limit',
		label: 'Copy limits',
		status: copyFailures.length ? 'fail' : 'pass',
		detail: copyFailures.length ? copyDetail : copyDetail,
		failures: copyFailures,
	});

	/* --- domain identity (main, side, rune — battlefields are any color) --- */

	if (!legendInfo) {
		rules.push({
			id: 'domain-identity',
			label: 'Domain identity',
			status: 'pending',
			detail: 'pends on the Legend — its rune colors decide which cards are legal',
			failures: [],
		});
	} else {
		const domainFailures: string[] = [];
		for (const section of CARD_SECTIONS) {
			for (const [slug] of slugCount(deck[section])) {
				const info = infoOf(slug);
				if (!info) continue; // unknown cards fail the known-cards rule below
				const verdict = domainVerdict(info, legendDomains); // neutral domain: legal in every deck
				if (verdict === 'unclassified') {
					domainFailures.push(`${nameOf(slug)} (no domain data — unclassifiable)`);
					continue;
				}
				if (verdict === 'off') domainFailures.push(nameOf(slug));
			}
		}
		rules.push({
			id: 'domain-identity',
			label: 'Domain identity',
			status: domainFailures.length ? 'fail' : 'pass',
			detail: domainFailures.length
				? 'cards outside the Legend\'s rune colors'
				: 'every card matches the Legend\'s rune colors',
			failures: domainFailures,
		});
	}

	/* --- champion unit (units only, tag = the legend's first tag) --- */

	if (!legendInfo) {
		rules.push({
			id: 'champion-unit',
			label: 'Champion unit',
			status: 'pending',
			detail: 'pends on the Legend — its name tag must match a main-deck unit',
			failures: [],
		});
	} else {
		const championSlugs: string[] = [];
		for (const [slug, qty] of slugCount(deck.main)) {
			const info = infoOf(slug);
			if (!info) continue;
			const isChampion = info.types.includes('unit') && info.superTypes.includes('champion');
			const tagMatches = info.tags.includes(legendTag ?? '');
			if (isChampion && tagMatches) championSlugs.push(slug);
			void qty;
		}
		rules.push({
			id: 'champion-unit',
			label: 'Champion unit',
			status: championSlugs.length ? 'pass' : 'fail',
			detail: championSlugs.length
				? `${championSlugs.length} champion unit${championSlugs.length > 1 ? 's' : ''} matching the Legend's tag`
				: `no main-deck unit sharing the Legend's tag "${legendTag ?? ''}"`,
			failures: [],
		});
	}

	/* --- signature cap: at most 3 total per champion tag --- */

	const sigByTag = new Map<string, number>();
	const sigFailures: string[] = [];
	for (const section of ['main', 'side'] as SectionKey[]) {
		for (const [slug, qty] of slugCount(deck[section])) {
			const info = infoOf(slug);
			if (!info || !info.superTypes.includes('signature')) continue;
			const tag = info.tags[0] ?? 'unknown';
			const total = (sigByTag.get(tag) ?? 0) + qty;
			sigByTag.set(tag, total);
			if (total > DECK_RULES.maxCopies) sigFailures.push(`${nameOf(slug)} (tag "${tag}" over ${DECK_RULES.maxCopies})`);
		}
	}
	rules.push({
		id: 'signature-cap',
		label: `Signature cards: ${DECK_RULES.maxCopies} per tag`,
		status: sigFailures.length ? 'fail' : 'pass',
		detail: sigFailures.length ? 'too many signature copies on one tag' : 'within the signature cap',
		failures: sigFailures,
	});

	/* --- Constructed bans --- */

	const banFailures: string[] = [];
	for (const section of SECTION_KEYS) {
		for (const [slug] of slugCount(deck[section])) {
			if (infoOf(slug)?.banned) banFailures.push(`${nameOf(slug)} (banned in Constructed)`);
		}
	}
	rules.push({
		id: 'bans',
		label: 'Constructed bans',
		status: banFailures.length ? 'fail' : 'pass',
		detail: banFailures.length ? 'banned cards are in the deck' : 'no banned cards',
		failures: banFailures,
	});

	/* --- every referenced card resolves in this snapshot --- */

	const unknownFailures: string[] = [];
	for (const section of SECTION_KEYS) {
		for (const slug of slugCount(deck[section]).keys()) {
			if (!idx.cards[slug]) unknownFailures.push(nameOf(slug));
		}
	}
	rules.push({
		id: 'known-cards',
		label: 'Cards match this snapshot',
		status: unknownFailures.length ? 'fail' : 'pass',
		detail: unknownFailures.length ? 'not in the local snapshot (shared deck with newer/older data?)' : 'every card resolves',
		failures: unknownFailures,
	});

	const legal = rules.every((r) => r.status === 'pass');
	return { legal, rules };
}

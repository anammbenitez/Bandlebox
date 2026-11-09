// Builds the card detail page's data from the snapshot (build time only).
// Same derivations the Astro page used to do inline, moved here so the React
// components receive finished labels (see domain/card-detail.ts).

import { cardStats } from '../domain/card-stats.ts';
import type { CardDetailData, CardDetailPrinting } from '../domain/card-detail.ts';
import {
	cardByUuid,
	channelLabels,
	domainLabels,
	enumLabel,
	errataOf,
	index,
	isBattlefield,
	markerLabels,
	representativePrinting,
	setPrimaryRelease,
	snapshot,
	type IndexCard,
	type IndexSet,
	type PrintingRecord,
} from './catalog.ts';

const releaseSort = (a: IndexSet, b: IndexSet) => {
	const ra = setPrimaryRelease(a)?.releasedAt ?? '9999-99-99';
	const rb = setPrimaryRelease(b)?.releasedAt ?? '9999-99-99';
	return ra.localeCompare(rb) || a.name.localeCompare(b.name);
};

function printingOf(card: IndexCard, set: IndexSet, printing: PrintingRecord, i: number): CardDetailPrinting {
	const side2 = printing.side2 ? cardByUuid.get(printing.side2.cardId) : undefined;
	return {
		key: `${set.slug}-${i}`,
		code: printing.publicCode ?? printing.shortCode ?? '—',
		altCode: printing.publicCode ?? printing.shortCode ?? set.slug,
		rarity: enumLabel('rarities', printing.rarity),
		finish: enumLabel('finishes', printing.finish),
		artVariant: printing.artVariant && printing.artVariant !== 'normal' ? enumLabel('artVariants', printing.artVariant) : null,
		isSigned: Boolean(printing.isSigned),
		isOvernumbered: Boolean(printing.isOvernumbered),
		size: printing.size && printing.size !== 'standard' ? enumLabel('cardSizes', printing.size) : null,
		printedName: printing.printedName && printing.printedName !== card.name ? printing.printedName : null,
		artist: printing.artist ?? null,
		language: enumLabel('languages', printing.language),
		channels: channelLabels(printing.distributionChannels),
		markers: markerLabels(printing.markers),
		comment: printing.comment ?? null,
		thumbImageId: printing.images?.[0]?.imageId ?? null,
		side2: printing.side2
			? {
					name: printing.side2.printedName ?? side2?.name ?? 'unknown card',
					slug: side2?.slug ?? null,
					publicCode: printing.side2.publicCode ?? null,
				}
			: null,
	};
}

export function buildCardDetail(card: IndexCard): CardDetailData {
	const record = snapshot.cards[card.cardId];
	const errata = errataOf(record);
	const primaryIndex = representativePrinting(card);
	const primaryPrint = primaryIndex ? snapshot.printings[primaryIndex.printingId] : undefined;
	const shownImageId = primaryIndex?.imageIds[0];

	const bySet = new Map<string, PrintingRecord[]>();
	for (const printing of card.printings) {
		const list = bySet.get(printing.setSlug) ?? [];
		const found = snapshot.printings[printing.printingId];
		if (found) list.push(found);
		bySet.set(printing.setSlug, list);
	}

	return {
		slug: card.slug,
		name: card.name,
		rotate: isBattlefield(card),
		hero: shownImageId
			? { imageId: shownImageId, alt: `${card.name} card art${primaryIndex?.setSlug ? ` (${primaryIndex.setSlug})` : ''}` }
			: null,
		shown: primaryPrint?.publicCode ? `${primaryPrint.publicCode} · ${enumLabel('artVariants', primaryPrint.artVariant)} art` : null,
		types: card.types.map((t) => enumLabel('cardTypes', t)),
		superTypes: (record.superTypes ?? []).map((st) => enumLabel('superTypes', st)),
		domains: domainLabels(record.domains),
		stats: cardStats(record),
		maxCopiesOverride: record.maxCopiesOverride ?? null,
		errata: errata
			? {
					text: errata.correctedRulesText ?? errata.correctedEffectText ?? '',
					effectiveDate: errata.effectiveDate ?? null,
					source: errata.source ?? null,
					sourceUrl: errata.sourceUrl ?? null,
				}
			: null,
		bans: (record.bans ?? []).map((b) => ({ format: b.formatName ?? '', bannedAt: b.bannedAt ?? null, reason: b.reason ?? null })),
		effectText: primaryPrint?.printedEffectText ?? null,
		rulesText: primaryPrint?.printedRulesText ?? null,
		flavorText: primaryPrint?.flavorText ?? null,
		printingCount: card.printings.length,
		sets: index.sets
			.filter((set) => bySet.has(set.slug))
			.sort(releaseSort)
			.map((set) => ({ slug: set.slug, name: set.name, printings: (bySet.get(set.slug) ?? []).map((p, i) => printingOf(card, set, p, i)) })),
	};
}

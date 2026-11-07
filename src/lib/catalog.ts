// Data access over the local OpenRift snapshot (data/catalog.json) and the
// derived index (data/index.json). Pages never import the data files
// directly — they go through here. Run `npm run refresh` before building if
// data/ is empty (the verbatim snapshot and this module stay separate:
// their content vs. our normalization).

import indexFile from '../../data/index.json';
import snapshotFile from '../../data/catalog.json';

/** Set release record; precision tells how exact releasedAt is. */
export interface SetRelease {
	releasedAt?: string | null;
	precision?: 'year' | 'month' | 'day' | null;
}

export interface SetReleases {
	[lang: string]: SetRelease | undefined;
}

export interface IndexSet {
	setId: string;
	slug: string;
	name: string;
	setType: string | null;
	releases: SetReleases;
}

export interface IndexPrinting {
	printingId: string;
	setId: string;
	setSlug: string;
	language: string | null;
	rarity: string | null;
	finish: string | null;
	artVariant: string | null;
	imageIds: string[];
	side2PrintingId: string | null;
}

export interface IndexCard {
	cardId: string;
	slug: string;
	name: string;
	types: string[];
	printings: IndexPrinting[];
}

export interface IndexFile {
	meta: { fetchedAt: string; etag: string | null; langs: string };
	sets: IndexSet[];
	cards: IndexCard[];
}

export interface ErrataRecord {
	effectiveDate?: string | null;
	correctedRulesText?: string | null;
	correctedEffectText?: string | null;
	source?: string | null;
	sourceUrl?: string | null;
}

export interface CardRecord {
	slug: string;
	name: string;
	types: string[];
	superTypes?: string[];
	domains?: string[];
	tokenCardIds?: string[];
	might?: number | null;
	energy?: number | null;
	power?: number | null;
	mightBonus?: number | null;
	keywords?: string[];
	tags?: string[];
	maxCopiesOverride?: number | null;
	additionalLegendCount?: number | null;
	errata?: ErrataRecord | null;
	bans?: string[];
}

export interface PrintingImage {
	imageId: string;
}

/** OpenRift embeds the double-sided token's back face fully in `side2`. */
export interface Side2Record {
	faceId?: string;
	cardId: string;
	setId: string;
	shortCode?: string;
	publicCode?: string;
	rarity?: string | null;
	finish?: string | null;
	artVariant?: string | null;
	markers?: string[];
	images?: PrintingImage[];
	artist?: string | null;
	printedName?: string;
	printedRulesText?: string | null;
	printedEffectText?: string | null;
	flavorText?: string | null;
	citation?: string | null;
}

export interface PrintingRecord {
	cardId: string;
	setId: string;
	shortCode?: string;
	publicCode?: string;
	rarity?: string | null;
	artVariant?: string | null;
	isSigned?: boolean;
	isOvernumbered?: boolean;
	markers?: string[];
	finish?: string | null;
	images?: PrintingImage[];
	artist?: string | null;
	printedName?: string;
	printedRulesText?: string | null;
	printedEffectText?: string | null;
	flavorText?: string | null;
	printedYear?: number | null;
	language?: string | null;
	canonicalRank?: number | null;
	size?: string | null;
	comment?: string | null;
	distributionChannels?: string[];
	hasFoilTwin?: boolean;
	faceId?: string;
	side2?: Side2Record;
}

export interface MarkerRecord {
	id: string;
	slug: string;
	label: string;
	description?: string | null;
}

export interface ChannelRecord {
	id: string;
	slug: string;
	label: string;
	description?: string | null;
	kind?: string | null;
	parentId?: string | null;
	childrenLabel?: string | null;
}

export interface Snapshot {
	sets: Array<{ id: string; slug: string; name: string; releases: SetReleases; setType?: string }>;
	cards: Record<string, CardRecord>;
	printings: Record<string, PrintingRecord>;
	markers: MarkerRecord[];
	distributionChannels: ChannelRecord[];
	enums?: {
		cardTypes?: Array<EnumLabel>;
		superTypes?: Array<EnumLabel>;
		domains?: Array<EnumLabel>;
		rarities?: Array<EnumLabel>;
		finishes?: Array<EnumLabel>;
		artVariants?: Array<EnumLabel>;
		cardSizes?: Array<EnumLabel>;
		languages?: Array<EnumLabel>;
	};
}

export interface EnumLabel {
	slug: string;
	label: string;
	sortOrder?: number;
}

export const index = indexFile as unknown as IndexFile;
export const snapshot = snapshotFile as unknown as Snapshot;

/** cardId -> index card, for resolving embedded references like side2.cardId. */
export const cardByUuid = new Map<string, IndexCard>(index.cards.map((c) => [c.cardId, c]));

/** The set's release relevant to this English-only app: EN first, then any dated release. */
export function setPrimaryRelease(set: IndexSet): SetRelease | null {
	const lang = index.meta.langs;
	const releases = Object.values(set.releases ?? {});
	return set.releases?.[lang] ?? releases.find((r) => r?.releasedAt) ?? releases[0] ?? null;
}

export function setTypeLabel(set: IndexSet): string {
	return set.setType === 'main' ? 'Main set' : set.setType === 'supplemental' ? 'Supplemental' : set.setType ? set.setType.replace(/^\w/, (c) => c.toUpperCase()) : 'Set';
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Release date at the precision the snapshot actually knows ("2024", "Aug 2026", "31 Jul 2026"). */
export function releaseLabel(iso?: string | null, precision?: string | null): string {
	if (!iso) return '—';
	const [year, month, day] = iso.split('-');
	if (precision === 'year' || !month) return year;
	const monthName = MONTH_NAMES[Number(month) - 1] ?? month;
	return precision === 'month' ? `${monthName} ${year}` : `${Number(day)} ${monthName} ${year}`;
}

/** Card-level representative printing: first one with art, else the first. */
export function representativePrinting(card: IndexCard): IndexPrinting | null {
	if (card.printings.length === 0) return null;
	return card.printings.find((p) => p.imageIds.length > 0) ?? card.printings[0];
}

/** Battlefields are printed as horizontal cards (OpenRift serves ~7:5 art). */
export function isBattlefield(card: IndexCard): boolean {
	return card.types.includes('battlefield');
}

/** Representative printing restricted to one set (first with art again). */
export function representativePrintingForSet(card: IndexCard, setSlug: string): IndexPrinting | null {
	const inSet = card.printings.filter((p) => p.setSlug === setSlug);
	if (inSet.length === 0) return null;
	return inSet.find((p) => p.imageIds.length > 0) ?? inSet[0];
}

/** Free-text corpus: name plus this snapshot's printed rules/effect text. */
export function cardSearchText(card: IndexCard): string {
	const rep = representativePrinting(card);
	const printing = rep ? snapshot.printings[rep.printingId] : undefined;
	const parts = [card.name, printing?.printedEffectText ?? '', printing?.printedRulesText ?? ''].filter(Boolean);
	return parts.join('\n');
}

const markerBySlug = new Map(snapshot.markers.map((m) => [m.slug, m]));
const channelBySlug = new Map(snapshot.distributionChannels.map((c) => [c.slug, c]));
const channelById = new Map(snapshot.distributionChannels.map((c) => [c.id, c]));

/** Channel labels with their parent chain ("Parent — Child" style trail). */
export function channelLabels(entries: Array<string | { channel: string }> | undefined): string[] {
	const labels = [];
	for (const entry of entries ?? []) {
		const slug = typeof entry === 'string' ? entry : entry?.channel;
		const channel = slug ? channelBySlug.get(slug) : undefined;
		if (!channel) continue;
		const parent = channel.parentId ? channelById.get(channel.parentId) : undefined;
		labels.push(parent ? `${parent.label} — ${channel.label}` : channel.label);
	}
	return labels;
}

export function markerLabels(slugs: string[] | undefined): string[] {
	return (slugs ?? []).map((slug) => markerBySlug.get(slug)?.label).filter((l): l is string => Boolean(l));
}

/** Display label for an enum value (falls back to the raw slug). */
export function enumLabel(
	kind: 'cardTypes' | 'superTypes' | 'domains' | 'rarities' | 'finishes' | 'artVariants' | 'cardSizes' | 'languages',
	slug: string | null | undefined,
): string {
	const list = (snapshot.enums?.[kind] ?? []) as Array<{ slug: string; label?: string }>;
	const found = list.find((e) => e.slug === slug);
	return found?.label ?? (slug ?? '—');
}

export function domainLabels(domains: string[] | undefined): string[] {
	const list = (snapshot.enums?.domains ?? []) as Array<{ slug: string; label?: string }>;
	const labels = new Map(list.map((e) => [e.slug, e.label ?? e.slug]));
	return (domains ?? []).map((d) => labels.get(d) ?? d);
}

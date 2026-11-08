// src/lib/peek-facts.ts — the deck manager's card peek, as one HTML fragment
// (spec: card-peek, the peek presents a card's facts in one fixed order).
//
// One layout for every card, so a player reads it by position, not by looking
// for what is where. Top to bottom, always:
//
//   1. name                                     domain emblems, in the corner
//   2. type line                                ban marker (only when banned)
//   3. Energy | Power | Might                   three fixed columns
//   4. printed description                      under one hairline
//
// A card that has no Power, no Might, or no Energy at all (a Legend, a
// battlefield, a rune) still gets all three columns; the missing ones print a
// dash. Nothing is left out to close the gap, so the description starts at the
// same place whatever the card's type. Only the description may be absent, and
// it is last, so its absence moves nothing.
//
// Built at build time by the /peek/[slug].json endpoint and fetched on demand.
// Text goes through the same renderer as the card detail page, so keyword
// labels, glyphs, italics and fallbacks are identical by construction (spec:
// card-text-rendering, card text reads the same on every surface).
//
// The description is the printing's own printed effect and rules text, nothing
// else. A card's `keywords` field is a search index, not something the card
// prints: the printed text already carries each keyword where the card shows it
// (as a [Keyword] label), so listing them again as a separate row reads as a
// second description. This fragment never renders that field.
//
// Pure: no data imports, no DOM. Explicit .ts extensions on relative imports.

import type { CardStat } from './card-stats.ts';
import { escapeCardTextHtml, renderCardTextHtml, type RenderOptions } from './card-text.ts';

export interface PeekFacts {
	name: string;
	/** Display labels, e.g. ["Unit"]. */
	types: string[];
	/** Display labels, e.g. ["Champion"]; read before the types ("Champion Unit"). */
	superTypes: string[];
	domains: Array<{ slug: string; label: string }>;
	stats: CardStat[];
	effectText: string | null;
	rulesText: string | null;
	/** Banned in Constructed: the one deck-independent rule verdict the peek carries. */
	banned?: boolean;
}

/** The cost row's fixed places, left to right: what you pay first, then what you get. */
const STAT_PLACES: Array<{ kind: CardStat['kind']; label: string }> = [
	{ kind: 'energy', label: 'Energy' },
	{ kind: 'power', label: 'Power' },
	{ kind: 'might', label: 'Might' },
];

function statHtml(stat: CardStat, options: RenderOptions): string {
	const symbol = stat.symbol ? renderCardTextHtml(stat.symbol, options) : '';
	// the energy disc already shows its number; the others print symbol then value
	const value =
		stat.kind === 'energy'
			? symbol
			: `${symbol}<span class="peek-stat-value">${stat.value}</span>` +
				(stat.note ? `<span class="peek-stat-note">${escapeCardTextHtml(stat.note)}</span>` : '');
	return (
		`<div class="peek-stat" data-stat="${stat.kind}">` +
		`<dt>${escapeCardTextHtml(stat.label)}</dt><dd>${value}</dd>` +
		`</div>`
	);
}

/** A place the card has no figure for: the label stays where it always is, with
 *  a dash for the value. The dash is a mark, so assistive tech hears "none". */
function emptyStatHtml(place: { kind: CardStat['kind']; label: string }): string {
	return (
		`<div class="peek-stat" data-stat="${place.kind}" data-empty="true">` +
		`<dt>${place.label}</dt><dd><span aria-hidden="true">—</span><span class="sr-only">none</span></dd>` +
		`</div>`
	);
}

/** One domain, as the emblem OpenRift draws for it. The emblem is the whole
 *  mark (it sits in the corner, with no room for a word beside it), so its alt
 *  text is the domain's name. When the emblem is not cached the name is printed
 *  in its place. */
function domainHtml(domain: { slug: string; label: string }, options: RenderOptions): string {
	const url = options.resolveGlyph?.(`domain_${domain.slug}`);
	const label = escapeCardTextHtml(domain.label);
	const mark = url
		? `<img class="peek-domain-icon" src="${escapeCardTextHtml(url)}" alt="${label}" width="28" height="28" decoding="async">`
		: `<span>${label}</span>`;
	return `<li data-domain="${escapeCardTextHtml(domain.slug)}">${mark}</li>`;
}

function paragraph(text: string | null, options: RenderOptions): string {
	const trimmed = text?.trim();
	return trimmed ? `<p>${renderCardTextHtml(trimmed, options)}</p>` : '';
}

/** The fragment. Every place but the description is always present. */
export function peekFactsHtml(facts: PeekFacts, options: RenderOptions = {}): string {
	const typeLine = [...facts.superTypes, ...facts.types].join(' ');

	// 1. name on the left, the domain emblems in the corner on the same line
	const domains = facts.domains.length
		? `<ul class="peek-domains" aria-label="Domains">${facts.domains.map((domain) => domainHtml(domain, options)).join('')}</ul>`
		: '';
	const nameLine =
		`<div class="peek-title">` + `<h2 class="peek-name">${escapeCardTextHtml(facts.name)}</h2>` + domains + `</div>`;

	// 2. type line left, the ban marker (when there is one) right. "Banned" is
	//    what shows; the rest is for assistive tech.
	const ban = facts.banned ? `<p class="peek-ban">Banned<span class="sr-only"> in Constructed</span></p>` : '';
	const subLine = `<div class="peek-sub"><p class="peek-types">${escapeCardTextHtml(typeLine)}</p>${ban}</div>`;

	// 3. Energy | Power | Might, each in its own place whether or not the card has it
	const costRow =
		`<dl class="peek-stats">` +
		STAT_PLACES.map((place) => {
			const stat = facts.stats.find((candidate) => candidate.kind === place.kind);
			return stat ? statHtml(stat, options) : emptyStatHtml(place);
		}).join('') +
		`</dl>`;

	// 4. the description, last, so leaving it out moves nothing
	const body = paragraph(facts.effectText, options) + paragraph(facts.rulesText, options);
	const text = body ? `<div class="peek-text card-text">${body}</div>` : '';

	return `<header class="peek-head">${nameLine}${subLine}</header>` + costRow + text;
}

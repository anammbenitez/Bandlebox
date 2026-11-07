// src/lib/peek-facts.ts — the deck-independent half of the deck manager's card
// peek, as one HTML fragment: name, type line, domains, the cost row, keyword
// labels, and the printed rules and effect text (spec: card-peek, the peek
// presents a card's facts).
//
// Built at build time by the /peek/[slug].json endpoint and fetched on demand.
// Text goes through the same renderer as the card detail page, so keyword
// colors, glyphs, italics and fallbacks are identical by construction (spec:
// card-text-rendering, card text reads the same on every surface). The
// deck-aware half (colors vs the Legend, copies, bans) is NOT here: it depends
// on the open deck and is added in the browser from deck-fit.ts.
//
// Pure: no data imports, no DOM. Explicit .ts extensions on relative imports.

import type { CardStat } from './card-stats.ts';
import { escapeCardTextHtml, renderCardTextHtml, renderKeywordHtml, type RenderOptions } from './card-text.ts';

export interface PeekFacts {
	name: string;
	/** Display labels, e.g. ["Unit"]. */
	types: string[];
	/** Display labels, e.g. ["Champion"]; read before the types ("Champion Unit"). */
	superTypes: string[];
	domains: Array<{ slug: string; label: string }>;
	stats: CardStat[];
	keywords: string[];
	effectText: string | null;
	rulesText: string | null;
}

/** Cost row order: what you pay first, then what you get. */
const STAT_ORDER: Array<CardStat['kind']> = ['energy', 'power', 'might'];

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

function paragraph(text: string | null, options: RenderOptions): string {
	const trimmed = text?.trim();
	return trimmed ? `<p>${renderCardTextHtml(trimmed, options)}</p>` : '';
}

/** The fragment. Sections with nothing to show are left out entirely. */
export function peekFactsHtml(facts: PeekFacts, options: RenderOptions = {}): string {
	const typeLine = [...facts.superTypes, ...facts.types].join(' ');
	const domains = facts.domains.length
		? `<ul class="peek-domains">${facts.domains
				.map(
					(domain) =>
						`<li data-domain="${escapeCardTextHtml(domain.slug)}">${escapeCardTextHtml(domain.label)}</li>`,
				)
				.join('')}</ul>`
		: '';

	const stats = STAT_ORDER.flatMap((kind) => facts.stats.filter((stat) => stat.kind === kind));
	const costRow = stats.length ? `<dl class="peek-stats">${stats.map((stat) => statHtml(stat, options)).join('')}</dl>` : '';

	const keywords = facts.keywords.length
		? `<div class="peek-keywords">${facts.keywords.map((keyword) => renderKeywordHtml(keyword, options)).join('')}</div>`
		: '';

	const body = paragraph(facts.effectText, options) + paragraph(facts.rulesText, options);
	const text = body ? `<div class="peek-text card-text">${body}</div>` : '';

	return (
		`<header class="peek-head">` +
		`<h2 class="peek-name">${escapeCardTextHtml(facts.name)}</h2>` +
		(typeLine ? `<p class="peek-types">${escapeCardTextHtml(typeLine)}</p>` : '') +
		domains +
		`</header>` +
		costRow +
		keywords +
		text
	);
}

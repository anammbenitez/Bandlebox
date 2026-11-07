// One facts fragment per card, emitted at build time as /peek/{slug}.json and
// fetched by the deck manager's card peek when a dwell completes (design.md D4).
// Deck-independent facts only: the deck-aware lines are computed in the browser
// from the live deck, so a fragment never goes stale. The text is rendered here,
// on the server, with the same renderer and glyph map as the card detail page.

import type { APIRoute, GetStaticPaths } from 'astro';
import { cardStats } from '../../lib/card-stats';
import { domainLabels, enumLabel, index, representativePrinting, snapshot, type IndexCard } from '../../lib/catalog';
import { glyphUrl } from '../../lib/glyphs';
import { keywordChipStyle } from '../../lib/keyword-styles';
import { peekFactsHtml } from '../../lib/peek-facts';

export const getStaticPaths: GetStaticPaths = () =>
	index.cards.map((card) => ({ params: { slug: card.slug }, props: { card } }));

export const GET: APIRoute = ({ props }) => {
	const { card } = props as { card: IndexCard };
	const record = snapshot.cards[card.cardId];
	const rep = representativePrinting(card);
	const printing = rep ? snapshot.printings[rep.printingId] : undefined;

	const html = peekFactsHtml(
		{
			name: card.name,
			types: card.types.map((type) => enumLabel('cardTypes', type)),
			superTypes: (record?.superTypes ?? []).map((type) => enumLabel('superTypes', type)),
			domains: (record?.domains ?? []).map((slug) => ({ slug, label: domainLabels([slug])[0] ?? slug })),
			stats: record ? cardStats(record) : [],
			keywords: record?.keywords ?? [],
			effectText: printing?.printedEffectText ?? null,
			rulesText: printing?.printedRulesText ?? null,
		},
		{ resolveGlyph: glyphUrl, resolveKeyword: keywordChipStyle },
	);

	return new Response(JSON.stringify({ html }), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
};

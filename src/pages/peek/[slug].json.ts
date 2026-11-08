// One facts fragment per card, emitted at build time as /peek/{slug}.json and
// fetched by the deck manager's card peek when a dwell completes (design.md D4).
// Every fact in it is the card's own: the deck is not read, so a fragment never
// goes stale. The text is rendered here, on the server, with the same renderer
// and glyph map as the card detail page.

import type { APIRoute, GetStaticPaths } from 'astro';
import { cardStats } from '../../lib/card-stats';
import { domainLabels, enumLabel, index, representativePrinting, snapshot, type IndexCard } from '../../lib/catalog';
import { buildDeckRuleIndexes } from '../../lib/deck-rules';
import { glyphUrl } from '../../lib/glyphs';
import { keywordChipStyle } from '../../lib/keyword-styles';
import { peekFactsHtml } from '../../lib/peek-facts';

// The ban flag comes from the legality rules' own card index, so the peek and
// the checklist read one decision.
const ruleIndexes = buildDeckRuleIndexes(snapshot, index);

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
			effectText: printing?.printedEffectText ?? null,
			rulesText: printing?.printedRulesText ?? null,
			banned: ruleIndexes.cards[card.slug]?.banned ?? false,
		},
		{ resolveGlyph: glyphUrl, resolveKeyword: keywordChipStyle },
	);

	return new Response(JSON.stringify({ html }), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
};

// One card's full detail (everything the card page shows), emitted at build
// time as /card-detail/{slug}.json and fetched by the card peek's "See more"
// modal on demand. Data, not markup: the shared React components render it.

import type { APIRoute, GetStaticPaths } from 'astro';
import { buildCardDetail } from '../../server/card-detail';
import { index, type IndexCard } from '../../server/catalog';

export const getStaticPaths: GetStaticPaths = () => index.cards.map((card) => ({ params: { slug: card.slug }, props: { card } }));

export const GET: APIRoute = ({ props }) => {
	const { card } = props as { card: IndexCard };
	return new Response(JSON.stringify({ detail: buildCardDetail(card) }), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
};

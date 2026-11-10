// One card's full detail for the "See more" modal: fetched from the build's
// /card-detail/{slug}.json the first time it is asked for, then kept for the
// visit. A failure is forgotten so the next open can retry.
import { useEffect, useState } from 'react';
import type { CardDetailData } from '../../domain/card-detail.ts';

const cache = new Map<string, Promise<CardDetailData | null>>();

function load(slug: string): Promise<CardDetailData | null> {
	let pending = cache.get(slug);
	if (!pending) {
		pending = fetch(`/card-detail/${encodeURIComponent(slug)}.json`)
			.then((response) => (response.ok ? (response.json() as Promise<{ detail?: CardDetailData }>) : null))
			.then((body) => body?.detail ?? null)
			.catch(() => null);
		void pending.then((detail) => {
			if (detail === null) cache.delete(slug);
		});
		cache.set(slug, pending);
	}
	return pending;
}

export type CardDetailState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; detail: CardDetailData };

export function useCardDetail(slug: string): CardDetailState {
	const [result, setResult] = useState<{ slug: string; detail: CardDetailData | null } | null>(null);
	useEffect(() => {
		let live = true;
		void load(slug).then((detail) => {
			if (live) setResult({ slug, detail });
		});
		return () => {
			live = false;
		};
	}, [slug]);
	if (!result || result.slug !== slug) return { status: 'loading' };
	return result.detail ? { status: 'ready', detail: result.detail } : { status: 'error' };
}

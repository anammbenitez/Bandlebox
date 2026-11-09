// The deck manager's build-time data, read once from the page's JSON tags
// (design D3: tags rather than island props, which would be HTML-escaped and
// far larger). Null during the build render and the hydration pass.
import { useMemo, useSyncExternalStore } from 'react';
import type { GridEntry } from '../../domain/grid-item.ts';
import type { DeckRuleIndexes } from '../../domain/deck-rules.ts';
import { PAYLOAD_IDS } from '../../domain/payload-ids.ts';
import { useJsonTag } from '../../ui/hooks/useJsonTag.ts';

export interface ManagerData {
	cards: GridEntry[];
	bySlug: Map<string, GridEntry>;
	/** Lower-cased search text per card, in catalog order. */
	searchable: Array<{ entry: GridEntry; text: string }>;
	idx: DeckRuleIndexes;
}

/** The cards and rule indexes, once the page runs (null before, and when a
 *  payload is missing). Derived lookups are built once per payload. */
export function useManagerData(): ManagerData | null {
	const cards = useJsonTag<GridEntry[]>(PAYLOAD_IDS.deckCards);
	const idx = useJsonTag<DeckRuleIndexes>(PAYLOAD_IDS.deckRules);
	return useMemo(() => {
		if (!cards || !idx) return null;
		return {
			cards,
			bySlug: new Map(cards.map((entry) => [entry.slug, entry])),
			searchable: cards.map((entry) => ({ entry, text: entry.text.toLowerCase() })),
			idx,
		};
	}, [cards, idx]);
}

const subscribeHash = (onChange: () => void) => {
	window.addEventListener('hashchange', onChange);
	return () => window.removeEventListener('hashchange', onChange);
};

/** The address hash (`#d/<id>`, `#s/<payload>`), or '' before hydration. */
export function useHash(): string {
	return useSyncExternalStore(subscribeHash, () => window.location.hash, () => '');
}

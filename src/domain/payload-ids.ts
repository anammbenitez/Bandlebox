// The ids of the `<script type="application/json">` tags that carry the big
// build-time payloads to the islands (design D3 of `migrate-to-react`: tags,
// not island props, which would be HTML-escaped and far larger). One place, so
// the Astro page that writes a tag and the island that reads it cannot drift.
export const PAYLOAD_IDS = {
	/** The catalog grid's entries (`GridEntry[]`), on `/`. */
	grid: 'grid-data',
	/** The same entries for the deck manager's browser, on `/decks/build`. */
	deckCards: 'deck-card-data',
	/** The legality rule indexes (`DeckRuleIndexes`), on `/decks` and `/decks/build`. */
	deckRules: 'deck-rules-data',
} as const;

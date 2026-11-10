// React side of domain/printing-preference.ts (a kit hook: it knows nothing of
// decks or legality, only that a card's art can be chosen): the card's chosen art, or the
// default until the browser's choice has been read (so the static build and
// the first hydrated render agree).
import { useSyncExternalStore } from 'react';
import { getPreferredImage, subscribePreferences } from '../../domain/printing-preference.ts';

export function usePreferredImage(slug: string | undefined): string | null {
	return useSyncExternalStore(
		subscribePreferences,
		() => (slug ? getPreferredImage(slug) : null),
		() => null,
	);
}

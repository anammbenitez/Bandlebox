// What the deck viewer can ask of the deck manager. The viewer renders the
// deck and reports intent; the manager applies it through the deck store and
// shows any refusal.
import type { SectionKey } from '../../../domain/deck.ts';

export interface ViewerActions {
	changeQty(section: SectionKey, slug: string, delta: number, from: HTMLElement): void;
	removeRow(section: SectionKey, slug: string): void;
	/** A card from the browser was dropped on a section. */
	dropOn(section: SectionKey, slug: string): void;
	/** A card from the browser was dropped on the champion zone (`zone` is that zone). */
	dropChampion(slug: string, zone: HTMLElement): void;
	toggleChampionPicking(): void;
	setRuneRatio(domain: string, target: number): void;
	focusSection(section: SectionKey): void;
}

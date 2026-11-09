// The deck as one sheet (deck-manager spec): the composition ledger pinned at
// the top (five sections, counts and targets, the focused one marked), the
// sections with their card faces, and the legality checklist at the foot. The
// pieces live in ./viewer; this composes them.
import { SECTION_KEYS, sectionTarget, sectionTotal, type Deck, type SectionKey } from '../../domain/deck.ts';
import type { DeckRuleIndexes } from '../../domain/deck-rules.ts';
import type { GridEntry } from '../../domain/grid-item.ts';
import { useCurrentAddress } from '../../ui/hooks/useCurrentAddress.ts';
import { Frame } from '../../ui/organisms/Frame.tsx';
import { DeckSection } from './viewer/DeckSection.tsx';
import { LegalityChecklist } from './viewer/LegalityChecklist.tsx';
import type { ViewerActions } from './viewer/viewer-actions.ts';

export { useLegality } from './viewer/LegalityChecklist.tsx';
export type { ViewerActions } from './viewer/viewer-actions.ts';

const LEDGER_NAME: Record<SectionKey, string> = { legend: 'Legend', battlefields: 'Battlefields', main: 'Main', rune: 'Runes', side: 'Side' };
/** Five labels across a 320px phone leave ~45px each; the long one gets a shorter name. */
const LEDGER_SHORT: Record<SectionKey, string> = { ...LEDGER_NAME, battlefields: 'Fields' };

export interface DeckViewerProps {
	deck: Deck;
	shared: boolean;
	idx: DeckRuleIndexes;
	bySlug: Map<string, GridEntry>;
	domains: Array<{ slug: string; label?: string }>;
	active: SectionKey;
	championPicking: boolean;
	/** The slug being dragged from the browser, if any. */
	dragging: string | null;
	actions: ViewerActions;
}

function Ledger({ deck, active, onFocus }: { deck: Deck; active: SectionKey; onFocus(section: SectionKey): void }) {
	return (
		<div id="deck-ledger" className="sheet-ledger" role="group" aria-label="Deck sections">
			{SECTION_KEYS.map((key) => {
				const { exact, cap } = sectionTarget(key);
				const on = key === active;
				return (
					<button
						key={key}
						type="button"
						className="ledger-cell"
						data-ledger-section={key}
						data-focus-section={key}
						data-active={String(on)}
						aria-pressed={on}
						onClick={() => onFocus(key)}
					>
						<span className="ledger-name">
							<span className="ledger-name-full">{LEDGER_NAME[key]}</span>
							<span className="ledger-name-short">{LEDGER_SHORT[key]}</span>
						</span>
						<span className="ledger-count tnum">
							<span data-count={key}>{sectionTotal(deck[key])}</span>
							<span className="ledger-target">/{exact ?? `≤ ${cap}`}</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}

export function DeckViewer({ deck, shared, idx, bySlug, domains, active, championPicking, dragging, actions }: DeckViewerProps) {
	const address = useCurrentAddress();
	return (
		<Frame tone="lit" className="deck-frame min-h-0 flex flex-1 flex-col">
			<div className="sheet scroll-column min-h-0 flex-1 overflow-y-auto overscroll-contain">
				<Ledger deck={deck} active={active} onFocus={actions.focusSection} />
				<div className="sheet-sections">
					{SECTION_KEYS.map((key) => (
						<DeckSection
							key={key}
							section={key}
							deck={deck}
							idx={idx}
							bySlug={bySlug}
							domains={domains}
							shared={shared}
							active={key === active}
							championPicking={championPicking}
							dragging={dragging}
							address={address}
							actions={actions}
						/>
					))}
				</div>
				<LegalityChecklist deck={deck} idx={idx} />
			</div>
		</Frame>
	);
}

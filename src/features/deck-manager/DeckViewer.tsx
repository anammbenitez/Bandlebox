// The deck as one sheet (deck-manager spec): the composition ledger pinned at
// the top (five sections, counts and targets, the focused one marked), the
// table (Legend and Champion, with Battlefields and Runes beside them; a
// group that starts open and folds into a summary), and the main and side
// decks. The pieces live in ./viewer; this composes them.
import { useState } from 'react';
import { SECTION_KEYS, sectionTarget, sectionTotal, type Deck, type SectionKey } from '../../domain/deck.ts';
import type { DeckRuleIndexes } from '../../domain/deck-rules.ts';
import type { GridEntry } from '../../domain/grid-item.ts';
import { useCurrentAddress } from '../../ui/hooks/useCurrentAddress.ts';
import { Frame } from '../../ui/organisms/Frame.tsx';
import { DeckSection } from './viewer/DeckSection.tsx';
import { TableSummary } from './viewer/TableSummary.tsx';
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

/** The sections the table group holds; the others always show. */
const TABLE_SECTIONS: readonly SectionKey[] = ['legend', 'battlefields', 'rune'];
const TABLE_ID = 'sheet-table';

function TableToggle({ open, deck, onToggle }: { open: boolean; deck: Deck; onToggle(): void }) {
	return (
		<button type="button" className="table-toggle" aria-expanded={open} aria-controls={open ? TABLE_ID : `${TABLE_ID}-summary`} onClick={onToggle}>
			<svg className="table-toggle-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
				<path d="M3 4.5 6 7.5l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			<span className="section-name">The table</span>
			<span className="section-count">
				{open ? 'Legend, battlefields, runes' : `Battlefields ${sectionTotal(deck.battlefields)} / 3`}
			</span>
		</button>
	);
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
	const [tableOpen, setTableOpen] = useState(true);
	// Focusing a section that is folded away (a ledger tab, the browser's
	// pills) opens the table first; adjusting state while rendering is the
	// supported way to follow a prop.
	const [seenActive, setSeenActive] = useState(active);
	if (seenActive !== active) {
		setSeenActive(active);
		if (TABLE_SECTIONS.includes(active)) setTableOpen(true);
	}
	const focusSection = (key: SectionKey) => {
		if (TABLE_SECTIONS.includes(key)) setTableOpen(true);
		actions.focusSection(key);
	};
	const section = (key: SectionKey) => (
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
	);
	return (
		<Frame tone="lit" className="deck-frame min-h-0 flex flex-1 flex-col">
			<div className="sheet scroll-column min-h-0 flex-1 overflow-y-auto overscroll-contain">
				<Ledger deck={deck} active={active} onFocus={focusSection} />
				<div className="sheet-sections">
					<TableToggle open={tableOpen} deck={deck} onToggle={() => setTableOpen((v) => !v)} />
					{tableOpen ? (
						/* the table: Legend and Champion, with the battlefields and runes
						   they are played with beside them once the sheet is wide enough */
						<div id={TABLE_ID} className="sheet-table">
							{section('legend')}
							{section('battlefields')}
							{section('rune')}
						</div>
					) : (
						<TableSummary
							id={`${TABLE_ID}-summary`}
							deck={deck}
							shared={shared}
							idx={idx}
							bySlug={bySlug}
							domains={domains}
							championPicking={championPicking}
							address={address}
							actions={actions}
						/>
					)}
					{section('main')}
					{section('side')}
				</div>
			</div>
		</Frame>
	);
}

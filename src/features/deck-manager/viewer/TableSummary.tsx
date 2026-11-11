// General info folded (deck-manager spec): a small preview of the Legend, the
// rune slider with its emblems and counts (still interactive, so the split can
// be adjusted without opening the group) and the battlefield counter, n / 3.
// Everything here is read from the deck; placing cards happens in the open group.
import { SECTION_LABELS, sectionTotal, sectionTarget, type Deck } from '../../../domain/deck.ts';
import { cardPageHref } from '../../../domain/deck-return.ts';
import type { DeckRuleIndexes } from '../../../domain/deck-rules.ts';
import type { GridEntry } from '../../../domain/grid-item.ts';
import { FaceArt } from '../faces.tsx';
import { RuneSlider, type DomainInfo } from './RuneSlider.tsx';
import type { ViewerActions } from './viewer-actions.ts';

export interface TableSummaryProps {
	id: string;
	deck: Deck;
	shared: boolean;
	idx: DeckRuleIndexes;
	bySlug: Map<string, GridEntry>;
	domains: DomainInfo[];
	address: string;
	actions: Pick<ViewerActions, 'setRuneRatio'>;
}

export function TableSummary({ id, deck, shared, idx, bySlug, domains, address, actions }: TableSummaryProps) {
	const legend = deck.legend[0]?.card;
	const name = legend ? (idx.names[legend] ?? bySlug.get(legend)?.name ?? legend) : '';
	const { exact } = sectionTarget('battlefields');
	return (
		<div id={id} className="table-summary">
			<div data-summary-card="legend" className="summary-card face card-corner">
				{legend ? (
					<a href={cardPageHref(legend, address)} aria-label={name} className="absolute inset-0">
						<FaceArt art={bySlug.get(legend)?.art} slug={legend} />
					</a>
				) : (
					<span className="summary-card-empty">no Legend</span>
				)}
			</div>
			<div className="summary-facts">
				<section aria-label={SECTION_LABELS.rune}>
					{legend ? <RuneSlider deck={deck} idx={idx} shared={shared} domains={domains} onSet={actions.setRuneRatio} /> : <p className="summary-none">Place a Legend; its colors set the runes.</p>}
				</section>
				<p data-battlefield-count="" className="summary-count">
					<span className="summary-label">{SECTION_LABELS.battlefields}</span>
					<span className="tnum">
						{sectionTotal(deck.battlefields)} / {exact}
					</span>
				</p>
			</div>
		</div>
	);
}

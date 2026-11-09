// A card's cost row in three fixed places, Energy | Power | Might, whatever
// the card is (card-peek spec: one layout for every card). A place the card
// has no figure for keeps its label and prints a dash, heard as "none".
import type { CardStat } from '../../domain/card-stats.ts';
import { CardTextContent, type CardTextOptions } from './CardText.tsx';

const PLACES: Array<{ kind: CardStat['kind']; label: string }> = [
	{ kind: 'energy', label: 'Energy' },
	{ kind: 'power', label: 'Power' },
	{ kind: 'might', label: 'Might' },
];

export function StatColumns({ stats, ...options }: { stats: CardStat[] } & CardTextOptions) {
	return (
		<dl className="peek-stats">
			{PLACES.map((place) => {
				const stat = stats.find((candidate) => candidate.kind === place.kind);
				if (!stat) {
					return (
						<div key={place.kind} className="peek-stat" data-stat={place.kind} data-empty="true">
							<dt>{place.label}</dt>
							<dd>
								<span aria-hidden="true">—</span>
								<span className="sr-only">none</span>
							</dd>
						</div>
					);
				}
				const symbol = stat.symbol ? <CardTextContent text={stat.symbol} {...options} /> : null;
				return (
					<div key={place.kind} className="peek-stat" data-stat={stat.kind}>
						<dt>{stat.label}</dt>
						<dd>
							{stat.kind === 'energy' ? (
								symbol
							) : (
								<>
									{symbol}
									<span className="peek-stat-value">{stat.value}</span>
									{stat.note && <span className="peek-stat-note">{stat.note}</span>}
								</>
							)}
						</dd>
					</div>
				);
			})}
		</dl>
	);
}

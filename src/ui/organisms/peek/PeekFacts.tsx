// The peek's facts in one fixed order for every card (card-peek spec): name
// with the domain emblems in its corner; type line with the ban marker at its
// end; Energy | Power | Might in three fixed places; then the printed text.
// Only the description may be absent, and it is last, so nothing moves.
import { glyphUrl } from '../../../domain/glyphs.ts';
import type { PeekFacts as Facts } from '../../../domain/peek-facts.ts';
import { CardTextContent } from '../../molecules/CardText.tsx';
import { StatColumns } from '../../molecules/StatColumns.tsx';

function Paragraph({ text }: { text: string | null }) {
	const trimmed = text?.trim();
	return trimmed ? (
		<p>
			<CardTextContent text={trimmed} />
		</p>
	) : null;
}

export function PeekFacts({ facts, resolveGlyph = glyphUrl }: { facts: Facts; resolveGlyph?: (name: string) => string | undefined }) {
	const typeLine = [...facts.superTypes, ...facts.types].join(' ');
	const hasText = Boolean(facts.effectText?.trim() || facts.rulesText?.trim());
	return (
		<>
			<header className="peek-head">
				<div className="peek-title">
					<h2 className="peek-name">{facts.name}</h2>
					{facts.domains.length > 0 && (
						<ul className="peek-domains" aria-label="Domains">
							{facts.domains.map((domain) => {
								const url = resolveGlyph(`domain_${domain.slug}`);
								return (
									<li key={domain.slug} data-domain={domain.slug}>
										{url ? (
											<img className="peek-domain-icon" src={url} alt={domain.label} width="28" height="28" decoding="async" />
										) : (
											<span>{domain.label}</span>
										)}
									</li>
								);
							})}
						</ul>
					)}
				</div>
				<div className="peek-sub">
					<p className="peek-types">{typeLine}</p>
					{facts.banned && (
						<p className="peek-ban">
							Banned<span className="sr-only"> in Constructed</span>
						</p>
					)}
				</div>
			</header>
			<StatColumns stats={facts.stats} resolveGlyph={resolveGlyph} />
			{hasText && (
				<div className="peek-text card-text">
					<Paragraph text={facts.effectText} />
					<Paragraph text={facts.rulesText} />
				</div>
			)}
		</>
	);
}

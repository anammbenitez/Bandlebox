// The card's own facts beside its art: name (linking to OpenRift), type
// chips, stats with their card-text symbols, deck-limit override, errata,
// bans, and the printed text. The description is the printing's printed text
// and nothing else: the card's `keywords` field is a search index, already
// shown inside the text as [Keyword] labels.
import type { CardDetailData } from '../../domain/card-detail.ts';
import { CardText, CardTextContent } from '../../ui/molecules/CardText.tsx';

export function CardFacts({ card }: { card: CardDetailData }) {
	return (
		<div className="min-w-0">
			<h1 className="text-3xl font-semibold leading-tight">
				{/* OpenRift courtesy link */}
				<a className="transition-colors hover:text-amber-300" href={`https://openrift.app/cards/${card.slug}`}>
					{card.name}
				</a>
			</h1>

			<div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
				{card.types.map((t) => (
					<span key={`t-${t}`} className="rounded bg-slate-800 px-1.5 py-0.5 font-medium text-amber-300">
						{t}
					</span>
				))}
				{card.superTypes.map((st) => (
					<span key={`s-${st}`} className="rounded border border-slate-700 px-1.5 py-0.5 text-slate-300">
						{st}
					</span>
				))}
				{card.domains.map((d) => (
					<span key={`d-${d}`} className="rounded bg-slate-800/60 px-1.5 py-0.5 text-slate-300">
						{d}
					</span>
				))}
			</div>

			{card.stats.length > 0 && (
				<dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-y border-slate-800 py-3">
					{card.stats.map((stat) => (
						<div key={stat.kind}>
							<dt className="text-[10px] font-semibold tracking-[0.08em] uppercase text-slate-500">{stat.label}</dt>
							<dd className="mt-0.5 text-lg font-semibold leading-none text-slate-100 tnum">
								{stat.kind === 'energy' ? (
									<CardTextContent text={stat.symbol ?? ''} />
								) : (
									<>
										{stat.symbol && <CardTextContent text={stat.symbol} />}
										<span className={stat.symbol ? 'ml-1' : undefined}>{stat.value}</span>
									</>
								)}
								{stat.note && <span className="ml-1 text-xs font-normal text-slate-400">{stat.note}</span>}
							</dd>
						</div>
					))}
				</dl>
			)}

			{card.maxCopiesOverride != null && (
				<div className="callout mt-4" data-tone="warning">
					Deck limit override: {card.maxCopiesOverride} copies
				</div>
			)}

			{card.errata && (
				<div className="callout mt-4 border-sky-400/30 bg-sky-400/5 text-sky-100">
					<strong className="font-semibold">Errata</strong>
					{card.errata.effectiveDate && <span className="text-sky-200/70"> · effective {card.errata.effectiveDate}</span>}
					<p className="mt-1">
						<CardText text={card.errata.text} />
					</p>
					{card.errata.sourceUrl && (
						<a className="mt-1 inline-block text-xs text-sky-300 hover:underline" href={card.errata.sourceUrl}>
							{card.errata.source}
						</a>
					)}
				</div>
			)}

			{card.bans.length > 0 && (
				<div className="callout mt-4" data-tone="error">
					<strong className="font-semibold">Banned</strong>
					<ul className="mt-1 list-disc pl-4">
						{card.bans.map((b, i) => (
							<li key={i}>
								<span>{b.format}</span>
								{b.bannedAt && <span className="text-red-300/70"> · {b.bannedAt}</span>}
								{b.reason && <span className="text-red-300/70"> — {b.reason}</span>}
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="mt-5 max-w-[70ch] space-y-3 text-sm leading-relaxed text-slate-200">
				{card.effectText && (
					<p>
						<CardText text={card.effectText} />
					</p>
				)}
				{card.rulesText && (
					<p>
						<CardText text={card.rulesText} />
					</p>
				)}
				{card.flavorText && (
					<p className="border-l border-slate-800 pl-3 italic text-slate-400">
						<CardText text={card.flavorText} />
					</p>
				)}
			</div>

			<p className="mt-5 text-xs text-slate-500 tnum">
				{card.printingCount} printing{card.printingCount === 1 ? '' : 's'} in the snapshot
			</p>
		</div>
	);
}

// Every printing of the card in the snapshot, grouped by set (oldest release
// first), each with what tells it apart: code, rarity, finish, art variant,
// artist, language, channels and markers, and the back face of two-sided cards.
import type { CardDetailData, CardDetailPrinting } from '../../domain/card-detail.ts';
import { CardImage } from '../../ui/atoms/CardImage.tsx';

function Thumb({ card, printing }: { card: CardDetailData; printing: CardDetailPrinting }) {
	const shape = card.rotate ? 'aspect-[7/5]' : 'aspect-[5/7]';
	const landscape = card.rotate ? '' : undefined;
	if (!printing.thumbImageId) {
		return (
			<div data-landscape={landscape} className={`card-corner flex ${shape} w-full items-center justify-center bg-slate-900 text-[10px] text-slate-500`}>
				no art
			</div>
		);
	}
	return (
		<div data-landscape={landscape} className={`card-corner relative ${shape} w-full overflow-hidden bg-slate-900`}>
			<CardImage
				imageId={printing.thumbImageId}
				role="thumb"
				rotate={card.rotate}
				alt={`${card.name} card art — ${printing.altCode}`}
				loading="lazy"
				className="absolute inset-0 h-full w-full object-cover"
			/>
		</div>
	);
}

function PrintingRow({ card, printing }: { card: CardDetailData; printing: CardDetailPrinting }) {
	return (
		<li className={`grid gap-3 p-3 ${card.rotate ? 'sm:grid-cols-[120px_1fr]' : 'sm:grid-cols-[84px_1fr]'}`}>
			<Thumb card={card} printing={printing} />
			<div className="min-w-0 text-sm">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<span className="font-semibold text-amber-300 tnum">{printing.code}</span>
					<span className="text-slate-300">{printing.rarity}</span>
					<span className="text-slate-500">·</span>
					<span className="text-slate-400">{printing.finish}</span>
					{printing.artVariant && <span className="tag">{printing.artVariant}</span>}
					{printing.isSigned && <span className="tag">Signed</span>}
					{printing.isOvernumbered && <span className="tag">Overnumbered</span>}
					{printing.size && <span className="tag">{printing.size}</span>}
				</div>
				{printing.printedName && <div className="mt-1 text-slate-300">Printed name: {printing.printedName}</div>}
				<div className="mt-1 text-xs text-slate-500">
					{printing.artist && <span>Art by {printing.artist} · </span>}
					<span>{printing.language}</span>
				</div>
				{(printing.channels.length > 0 || printing.markers.length > 0) && (
					<div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
						{printing.channels.map((c) => (
							<span key={`c-${c}`} className="rounded-full bg-slate-800/70 px-2 py-0.5 text-slate-300">
								{c}
							</span>
						))}
						{printing.markers.map((m) => (
							<span key={`m-${m}`} className="rounded-full border border-amber-400/40 px-2 py-0.5 text-amber-300">
								{m}
							</span>
						))}
					</div>
				)}
				{printing.comment && <div className="mt-1 text-xs italic text-slate-500">{printing.comment}</div>}
				{printing.side2 && (
					<div className="mt-2 rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs">
						<span className="font-medium text-slate-200">Two-sided card — back face:</span>
						{printing.side2.slug ? (
							<a className="ml-1 text-amber-300 hover:underline" href={`/cards/${printing.side2.slug}`}>
								{printing.side2.name}
							</a>
						) : (
							<span className="ml-1">{printing.side2.name}</span>
						)}
						{printing.side2.publicCode && <span className="ml-2 text-slate-500">({printing.side2.publicCode})</span>}
					</div>
				)}
			</div>
		</li>
	);
}

export function PrintingsTable({ card }: { card: CardDetailData }) {
	return (
		<>
			<h2 className="mt-12 border-b border-slate-800 pb-2 text-lg font-semibold">Printings</h2>
			{card.sets.map((set) => (
				<section key={set.slug} className="mt-6">
					<h3 className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-slate-200">
						{set.name}
						<span className="tag">{set.slug}</span>
						<span className="text-xs text-slate-500 tnum">
							{set.printings.length} printing{set.printings.length === 1 ? '' : 's'}
						</span>
					</h3>
					<ul className="mt-2 divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
						{set.printings.map((printing) => (
							<PrintingRow key={printing.key} card={card} printing={printing} />
						))}
					</ul>
				</section>
			))}
		</>
	);
}

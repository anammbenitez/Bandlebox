// New deck: pick the Legend and name the deck, both required (deck-library
// spec, creation modal). Cancel, Escape or a click on the backdrop keeps
// everything as it was; focus returns to the plus tile.
import { useEffect, useRef, useState } from 'react';
import { CardPeek } from '../../ui/organisms/peek/CardPeek.tsx';
import { DECK_NAME_MAX } from '../../domain/deck.ts';
import { Button } from '../../ui/atoms/Button.tsx';
import { TextField } from '../../ui/atoms/Field.tsx';
import styles from './DeckLibrary.module.css';
import { LegendArt, type LegendEntry } from './DeckTile.tsx';

export interface DomainChip {
	slug: string;
	label?: string;
	icon?: string | null;
}

interface CreateDeckDialogProps {
	open: boolean;
	legends: LegendEntry[];
	domains?: DomainChip[];
	onCancel: () => void;
	onCreate: (name: string, legend: LegendEntry) => void;
}

function matches(entry: LegendEntry, q: string, chosen: ReadonlySet<string>): boolean {
	if (![...chosen].every((slug) => entry.domains.includes(slug))) return false;
	return !q || entry.name.toLowerCase().includes(q) || entry.slug.includes(q) || entry.tags.some((tag) => tag.toLowerCase().includes(q));
}

export function CreateDeckDialog({ open, legends, domains = [], onCancel, onCreate }: CreateDeckDialogProps) {
	const [name, setName] = useState('');
	const [query, setQuery] = useState('');
	const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
	const [picked, setPicked] = useState<LegendEntry | null>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);

	// Each opening starts fresh, with the legend search focused.
	useEffect(() => {
		if (open) searchRef.current?.focus();
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onCancel();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, onCancel]);

	const q = query.trim().toLowerCase();
	const found = legends.filter((entry) => matches(entry, q, chosen));
	const ready = Boolean(picked) && name.trim().length > 0;

	return (
		<div
			ref={rootRef}
			id="deck-create-modal"
			hidden={!open}
			className={styles.backdrop}
			role="dialog"
			aria-modal="true"
			aria-labelledby="deck-create-title"
			onClick={(event) => {
				if (event.target === event.currentTarget) onCancel(); // backdrop click
			}}
		>
			<div className={styles.dialog}>
				<h2 id="deck-create-title" className="text-base font-semibold">
					New deck
				</h2>
				<p className="mt-1 text-sm text-slate-400">Choose the Legend to play and name the deck. Cancel keeps everything as it was.</p>

				<label className="mt-4 block">
					<span className="label">Deck name</span>
					<TextField
						id="modal-name"
						placeholder="e.g. Poro Swarm"
						autoComplete="off"
						maxLength={DECK_NAME_MAX}
						className="mt-1.5 h-11 w-full"
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
				</label>

				<div className={styles.legendField}>
					<span className="label">Legend</span>
					<div className={styles.legendControls}>
						<TextField
							ref={searchRef}
							id="modal-legend-search"
							type="search"
							placeholder="Search legends…"
							autoComplete="off"
							className={styles.legendSearch}
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
						{domains.length > 0 && (
							<div id="modal-domains" role="group" aria-label="Filter by domain" className={styles.domainChips}>
								{domains.map((d) => {
									const label = d.label ?? d.slug;
									return (
										<button
											key={d.slug}
											type="button"
											data-domain={d.slug}
											aria-pressed={chosen.has(d.slug)}
											className="pill"
											data-emblem={d.icon ? '' : undefined}
											title={`${label} legends`}
											onClick={() =>
												setChosen((prev) => {
													const next = new Set(prev);
													if (!next.delete(d.slug)) next.add(d.slug);
													return next;
												})
											}
										>
											{d.icon ? <img className="pill-emblem" src={d.icon} alt={label} width="22" height="22" decoding="async" /> : label}
										</button>
									);
								})}
							</div>
						)}
					</div>
					{/* Kept as before: the Tailwind `hidden` class keeps this line out of view. */}
					<div id="modal-selected" hidden={!picked} className="mt-2 hidden rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs text-amber-300">
						{picked ? `Legend: ${picked.name}` : ''}
					</div>
					<ul id="modal-legend-list" data-section="legend" className={styles.legendGrid}>
						{found.length ? (
							found.slice(0, 48).map((entry) => (
								<li key={entry.slug}>
									<button
										type="button"
										data-legend-pick={entry.slug}
										data-slug={entry.slug}
										aria-pressed={picked?.slug === entry.slug}
										className={styles.legendPick}
										onClick={() => setPicked(entry)}
									>
										<LegendArt legend={entry} role="thumb" alt="" />
										<span className={`${styles.legendPickLabel} truncate`}>{entry.name}</span>
									</button>
								</li>
							))
						) : (
							<li className="col-span-full py-3 text-center text-xs text-slate-500">No legends match that search.</li>
						)}
					</ul>
				</div>

				<div className="mt-5 flex justify-end gap-2">
					<Button id="modal-cancel" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						id="modal-accept"
						variant="primary"
						disabled={!ready}
						onClick={() => {
							if (picked && name.trim()) onCreate(name.trim(), picked);
						}}
					>
						Create deck
					</Button>
				</div>
			</div>
			{/* The same hover card the deck editor shows, for the Legend faces. */}
			<CardPeek root={rootRef} faceSelector="[data-legend-pick]" />
		</div>
	);
}

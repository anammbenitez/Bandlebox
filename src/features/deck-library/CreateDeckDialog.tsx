// New deck: pick the Legend and name the deck, both required (deck-library
// spec, creation modal). Cancel, Escape or a click on the backdrop keeps
// everything as it was; focus returns to the plus tile.
import { useEffect, useRef, useState } from 'react';
import { DECK_NAME_MAX } from '../../domain/deck.ts';
import { Button } from '../../ui/atoms/Button.tsx';
import { CardImage } from '../../ui/atoms/CardImage.tsx';
import { TextField } from '../../ui/atoms/Field.tsx';
import styles from './DeckLibrary.module.css';
import type { LegendEntry } from './DeckTile.tsx';

interface CreateDeckDialogProps {
	open: boolean;
	legends: LegendEntry[];
	onCancel: () => void;
	onCreate: (name: string, legend: LegendEntry) => void;
}

function matches(entry: LegendEntry, q: string): boolean {
	return !q || entry.name.toLowerCase().includes(q) || entry.slug.includes(q);
}

export function CreateDeckDialog({ open, legends, onCancel, onCreate }: CreateDeckDialogProps) {
	const [name, setName] = useState('');
	const [query, setQuery] = useState('');
	const [picked, setPicked] = useState<LegendEntry | null>(null);
	const searchRef = useRef<HTMLInputElement>(null);

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
	const found = legends.filter((entry) => matches(entry, q));
	const ready = Boolean(picked) && name.trim().length > 0;

	return (
		<div
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
						className="mt-1.5 w-full"
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
				</label>

				<div className="mt-4">
					<span className="label">Legend</span>
					<TextField
						ref={searchRef}
						id="modal-legend-search"
						type="search"
						placeholder="Search legends…"
						autoComplete="off"
						className="mt-1.5 w-full"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
					{/* Kept as before: the Tailwind `hidden` class keeps this line out of view. */}
					<div id="modal-selected" hidden={!picked} className="mt-2 hidden rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs text-amber-300">
						{picked ? `Legend: ${picked.name}` : ''}
					</div>
					<ul id="modal-legend-list" className="mt-2 grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
						{found.length ? (
							found.slice(0, 48).map((entry) => (
								<li key={entry.slug}>
									<button
										type="button"
										data-legend-pick={entry.slug}
										aria-pressed={picked?.slug === entry.slug}
										className={styles.legendPick}
										onClick={() => setPicked(entry)}
									>
										{entry.imageId ? (
											<CardImage imageId={entry.imageId} role="thumb" alt="" loading="lazy" className="h-full w-full object-cover" />
										) : (
											<span className="grid h-full place-items-center text-slate-600">—</span>
										)}
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
		</div>
	);
}

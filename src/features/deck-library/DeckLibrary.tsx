// The deck library (island, client:load; deck-library spec): the plus tile,
// one tile per saved deck with its live legality badge, and the creation
// dialog. Decks live in this browser: the build output and the hydration pass
// render the plus tile only; the decks appear once the store has read them.
import { useEffect, useMemo, useState } from 'react';
import { validate, type DeckRuleIndexes } from '../../domain/deck-rules.ts';
import { PAYLOAD_IDS } from '../../domain/payload-ids.ts';
import { useJsonTag } from '../../ui/hooks/useJsonTag.ts';
import { useDeckStore } from '../../state/deck-store.ts';
import { CreateDeckDialog, type DomainChip } from './CreateDeckDialog.tsx';
import { CreateTile, DeckTile, type LegendEntry } from './DeckTile.tsx';

export function DeckLibrary({ legends, domains = [] }: { legends: LegendEntry[]; domains?: DomainChip[] }) {
	const idx = useJsonTag<DeckRuleIndexes>(PAYLOAD_IDS.deckRules);
	const loaded = useDeckStore((s) => s.loaded);
	const decks = useDeckStore((s) => s.library);
	const problem = useDeckStore((s) => s.problem);
	const load = useDeckStore((s) => s.load);
	const rename = useDeckStore((s) => s.rename);
	const remove = useDeckStore((s) => s.remove);
	const create = useDeckStore((s) => s.create);
	const [confirming, setConfirming] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);

	useEffect(() => load(), [load]);

	const bySlug = useMemo(() => new Map(legends.map((l) => [l.slug, l])), [legends]);
	const legality = useMemo(() => new Map(idx ? decks.map((d) => [d.id, validate(d, idx).legal]) : []), [decks, idx]);

	function closeDialog() {
		setCreating(false);
		document.getElementById('open-create-modal')?.focus();
	}

	return (
		<>
			<div id="deck-storage-warning" hidden={!problem} className="mt-4 rounded-md border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
				Decks are not being saved this visit — browser storage is unavailable or full. Keep this window open, or try again in a normal browser window.
			</div>

			<ul id="deck-grid" className="mt-5 grid list-none grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
				<CreateTile onOpen={() => setCreating(true)} />
				{decks.map((deck) => (
					<DeckTile
						key={deck.id}
						deck={deck}
						legal={legality.get(deck.id) ?? false}
						legend={bySlug.get(deck.legend[0]?.card ?? '')}
						confirming={confirming === deck.id}
						onRename={() => {
							const next = window.prompt('Rename deck', deck.name)?.trim();
							if (next) rename(deck.id, next);
						}}
						onDelete={() => setConfirming(deck.id)}
						onConfirm={() => {
							setConfirming(null);
							remove(deck.id);
						}}
						onKeep={() => setConfirming(null)}
					/>
				))}
			</ul>

			<p id="deck-empty" hidden={!loaded || decks.length > 0} className="mt-4 text-sm text-slate-400">
				No decks yet — the plus tile starts your first one.
			</p>

			<CreateDeckDialog
				key={creating ? 'open' : 'closed'}
				open={creating}
				legends={legends}
				domains={domains}
				onCancel={closeDialog}
				onCreate={(name, legend) => {
					const deck = create(name, legend.slug);
					setCreating(false);
					window.location.href = `/decks/build#d/${deck.id}`;
				}}
			/>
		</>
	);
}

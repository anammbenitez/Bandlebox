// The deck's bar (deck-manager spec): its name, edited in place for an owned
// deck (Enter saves, Escape cancels) and plain text for a shared one; the meta
// line (counts and the focused section, or the editing hint, or "Saved ✓");
// the verdict; and Rename, Copy deck link, Save as my deck, All decks.
import { useRef, useState, type ReactNode } from 'react';
import { SECTION_LABELS, type SectionKey } from '../../domain/deck.ts';
import { VerdictBadge } from '../../ui/molecules/VerdictBadge.tsx';

const TITLE_HINT = 'Enter to save · Esc to cancel';
const SAVED_MS = 1600;

interface DeckBarProps {
	/** Null while no deck is open (the bar shows `fallbackTitle`). */
	name: string | null;
	fallbackTitle: string;
	fallbackMeta: string;
	shared: boolean;
	legal: boolean | null;
	/** The legality checklist, revealed while the verdict pill is hovered or focused. */
	legality?: ReactNode;
	totalCopies: number;
	active: SectionKey;
	onRename(name: string): boolean;
	onShare(): Promise<void>;
	onSaveShared(): void;
}

export function DeckBar({ name, fallbackTitle, fallbackMeta, shared, legal, legality, totalCopies, active, onRename, onShare, onSaveShared }: DeckBarProps) {
	const [draft, setDraft] = useState<string | null>(null);
	const [note, setNote] = useState<string | null>(null);
	const [shareLabel, setShareLabel] = useState('Copy deck link');
	const cancelled = useRef(false);
	const input = useRef<HTMLInputElement>(null);
	const noteTimer = useRef(0);

	const open = name !== null;
	const editable = open && !shared;
	const title = name || (open ? 'Deck' : fallbackTitle);
	const value = draft ?? title;
	const meta = !open ? fallbackMeta : (note ?? `${totalCopies} cards · ${SECTION_LABELS[active]} focused${shared ? ' · shared view' : ''}`);

	function commit() {
		const wasCancelled = cancelled.current;
		cancelled.current = false;
		const next = draft;
		setDraft(null);
		window.clearTimeout(noteTimer.current);
		if (!wasCancelled && next !== null && onRename(next)) {
			setNote('Saved ✓');
			noteTimer.current = window.setTimeout(() => setNote(null), SAVED_MS);
		} else {
			setNote(null);
		}
	}

	return (
		<header className="deck-bar">
			<div className="min-w-0">
				<h1 id="deck-name" className="deck-title min-w-0">
					<span id="deck-name-text" className="deck-name-text block truncate" hidden={editable}>
						{title}
					</span>
					<span id="deck-name-field" className="deck-name-field" data-value={value} hidden={!editable}>
						<input
							ref={input}
							id="deck-name-input"
							className="deck-name-input"
							type="text"
							aria-label="Deck name"
							title="Rename deck"
							maxLength={80}
							autoComplete="off"
							spellCheck={false}
							value={value}
							onFocus={() => {
								window.clearTimeout(noteTimer.current);
								cancelled.current = false;
								setDraft(value);
								setNote(TITLE_HINT);
							}}
							onChange={(e) => setDraft(e.target.value)}
							onKeyDown={(e) => {
								if (e.nativeEvent.isComposing) return; // an IME's Enter confirms the composition
								if (e.key === 'Enter') {
									e.preventDefault();
									e.currentTarget.blur();
								} else if (e.key === 'Escape') {
									e.preventDefault();
									cancelled.current = true;
									e.currentTarget.blur();
								}
							}}
							onBlur={commit}
						/>
					</span>
				</h1>
				<p id="deck-meta" className="deck-meta">
					{meta}
				</p>
			</div>
			<div id="deck-actions" hidden={!open} className="flex flex-wrap items-center gap-1.5">
				<div className="verdict-wrap" tabIndex={legality ? 0 : undefined} aria-describedby={legality ? 'deck-legality' : undefined}>
					<VerdictBadge id="deck-verdict" kind="verdict" legal={legal} />
					{legality}
				</div>
				<button
					id="deck-rename"
					type="button"
					className="btn"
					hidden={!editable}
					onClick={() => {
						input.current?.focus();
						input.current?.select();
					}}
				>
					Rename
				</button>
				<button
					id="deck-share"
					type="button"
					className="btn"
					hidden={shared}
					onClick={async () => {
						await onShare().then(
							() => setShareLabel('Link copied ✓'),
							() => undefined,
						);
						window.setTimeout(() => setShareLabel('Copy deck link'), 1600);
					}}
				>
					{shareLabel}
				</button>
				<button id="deck-save-shared" type="button" hidden={!shared} className="btn" data-variant="primary" onClick={onSaveShared}>
					Save as my deck
				</button>
				<a href="/decks" className="btn" data-variant="ghost" aria-label="All decks">
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
						<path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					<span>All decks</span>
				</a>
			</div>
		</header>
	);
}

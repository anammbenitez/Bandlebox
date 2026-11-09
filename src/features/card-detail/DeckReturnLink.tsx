// The card page's back link, rendered static as "All cards" → the grid. The
// deck-return-link behavior (src/behaviors) upgrades it to "Back to deck" when
// the page was opened from the deck manager; without JavaScript it stays as is.
export function DeckReturnLink() {
	return (
		<p className="text-xs">
			<a id="back-link" className="inline-flex items-center gap-1 text-slate-400 transition-colors hover:text-amber-300" href="/">
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
					<path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
				<span id="back-label">All cards</span>
			</a>
		</p>
	);
}

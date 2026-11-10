// The card page's Back button: the previous page, always. Rendered static as
// "Back" → the grid; the deck-return-link behavior (src/behaviors) makes it the
// browser's back, or the address the card link carried (?from=). Without
// JavaScript it stays a link to the grid.
export function DeckReturnLink() {
	return (
		<p>
			<a id="back-link" className="btn h-11 gap-2 px-5 text-base font-semibold" href="/">
				<svg width="18" height="18" viewBox="0 0 12 12" fill="none" aria-hidden="true">
					<path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
				<span id="back-label">Back</span>
			</a>
		</p>
	);
}

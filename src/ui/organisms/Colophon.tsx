// The footer: who owns the cards and where the catalog comes from. The
// attribution is non-negotiable (PRODUCT.md, Brand Commitments).
export function Colophon() {
	return (
		<footer className="colophon">
			<div className="colophon-row">
				<span className="colophon-own">
					Card data &amp; art: <span className="colophon-mark">RIFTBOUND</span> © Riot Games.
				</span>
				<span className="colophon-src">
					Catalog from{' '}
					<a className="colophon-link" href="https://openrift.app">
						OpenRift
					</a>
					.
				</span>
				<span className="colophon-note">
					Card images are requested from OpenRift when needed and never mirrored locally; card symbols are cached locally for offline reading.
				</span>
			</div>
		</footer>
	);
}

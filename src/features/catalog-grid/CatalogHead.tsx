// The browse page's heading (static).
export function CatalogHead({ cardCount, setCount }: { cardCount: number; setCount: number }) {
	return (
		<header className="page-head">
			<div>
				<h1 className="page-title">Browse cards</h1>
				<p className="page-lede">Catalog of all the cards in the game.</p>
			</div>
			<p className="page-meta">
				{cardCount.toLocaleString('en-US')} cards · {setCount} sets
			</p>
		</header>
	);
}

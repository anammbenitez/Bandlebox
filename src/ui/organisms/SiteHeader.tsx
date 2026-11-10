// The app-wide header (site-navigation spec): brand, then Decks and Browse
// cards, fixed while the page scrolls, with the painted branch and two
// flowering sprigs along its underside (DESIGN.md: the only painted detail).
// Every page shows this exact header; only the current-page marker moves.
// The layout persists it across navigations (it is never torn down and
// rebuilt), so the marker follows the live address through a hook.
// Image URLs come from the layout, which optimizes them at build.
import type { CSSProperties } from 'react';
import { useCurrentPath } from '../hooks/useCurrentPath.ts';

export interface SiteHeaderImages {
	logo: { src: string; srcSet: string; width: number; height: number };
	sprigUpper: string;
	sprigLower: string;
}

const NAV = [
	{ href: '/decks', label: 'Decks', match: (p: string) => p.startsWith('/decks') },
	{ href: '/', label: 'Browse cards', match: (p: string) => p === '/' },
];

export function SiteHeader({ currentPath: builtPath, images }: { currentPath: string; images: SiteHeaderImages }) {
	const currentPath = useCurrentPath(builtPath);
	return (
		<header className="site-header sticky top-0 z-40 pb-1">
			<nav id="site-nav" className="site-nav nav-wide mx-auto max-w-none gap-4 px-4 sm:gap-6">
				<a href="/" className="nav-brand" aria-label="BandleBox — home">
					<img
						src={images.logo.src}
						srcSet={images.logo.srcSet}
						alt=""
						loading="eager"
						decoding="async"
						width={images.logo.width}
						height={images.logo.height}
						className="brand-mark"
					/>
					<span>BandleBox</span>
				</a>
				{/* a twig planted in the header's branch, between the brand and the
				    pages, with a flowering knot of the center sprig where they join */}
				<span className="nav-twig" style={{ '--sprig': `url(${images.sprigUpper})` } as CSSProperties} aria-hidden="true" />
				{NAV.map((n) => {
					const current = n.match(currentPath);
					return (
						<a key={n.href} className="nav-link" href={n.href} aria-current={current ? 'page' : undefined}>
							{n.label}
						</a>
					);
				})}
			</nav>
			<span className="header-sprig header-sprig--a" style={{ backgroundImage: `url(${images.sprigUpper})` }} aria-hidden="true" />
			<span className="header-sprig header-sprig--b" style={{ backgroundImage: `url(${images.sprigLower})` }} aria-hidden="true" />
		</header>
	);
}

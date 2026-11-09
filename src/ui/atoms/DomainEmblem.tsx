// A domain's emblem: the image OpenRift draws for it (cached by refresh into
// data/glyphs). Without an image the domain's name is printed instead.
export interface DomainEmblemProps {
	/** Resolved emblem URL, or null when refresh found none. */
	src: string | null;
	label: string;
	size?: number;
	className?: string;
	/** Decorative when a neighbour already names the domain. */
	decorative?: boolean;
}

export function DomainEmblem({ src, label, size = 16, className, decorative = false }: DomainEmblemProps) {
	if (!src) return <span className={className}>{label}</span>;
	return <img className={className} src={src} alt={decorative ? '' : label} width={size} height={size} decoding="async" />;
}

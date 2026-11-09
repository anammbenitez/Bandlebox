// A deck's legality at a glance: a dot and "Legal" / "Not legal". `badge` is
// the library tile's corner badge, `verdict` the deck bar's pill. A deck that
// cannot be judged yet shows the dash state. The deck bar's pill is still the
// global `.verdict` while the pre-React deck manager uses it.
import styles from './VerdictBadge.module.css';

export interface VerdictBadgeProps {
	legal: boolean | null;
	kind?: 'badge' | 'verdict';
	id?: string;
	/** Keeps its place but is not shown (the tile's corner is busy). */
	concealed?: boolean;
}

export function VerdictBadge({ legal, kind = 'badge', id, concealed = false }: VerdictBadgeProps) {
	const text = legal === null ? '—' : legal ? 'Legal' : 'Not legal';
	return (
		<span
			id={id}
			className={kind === 'badge' ? styles.badge : 'verdict'}
			data-legal={legal === null ? 'unknown' : String(legal)}
			style={concealed ? { visibility: 'hidden' } : undefined}
		>
			<i className="dot" />
			{text}
		</span>
	);
}

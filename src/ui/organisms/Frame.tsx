// The plain bark border around a working panel (DESIGN.md: no painted pieces
// on panels). A bordered box only: it resizes and reflows like any block.
//   tone  bark = default; lit = the warmer deck sheet; quiet = the card browser
import type { ReactNode } from 'react';
import styles from './Frame.module.css';

export interface FrameProps {
	tone?: 'bark' | 'lit' | 'quiet';
	className?: string;
	children: ReactNode;
}

/** Also carries the global `frame` / `frame-body` names: page rules such as the
 *  deck columns' foot fade (`.deck-frame .frame-body::after`) hook onto them. */
export function Frame({ tone = 'bark', className, children }: FrameProps) {
	const classes = ['frame', styles.frame, tone === 'lit' && `frame--lit ${styles.lit}`, tone === 'quiet' && `frame--quiet ${styles.quiet}`, className]
		.filter(Boolean)
		.join(' ');
	return (
		<div className={classes}>
			<div className={`frame-body ${styles.body}`}>{children}</div>
		</div>
	);
}

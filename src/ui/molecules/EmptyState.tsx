// The quiet message where content would be (no matches, no deck, a broken
// link), optionally with the one action that gets out of it.
import type { ReactNode } from 'react';

export interface EmptyStateProps {
	children: ReactNode;
	action?: ReactNode;
	className?: string;
	hidden?: boolean;
	id?: string;
}

export function EmptyState({ children, action, className, hidden, id }: EmptyStateProps) {
	if (!action) {
		return (
			<p id={id} hidden={hidden} className={['empty-state', className].filter(Boolean).join(' ')}>
				{children}
			</p>
		);
	}
	return (
		<div id={id} hidden={hidden} className={['empty-state flex flex-col items-center gap-3', className].filter(Boolean).join(' ')}>
			<p>{children}</p>
			{action}
		</div>
	);
}

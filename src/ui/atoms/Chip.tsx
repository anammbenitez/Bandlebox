// A filter chip (DESIGN.md: "the default button's plate cut to a chip"; lit
// sap when on). Always a toggle. `emblem` marks a chip whose face is an image
// (a domain emblem) rather than a word. Look: `.pill` in global.css until its
// legacy users are ported (design D9).
import type { ButtonHTMLAttributes } from 'react';
import { tv } from 'tailwind-variants/lite';

const chip = tv({ base: 'pill' });

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
	selected: boolean;
	emblem?: boolean;
	className?: string;
}

export function Chip({ selected, emblem = false, className, type = 'button', ...rest }: ChipProps) {
	return <button type={type} aria-pressed={selected} data-emblem={emblem ? '' : undefined} className={chip({ class: className })} {...rest} />;
}

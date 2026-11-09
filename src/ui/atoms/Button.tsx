// The one button (DESIGN.md "Buttons"): five roles set by what the action is,
// a small size, a toggle state, and a link form that looks like the same
// button. Its look is the `.btn` rules in global.css until the last legacy
// script that renders `.btn` is gone (design D9, incremental rule; task 8.4
// moves them into a module beside this file).
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, Ref } from 'react';
import { tv } from 'tailwind-variants/lite';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'link' | 'danger';
export type ButtonSize = 'md' | 'sm';

const button = tv({ base: 'btn' });

interface CommonProps {
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
}

export interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
	/** A toggle: `true` / `false` render `aria-pressed`; leave unset for a plain button. */
	pressed?: boolean;
	ref?: Ref<HTMLButtonElement>;
	href?: undefined;
}

export interface LinkButtonProps extends CommonProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> {
	href: string;
	ref?: Ref<HTMLAnchorElement>;
}

function look({ variant = 'default', size = 'md', className }: CommonProps) {
	return {
		className: button({ class: className }),
		'data-variant': variant === 'default' ? undefined : variant,
		'data-size': size === 'md' ? undefined : size,
	};
}

export function Button(props: ButtonProps | LinkButtonProps) {
	if (props.href !== undefined) {
		const { variant, size, className, ...anchor } = props;
		return <a {...anchor} {...look({ variant, size, className })} />;
	}
	const { variant, size, className, pressed, type = 'button', ...rest } = props;
	return <button type={type} aria-pressed={pressed} {...rest} {...look({ variant, size, className })} />;
}

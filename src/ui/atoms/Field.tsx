// Text and select fields share one look (`.field` in global.css until its
// legacy users are ported, design D9).
import type { InputHTMLAttributes, Ref, SelectHTMLAttributes } from 'react';
import { tv } from 'tailwind-variants/lite';

const field = tv({ base: 'field' });

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
	className?: string;
	ref?: Ref<HTMLInputElement>;
}

export function TextField({ className, type = 'text', ...rest }: TextFieldProps) {
	return <input type={type} className={field({ class: className })} {...rest} />;
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
	className?: string;
	ref?: Ref<HTMLSelectElement>;
}

export function SelectField({ className, ...rest }: SelectFieldProps) {
	return <select className={field({ class: className })} {...rest} />;
}

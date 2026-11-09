import { renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearJsonTagCache, readJsonTag, useJsonTag } from './useJsonTag.ts';

function addTag(id: string, text: string): HTMLScriptElement {
	const tag = document.createElement('script');
	tag.type = 'application/json';
	tag.id = id;
	tag.textContent = text;
	document.body.append(tag);
	return tag;
}

beforeEach(() => clearJsonTagCache());
afterEach(() => {
	document.body.innerHTML = '';
});

describe('readJsonTag', () => {
	it('parses the tag', () => {
		addTag('a', '{"n":[1,2]}');
		expect(readJsonTag<{ n: number[] }>('a')).toEqual({ n: [1, 2] });
	});

	it('a missing tag is null', () => {
		expect(readJsonTag('nope')).toBeNull();
	});

	it('a malformed tag is null, not an exception', () => {
		addTag('bad', '{not json');
		expect(readJsonTag('bad')).toBeNull();
	});

	it('is read once: later changes to the tag are not seen, and the value is the same object', () => {
		const tag = addTag('once', '{"v":1}');
		const first = readJsonTag('once');
		tag.textContent = '{"v":2}';
		expect(readJsonTag('once')).toBe(first);
	});
});

describe('useJsonTag', () => {
	it('gives the value once the page runs', () => {
		addTag('b', '["x"]');
		const { result } = renderHook(() => useJsonTag<string[]>('b'));
		expect(result.current).toEqual(['x']);
	});

	it('is null on the server, so the hydration pass matches it', () => {
		addTag('c', '["x"]');
		function Probe() {
			return createElement('p', null, String(useJsonTag<string[]>('c')));
		}
		expect(renderToString(createElement(Probe))).toContain('null');
	});
});

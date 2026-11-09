import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useCurrentAddress } from './useCurrentAddress.ts';

afterEach(() => window.history.replaceState(null, '', '/'));

describe('useCurrentAddress', () => {
	it('is the path, query and hash together', () => {
		window.history.replaceState(null, '', '/decks/build?x=1#d/abc');
		const { result } = renderHook(() => useCurrentAddress());
		expect(result.current).toBe('/decks/build?x=1#d/abc');
	});

	it('follows a hash change', () => {
		window.history.replaceState(null, '', '/decks/build#d/abc');
		const { result } = renderHook(() => useCurrentAddress());
		act(() => {
			window.location.hash = '#d/other';
			window.dispatchEvent(new HashChangeEvent('hashchange'));
		});
		expect(result.current).toBe('/decks/build#d/other');
	});

	it('picks up an address replaced without an event on the next render', () => {
		window.history.replaceState(null, '', '/decks/build#s/payload');
		const { result, rerender } = renderHook(() => useCurrentAddress());
		window.history.replaceState(null, '', '/decks/build#d/mine');
		rerender();
		expect(result.current).toBe('/decks/build#d/mine');
	});

	it('is empty on the server, so hydration agrees', () => {
		function Probe() {
			return createElement('p', null, `[${useCurrentAddress()}]`);
		}
		expect(renderToString(createElement(Probe))).toContain('[]');
	});
});

// Testing Library matchers (toBeInTheDocument, toHaveAttribute, …) and DOM
// cleanup between tests.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// jsdom has no layout: scrolling is a no-op there.
if (typeof Element !== 'undefined') Element.prototype.scrollTo ??= () => {};

// Unit and component tests (design D10). Built on Astro's own Vite config so
// aliases, `import.meta.glob` (glyphs) and the React plugin match the build.
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.{ts,tsx,mjs}'],
		setupFiles: ['./vitest.setup.ts'],
	},
});

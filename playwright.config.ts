// Parity suite (openspec change migrate-to-react, design D10). It runs against
// the built and previewed static site, so it checks what users actually get.
import { defineConfig, devices } from '@playwright/test';

// Its own port: never reuse a running `astro dev` (4321), which would test
// dev output instead of the production build.
const PORT = 4399;

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: [['list']],
	timeout: 30_000,
	expect: {
		toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
	},
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure',
		...devices['Desktop Chrome'],
		viewport: { width: 1440, height: 900 },
	},
	webServer: {
		command: `npm run build && npx astro preview --port ${PORT}`,
		url: `http://localhost:${PORT}/`,
		reuseExistingServer: false,
		timeout: 180_000,
	},
});

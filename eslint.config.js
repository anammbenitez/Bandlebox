// Lint: the layer rules of openspec change migrate-to-react (design D2), React
// hooks rules, and TypeScript. `.astro` files are not linted here; the
// structure check (scripts/check-structure.mjs) covers what lint cannot see.
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const ELEMENTS = [
	{ type: 'pages', pattern: 'src/pages' },
	{ type: 'layouts', pattern: 'src/layouts' },
	{ type: 'feature', pattern: 'src/features/*', capture: ['name'] },
	{ type: 'ui', pattern: 'src/ui' },
	{ type: 'state', pattern: 'src/state' },
	{ type: 'behaviors', pattern: 'src/behaviors' },
	{ type: 'domain', pattern: 'src/domain' },
	{ type: 'server', pattern: 'src/server' },
	{ type: 'styles', pattern: 'src/styles' },
	{ type: 'assets', pattern: 'src/assets' },
];

const to = (...types) => ({ to: { element: { types } } });

export default tseslint.config(
	{ ignores: ['dist/**', '.astro/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', '.claude/**', '.opencode/**', 'public/**'] },
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.{ts,tsx}'],
		plugins: { boundaries, 'react-hooks': reactHooks },
		settings: {
			'boundaries/elements': ELEMENTS,
			'import/resolver': { typescript: { alwaysTryTypes: true } },
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'boundaries/dependencies': [
				'error',
				{
					default: 'disallow',
					policies: [
						{ from: { element: { type: 'pages' } }, allow: to('layouts', 'feature', 'ui', 'state', 'behaviors', 'domain', 'server', 'styles', 'assets') },
						{ from: { element: { type: 'layouts' } }, allow: to('ui', 'behaviors', 'domain', 'server', 'styles', 'assets') },
						{ from: { element: { type: 'feature' } }, allow: to('ui', 'state', 'domain', 'styles', 'assets') },
						{ from: { element: { type: 'ui' } }, allow: to('domain', 'styles', 'assets') },
						{ from: { element: { type: 'state' } }, allow: to('domain') },
						{ from: { element: { type: 'behaviors' } }, allow: to('domain') },
						{ from: { element: { type: 'server' } }, allow: to('domain') },
						{ from: { element: { type: 'domain' } }, allow: to('domain') },
					],
				},
			],
			// The pure modules type-strip under tests; unused vars stay an error.
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
		},
	},
	{
		files: ['tests/**/*.ts', '*.config.{js,ts,mjs}', 'vitest.setup.ts', 'scripts/**/*.mjs'],
		rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
	},
);

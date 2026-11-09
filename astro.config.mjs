// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// React renders every UI component (openspec change migrate-to-react, design
// D1): without a client directive it is plain HTML at build; islands hydrate.
export default defineConfig({
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
	},
});

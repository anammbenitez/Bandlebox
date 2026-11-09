## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Code structure

Astro owns pages and the build; React owns every UI component (`src/ui`, `src/features`). Pure logic is in `src/domain`, build-time data access in `src/server`, shared client state in `src/state`. `CLAUDE.md` has the layer rules, which ESLint enforces. Before calling work done run `npm run lint`, `typecheck`, `test`, `build` and `test:e2e`; the Playwright suite uses port 4399, never the dev server's 4321. When writing React, follow `.claude/skills/react-best-practices` (re-render, bundle and rendering rules).

## Design work

Start UI changes from `DESIGN.md`. The painted bough is a corner accent: four corners only, each arm fading out before the middle of its edge — do not rebuild it as a continuous border, tiled vine, or per-frame ornament. Re-run the impeccable check on changed UI before calling it done.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

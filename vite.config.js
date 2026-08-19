import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// When building for GitHub Pages (export.ps1 sets GH_PAGES=1), emit absolute
// URLs under the repository base path so the site works at
// https://<user>.github.io/GIF-Animator/. Normal `npm run build` / `npm run dev`
// stay at the root path.
const ghPagesBase = process.env.GH_PAGES === '1' ? '/GIF-Animator' : '';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Static site (SPA fallback) so `npm run build` produces a deployable
			// build; the app itself is fully client-side.
			adapter: adapter({ fallback: 'index.html' }),

			// Base path for GitHub Pages (set by export.ps1); empty for local dev.
			paths: {
				base: ghPagesBase
			}
		})
	]
});

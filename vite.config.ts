/// <reference types="node" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

const base = process.env.VITE_BASE_PATH ?? '';

export default defineConfig({
	plugins: [sveltekit(), wasm(), topLevelAwait()],
	define: {
		'import.meta.env.BASE_URL': JSON.stringify(base || '/')
	},
	resolve: {
		conditions: ['browser', 'import', 'module', 'default']
	},
	build: {
		target: 'es2021',
		chunkSizeWarningLimit: 3000
	},
	optimizeDeps: {
		exclude: ['purplesky-wasm'],
		include: ['jose', '@atproto/oauth-client-browser']
	}
});

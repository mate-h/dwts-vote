import { fileURLToPath } from 'node:url';
import nodeAdapter from '@sveltejs/adapter-node';
import cloudflareAdapter from '@sveltejs/adapter-cloudflare';

// ADAPTER=cloudflare builds the online version (rooms, Durable Objects); the default is the LAN party server.
const cloudflare = process.env.ADAPTER === 'cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// The node build has no Cloudflare runtime: give `cloudflare:workers` an empty env (= LAN party mode).
	resolve: cloudflare ? {} : { alias: { 'cloudflare:workers': fileURLToPath(new URL('./src/lib/server/stubs/cloudflare-workers.js', import.meta.url)) } },
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: cloudflare ? cloudflareAdapter() : nodeAdapter()
		})
	]
});

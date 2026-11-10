// Cloudflare Worker entry: the SvelteKit app, plus WebSocket upgrades for live room updates, which go
// straight to the room's Durable Object (SvelteKit can't return a 101 response).
// scripts/cf-postbuild.mjs moves the adapter's worker to _sveltekit.js and points _worker.js (wrangler's main) here.
import app from '../.svelte-kit/cloudflare/_sveltekit.js';
export { RoomDO } from './room-do.js';

const LIVE = /^\/api\/r\/([A-HJKMNP-Z2-9]{6})\/live$/;

export default {
	async fetch(request, env, ctx) {
		const m = LIVE.exec(new URL(request.url).pathname);
		if (m) {
			if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
			return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
		}
		return app.fetch(request, env, ctx);
	}
};

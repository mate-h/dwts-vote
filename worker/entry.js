// Cloudflare Worker entry: the SvelteKit app, plus WebSocket upgrades for live room updates, which go
// straight to the room's Durable Object (SvelteKit can't return a 101 response).
// scripts/cf-postbuild.mjs moves the adapter's worker to _sveltekit.js and points _worker.js (wrangler's main) here.
import app from '../.svelte-kit/cloudflare/_sveltekit.js';
export { RoomDO } from './room-do.js';

const LIVE = /^\/api\/r\/([A-HJKMNP-Z2-9]{6})\/live$/;

// The workers.dev address forwards to the custom domain (path and query kept; 308 keeps POST bodies).
const CANONICAL_HOST = 'dwts.mateh.dev';
const OLD_HOSTS = new Set(['dwts-vote.mateh.workers.dev']);

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (OLD_HOSTS.has(url.hostname)) {
			url.protocol = 'https:';
			url.hostname = CANONICAL_HOST;
			return Response.redirect(url.toString(), 308);
		}
		const m = LIVE.exec(url.pathname);
		if (m) {
			if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
			return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
		}
		return app.fetch(request, env, ctx);
	}
};

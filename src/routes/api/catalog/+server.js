import { catalog } from '#lib/server/episodes.js';

// Public and identical for every room: lets browsers and Cloudflare's edge cache it.
export function GET() {
	return new Response(JSON.stringify({ seasons: catalog() }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' } });
}

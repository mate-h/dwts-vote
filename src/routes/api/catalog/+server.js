import { catalog, nextShow } from '#lib/server/episodes.js';

// Public and identical for every room. `next` is the upcoming live show (for the countdown).
export function GET() {
	return new Response(JSON.stringify({ next: nextShow(), seasons: catalog() }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' } });
}

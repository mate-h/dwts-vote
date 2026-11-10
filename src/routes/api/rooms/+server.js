import { json, error } from '@sveltejs/kit';
import { createRoom, isCloud } from '#lib/server/backend.js';

// Create a room. The caller becomes its host: keep hostToken (it is only returned once).
export async function POST() {
	if (!isCloud()) error(404, 'Rooms are only available in the Cloudflare deployment');
	return json(await createRoom(), { headers: { 'cache-control': 'no-store' } });
}

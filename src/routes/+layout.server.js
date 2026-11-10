import { redirect } from '@sveltejs/kit';
import { isCloud } from '#lib/server/backend.js';

// `cloud` is true on the Cloudflare deployment (rooms), false in LAN party mode.
export function load({ url }) {
	const cloud = isCloud();
	if (cloud && (url.pathname === '/results' || url.pathname === '/host')) redirect(307, '/');
	return { cloud };
}

import { json, error } from '@sveltejs/kit';
import { setEpisode, tally } from '#lib/server/store.js';
export async function POST({ request }) {
	const { episode } = await request.json();
	if (!setEpisode(episode)) error(400, 'bad episode');
	return json(tally());
}

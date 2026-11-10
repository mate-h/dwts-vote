import { json, error } from '@sveltejs/kit';
import { tally, cast, mine, touch } from '#lib/server/store.js';
export function GET({ url }) {
	if (url.searchParams.get("seen") === "1") touch(url.searchParams.get("device") ?? "");
	return json({ ...tally(url.searchParams.get('device') ?? ''), mine: mine(url.searchParams.get('device') ?? '') }, { headers: { 'cache-control': 'no-store' } });
}
export async function POST({ request }) {
	const { device, coupleId, score, name } = await request.json();
	if (typeof device !== 'string' || device.length < 8 || !cast(device, coupleId, score, name)) error(400, 'bad vote');
	touch(device);
	return json({ ...tally(device), mine: mine(device) });
}

import { json, error } from '@sveltejs/kit';
import { unvote, tally, mine } from '#lib/server/store.js';
export async function POST({request}) {
 const {device,coupleId} = await request.json();
 if (typeof device !== 'string' || device.length < 8 || typeof coupleId !== 'string') error(400,'Invalid ballot');
 if (!unvote(device,coupleId)) error(409,'Only your latest vote can be undone');
 return json({...tally(device),mine:mine(device)});
}

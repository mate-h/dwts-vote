import { json, error } from '@sveltejs/kit';
import { rename, tally, mine } from '#lib/server/store.js';
export async function POST({request}) {
 const {device, name} = await request.json();
 if (typeof device !== 'string' || device.length < 8 || typeof name !== 'string') error(400, 'Invalid name');
 const cleaned = rename(device, name);
 return json({...tally(device), mine:mine(device), name:cleaned});
}

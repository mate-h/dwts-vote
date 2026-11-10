import { json } from '@sveltejs/kit';
import { tally, reset } from '#lib/server/store.js';
export function POST() { reset(); return json(tally()); }

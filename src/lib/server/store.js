// LAN party mode: a single room for everyone on the network, persisted to data/votes.json.
// Anyone on the LAN counts as host (the /host page is unlisted, not protected).
import fs from 'node:fs';
import path from 'node:path';
import { Room, handle } from './room.js';
import { getEpisode } from './episodes.js';
import { fetchLive, LIVE_INTERVAL_MS } from './live.js';

const FILE = path.resolve(process.env.VOTES_FILE ?? 'data/votes.json');
const DEFAULT_EPISODE = 's34e02';

let saved = null;
try { saved = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const room = new Room(saved, DEFAULT_EPISODE);

function save() {
	fs.mkdirSync(path.dirname(FILE), { recursive: true });
	fs.writeFileSync(FILE + '.tmp', JSON.stringify(room.toJSON()));
	fs.renameSync(FILE + '.tmp', FILE);
}

// Judges' scores for an airing episode: checked at most once a minute, and only while phones are polling.
let checking = false;
function maybeCheckLive() {
	const key = room.episode;
	if (checking || !room.needsLive()) return;
	if (Date.now() - (room.live[key]?.checked ?? 0) < LIVE_INTERVAL_MS) return;
	checking = true;
	const prev = room.live[key];
	fetchLive(getEpisode(key), prev)
		.then((next) => { room.setLive(key, next); save(); })
		.catch((e) => { console.warn('live check failed:', e?.message ?? e); room.setLive(key, { ...prev, checked: Date.now() }); })
		.finally(() => { checking = false; });
}

export function run(action, method, input) {
	if (action === 'votes' && method === 'GET') maybeCheckLive();
	const result = handle(room, action, method, input, { isHost: true });
	if (result.changed) save();
	return result;
}

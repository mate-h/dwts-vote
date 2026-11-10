// LAN party mode: a single room for everyone on the network, persisted to data/votes.json.
// Anyone on the LAN counts as host (the /host page is unlisted, not protected).
import fs from 'node:fs';
import path from 'node:path';
import { Room, handle } from './room.js';

const FILE = path.resolve(process.env.VOTES_FILE ?? 'data/votes.json');
const DEFAULT_EPISODE = 2;

let saved = null;
try { saved = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const room = new Room(saved, DEFAULT_EPISODE);

function save() {
	fs.mkdirSync(path.dirname(FILE), { recursive: true });
	fs.writeFileSync(FILE + '.tmp', JSON.stringify(room.toJSON()));
	fs.renameSync(FILE + '.tmp', FILE);
}

export function run(action, method, input) {
	const result = handle(room, action, method, input, { isHost: true });
	if (result.changed) save();
	return result;
}

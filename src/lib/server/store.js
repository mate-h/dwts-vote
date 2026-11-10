import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getEpisode, episodeList } from '#lib/couples.js';
const FILE = path.resolve(process.env.VOTES_FILE ?? 'data/votes.json');
let episode = 2;
let rounds = {};
let votesByEpisode = {};

function activeCouples() {
	return getEpisode(episode)?.couples ?? [];
}

function ballots() {
	votesByEpisode[episode] ??= {};
	return votesByEpisode[episode];
}

function normalizeVotes(rawVotes, couples) {
	const out = {};
	for (const [device, value] of Object.entries(rawVotes ?? {})) {
		const records = typeof value === 'string' ? [{coupleId: value, score: null}] : value.coupleId ? [value] : Object.values(value);
		out[device] = {};
		for (const v of records) if (couples.some(c => c.id === v.coupleId)) out[device][v.coupleId] = {...v, name: cleanName(v.name)};
	}
	return out;
}

try {
	const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
	if (saved.store) {
		const loaded = Number(saved.episode);
		episode = getEpisode(loaded) ? loaded : 2;
		for (const [ep, data] of Object.entries(saved.store)) {
			const id = Number(ep);
			const meta = getEpisode(id);
			if (!meta) continue;
			rounds[id] = data.round ?? 'initial';
			votesByEpisode[id] = normalizeVotes(data.votes, meta.couples);
		}
	} else {
		episode = 2;
		rounds[2] = saved.round ?? 'initial';
		votesByEpisode[2] = normalizeVotes(saved.votes, getEpisode(2).couples);
	}
} catch (e) { if (e.code !== 'ENOENT') throw e; }

function save() {
	const store = {};
	const ids = new Set([...Object.keys(votesByEpisode), ...Object.keys(rounds)].map(Number));
	for (const id of ids) {
		store[id] = { round: rounds[id] ?? 'initial', votes: votesByEpisode[id] ?? {} };
	}
	fs.mkdirSync(path.dirname(FILE), { recursive: true });
	fs.writeFileSync(FILE + '.tmp', JSON.stringify({episode, store}));
	fs.renameSync(FILE + '.tmp', FILE);
}

// Simultaneous reveal: a couple's scores stay hidden until every expected player has locked it in.
// Expected players = devices with the voter page open now (heartbeat within PRESENCE_MS) PLUS devices with any vote this episode.
// For couple C a device is not waited on if all its votes this episode are on couples later than C (skipped past).
const PRESENCE_MS = 35000;
const lastSeen = new Map();
export function touch(device) { if (typeof device === "string" && device.length >= 8) lastSeen.set(device, Date.now()); }
function presentDevices() { const now = Date.now(), out = []; for (const [d, t] of lastSeen) { if (now - t <= PRESENCE_MS) out.push(d); else lastSeen.delete(d); } return out; }
function revealState() {
	const couples = activeCouples();
	const order = Object.fromEntries(couples.map(c => [c.id, c.order]));
	const cur = ballots();
	const players = new Set(Object.entries(cur).filter(([, v]) => Object.keys(v).length).map(([d]) => d));
	for (const d of presentDevices()) players.add(d);
	const state = {};
	for (const c of couples) {
		let expected = 0, locked = 0;
		for (const d of players) {
			const v = cur[d] ?? {};
			const has = !!v[c.id];
			const minOrder = Math.min(...Object.keys(v).map(id => order[id] ?? Infinity));
			if (has || minOrder <= c.order || !Object.keys(v).length) { expected++; if (has) locked++; }
		}
		state[c.id] = { locked, expected, revealed: locked > 0 && locked >= expected };
	}
	return state;
}

export function tally(device = '') {
	const couples = activeCouples();
	const state = revealState();
	const mineNow = ballots()[device] ?? {};
	const counts = {}, avg = {}, tens = {}, sums = {}, scored = {}, revealed = {}, expected = {};
	for (const c of couples) { counts[c.id] = 0; tens[c.id] = 0; sums[c.id] = 0; scored[c.id] = 0; revealed[c.id] = state[c.id].revealed && !!mineNow[c.id]; expected[c.id] = state[c.id].expected; }
	const own = ballots()[device] ?? {};
	const all = Object.values(ballots()).flatMap(v => Object.values(v));
	for (const {coupleId, score} of all) {
		if (!(coupleId in counts)) continue;
		counts[coupleId]++;
		if (score) { sums[coupleId] += score; scored[coupleId]++; if (score === 10) tens[coupleId]++; }
	}
	for (const id in counts) {
		avg[id] = scored[id] ? Math.round(sums[id] / scored[id] * 10) / 10 : null;
		if (!revealed[id]) { sums[id] = null; avg[id] = null; tens[id] = null; }
	}
	const visible = all.filter(b => revealed[b.coupleId] || own[b.coupleId] === b);
	return {
		round: rounds[episode] ?? 'initial',
		episode,
		season: getEpisode(episode)?.label ?? '',
		episodes: episodeList(),
		couples,
		counts,
		avg,
		tens,
		sums,
		revealed,
		expected,
		ballots: visible.map(({name,coupleId,score}) => ({name,coupleId,score})),
		total: all.length
	};
}

export function cleanName(n) {
	return String(n ?? '').replace(/<[^>]*>/g, '').replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0,64) || 'Guest phone';
}

export function setEpisode(id) {
	const meta = getEpisode(id);
	if (!meta) return false;
	episode = meta.id;
	votesByEpisode[episode] ??= {};
	rounds[episode] ??= 'initial';
	save();
	return true;
}

export function cast(device, coupleId, score, name) {
	const couples = activeCouples();
	if (!couples.some(c => c.id === coupleId) || !Number.isInteger(score) || score < 1 || score > 10) return false;
	const current = ballots();
	current[device] ??= {};
	for (const ballot of Object.values(current[device])) ballot.name = cleanName(name);
	current[device][coupleId] = {coupleId,score,name:cleanName(name)};
	save(); return true;
}

export function mine(device) { return Object.fromEntries(Object.values(ballots()[device] ?? {}).map(({coupleId,score}) => [coupleId,score])); }

export function reset() {
	votesByEpisode[episode] = {};
	rounds[episode] = randomUUID();
	save();
}

export function rename(device, name) {
	const cleaned = cleanName(name);
	for (const ballot of Object.values(ballots()[device] ?? {})) ballot.name = cleaned;
	save();
	return cleaned;
}

export function unvote(device, coupleId) {
	const current = ballots();
	const latest = [...activeCouples()].sort((a,b) => b.order-a.order).find(c => current[device]?.[c.id]);
	if (!latest || latest.id !== coupleId) return false;
	delete current[device][coupleId];
	if (!Object.keys(current[device]).length) delete current[device];
	save(); return true;
}

// One voting room: per-episode ballots, rounds and the live "simultaneous reveal" state.
// Pure logic with no I/O and no Node/Vite-only APIs. The LAN server (store.js) and the Cloudflare
// Durable Object (worker/room-do.js) both wrap it and persist room.toJSON() after every change.
import { getEpisode, migrateKey, infoOf } from './episodes.js';
import { wantsLive } from './live.js';

// Simultaneous reveal: a couple's scores stay hidden until every expected player has locked it in.
// Expected players = devices with the voter page open now (heartbeat within PRESENCE_MS) PLUS devices with any vote this episode.
// For couple C a device is not waited on if all its votes this episode are on couples later than C (skipped past).
const PRESENCE_MS = 35000;

export function cleanName(n) {
	return String(n ?? '').replace(/<[^>]*>/g, '').replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 64) || 'Guest phone';
}

function normalizeVotes(rawVotes, couples) {
	const out = {};
	for (const [device, value] of Object.entries(rawVotes ?? {})) {
		const records = typeof value === 'string' ? [{ coupleId: value, score: null }] : value.coupleId ? [value] : Object.values(value);
		out[device] = {};
		// Unknown episode (no longer bundled): keep its votes as they are rather than dropping them.
		for (const v of records) if (!couples || couples.some((c) => c.id === v.coupleId)) out[device][v.coupleId] = { ...v, name: cleanName(v.name) };
	}
	return out;
}

export class Room {
	episode; // key, e.g. "s34e06"
	rounds = {};
	votesByEpisode = {};
	live = {}; // episode key -> latest judges' scores/results fetched during the broadcast (live.js)
	lastSeen = new Map(); // device -> ms; in memory only

	/** @param {any} saved  a previous toJSON() (or the pre-episodes LAN format), or null */
	constructor(saved, defaultEpisode) {
		this.episode = defaultEpisode;
		if (!saved) return;
		this.live = saved.live ?? {};
		if (saved.store) {
			const loaded = migrateKey(saved.episode);
			this.episode = getEpisode(loaded) ? loaded : defaultEpisode;
			for (const [ep, data] of Object.entries(saved.store)) {
				const key = migrateKey(ep);
				this.rounds[key] = data.round ?? 'initial';
				this.votesByEpisode[key] = normalizeVotes(data.votes, getEpisode(key)?.couples ?? null);
			}
		} else {
			this.rounds[defaultEpisode] = saved.round ?? 'initial';
			this.votesByEpisode[defaultEpisode] = normalizeVotes(saved.votes, getEpisode(defaultEpisode)?.couples ?? []);
		}
	}

	toJSON() {
		const store = {};
		const ids = new Set([...Object.keys(this.votesByEpisode), ...Object.keys(this.rounds)]);
		for (const id of ids) store[id] = { round: this.rounds[id] ?? 'initial', votes: this.votesByEpisode[id] ?? {} };
		return { episode: this.episode, store, live: this.live };
	}

	activeCouples() {
		return getEpisode(this.episode)?.couples ?? [];
	}

	ballots() {
		return (this.votesByEpisode[this.episode] ??= {});
	}

	/** Should the current episode's judges' scores be polled from Wikipedia? */
	needsLive() {
		return wantsLive(getEpisode(this.episode), this.live[this.episode]);
	}

	setLive(key, data) {
		this.live[key] = data;
	}

	leave(device) {
		this.lastSeen.delete(device);
	}

	touch(device) {
		if (typeof device === 'string' && device.length >= 8) this.lastSeen.set(device, Date.now());
	}

	presentDevices() {
		const now = Date.now(), out = [];
		for (const [d, t] of this.lastSeen) {
			if (now - t <= PRESENCE_MS) out.push(d);
			else this.lastSeen.delete(d);
		}
		return out;
	}

	revealState() {
		const couples = this.activeCouples();
		const order = Object.fromEntries(couples.map((c) => [c.id, c.order]));
		const cur = this.ballots();
		const players = new Set(Object.entries(cur).filter(([, v]) => Object.keys(v).length).map(([d]) => d));
		for (const d of this.presentDevices()) players.add(d);
		const state = {};
		for (const c of couples) {
			let expected = 0, locked = 0;
			for (const d of players) {
				const v = cur[d] ?? {};
				const has = !!v[c.id];
				const minOrder = Math.min(...Object.keys(v).map((id) => order[id] ?? Infinity));
				if (has || minOrder <= c.order || !Object.keys(v).length) { expected++; if (has) locked++; }
			}
			state[c.id] = { locked, expected, revealed: locked > 0 && locked >= expected };
		}
		return state;
	}

	tally(device = '') {
		const couples = this.activeCouples();
		const state = this.revealState();
		const own = this.ballots()[device] ?? {};
		const counts = {}, avg = {}, tens = {}, sums = {}, scored = {}, revealed = {}, expected = {};
		for (const c of couples) { counts[c.id] = 0; tens[c.id] = 0; sums[c.id] = 0; scored[c.id] = 0; revealed[c.id] = state[c.id].revealed && !!own[c.id]; expected[c.id] = state[c.id].expected; }
		const all = Object.values(this.ballots()).flatMap((v) => Object.values(v));
		for (const { coupleId, score } of all) {
			if (!(coupleId in counts)) continue;
			counts[coupleId]++;
			if (score) { sums[coupleId] += score; scored[coupleId]++; if (score === 10) tens[coupleId]++; }
		}
		for (const id in counts) {
			avg[id] = scored[id] ? Math.round((sums[id] / scored[id]) * 10) / 10 : null;
			if (!revealed[id]) { sums[id] = null; avg[id] = null; tens[id] = null; }
		}
		const visible = all.filter((b) => revealed[b.coupleId] || own[b.coupleId] === b);
		const ep = getEpisode(this.episode);
		const live = this.live[this.episode];
		// Judges' scores and results are spoilers: only sent for couples this phone has seen revealed.
		const view = couples.map(({ judges, result, ...c }) => {
			const l = live?.couples?.[c.id];
			const j = l?.judges ?? judges;
			const r = l?.result ?? result;
			const show = revealed[c.id];
			return {
				...c,
				wentHome: c.wentHome || !!live?.wentHome?.includes(c.id),
				...(show && j ? { judges: j, judgesTotal: j.reduce((sum, t) => sum + (Number(/\d+/.exec(t)?.[0]) || 0), 0) } : {}),
				...(show && r ? { result: r } : {})
			};
		});
		return {
			round: this.rounds[this.episode] ?? 'initial',
			episode: this.episode,
			info: infoOf(ep),
			season: ep?.label ?? '', // display label (kept for older clients)
			played: this.played(),
			live: live ? { checked: live.checked, final: !!live.final } : null,
			tracking: this.needsLive(),
			couples: view,
			counts,
			avg,
			tens,
			sums,
			revealed,
			expected,
			ballots: visible.map(({ name, coupleId, score }) => ({ name, coupleId, score })),
			total: all.length
		};
	}

	/** Votes cast per episode in this room, for the host's episode picker. */
	played() {
		const out = {};
		for (const [key, ballots] of Object.entries(this.votesByEpisode)) {
			const n = Object.values(ballots).reduce((sum, v) => sum + Object.keys(v).length, 0);
			if (n) out[key] = n;
		}
		return out;
	}

	mine(device) {
		return Object.fromEntries(Object.values(this.ballots()[device] ?? {}).map(({ coupleId, score }) => [coupleId, score]));
	}

	setEpisode(key) {
		const meta = getEpisode(key);
		if (!meta) return false;
		this.episode = meta.key;
		this.votesByEpisode[this.episode] ??= {};
		this.rounds[this.episode] ??= 'initial';
		return true;
	}

	cast(device, coupleId, score, name) {
		if (!this.activeCouples().some((c) => c.id === coupleId) || !Number.isInteger(score) || score < 1 || score > 10) return false;
		const current = this.ballots();
		current[device] ??= {};
		for (const ballot of Object.values(current[device])) ballot.name = cleanName(name);
		current[device][coupleId] = { coupleId, score, name: cleanName(name) };
		return true;
	}

	reset() {
		this.votesByEpisode[this.episode] = {};
		this.rounds[this.episode] = crypto.randomUUID();
	}

	rename(device, name) {
		const cleaned = cleanName(name);
		for (const ballot of Object.values(this.ballots()[device] ?? {})) ballot.name = cleaned;
		return cleaned;
	}

	unvote(device, coupleId) {
		const current = this.ballots();
		const latest = [...this.activeCouples()].sort((a, b) => b.order - a.order).find((c) => current[device]?.[c.id]);
		if (!latest || latest.id !== coupleId) return false;
		delete current[device][coupleId];
		if (!Object.keys(current[device]).length) delete current[device];
		return true;
	}
}

const validDevice = (d) => typeof d === 'string' && d.length >= 8;

/**
 * The room API, shared by LAN routes and the Durable Object.
 * @returns {{ status: number, body: any, changed?: boolean }}
 */
export function handle(room, action, method, input, { isHost }) {
	const err = (status, message) => ({ status, body: { message } });
	const withMine = (device) => ({ ...room.tally(device), mine: room.mine(device) });
	const { device } = input ?? {};
	switch (`${method} ${action}`) {
		case 'GET votes': {
			if (input.seen === '1' || input.seen === true) room.touch(device ?? '');
			return { status: 200, body: withMine(device ?? '') };
		}
		case 'POST votes': {
			const { coupleId, score, name } = input;
			if (!validDevice(device) || !room.cast(device, coupleId, score, name)) return err(400, 'bad vote');
			room.touch(device);
			return { status: 200, body: withMine(device), changed: true };
		}
		case 'POST name': {
			if (!validDevice(device) || typeof input.name !== 'string') return err(400, 'Invalid name');
			const name = room.rename(device, input.name);
			return { status: 200, body: { ...withMine(device), name }, changed: true };
		}
		case 'POST unvote': {
			if (!validDevice(device) || typeof input.coupleId !== 'string') return err(400, 'Invalid ballot');
			if (!room.unvote(device, input.coupleId)) return err(409, 'Only your latest vote can be undone');
			return { status: 200, body: withMine(device), changed: true };
		}
		case 'POST episode': {
			if (!isHost) return err(403, 'Only the host can change the episode');
			if (!room.setEpisode(input.episode)) return err(400, 'bad episode');
			return { status: 200, body: room.tally(), changed: true };
		}
		case 'POST reset': {
			if (!isHost) return err(403, 'Only the host can start the next round');
			room.reset();
			return { status: 200, body: room.tally(), changed: true };
		}
		default:
			return err(404, 'Not found');
	}
}

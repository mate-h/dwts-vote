// Cloudflare mode: one Durable Object per room (named by its room code).
// Requests for a room are serialized through its object, so votes never race.
//
// Live updates: each phone holds one WebSocket to its room (GET /api/r/CODE/live, routed here by
// worker/entry.js). The room pushes fresh state to every phone after each change, so phones don't poll.
// Sockets use the hibernation API: the object sleeps between messages and idle connections cost nothing.
//
// One alarm does two jobs: polling Wikipedia for judges' scores once a minute while phones are connected
// to an episode that's airing (live.js), and deleting the room after 30 days without a change.
import { DurableObject } from 'cloudflare:workers';
import { Room, handle } from '../src/lib/server/room.js';
import { LATEST, getEpisode, infoOf } from '../src/lib/server/episodes.js';
import { fetchLive, liveChanged, LIVE_INTERVAL_MS } from '../src/lib/server/live.js';

const IDLE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function sha256(text) {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const validDevice = (d) => typeof d === 'string' && d.length >= 8 && d.length <= 100;

export class RoomDO extends DurableObject {
	constructor(ctx, env) {
		super(ctx, env);
		// Answered by the runtime without waking the object (keeps connections alive through proxies).
		ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
		ctx.blockConcurrencyWhile(async () => {
			this.meta = (await ctx.storage.get('meta')) ?? null; // { code, hostHash, created, expiresAt }
			if (this.meta && !this.meta.expiresAt) this.meta.expiresAt = Date.now() + IDLE_TTL_MS; // rooms from before expiresAt existed
			this.room = new Room((await ctx.storage.get('state')) ?? null, LATEST);
		});
	}

	sockets() {
		return this.ctx.getWebSockets();
	}

	/** Phones with an open connection count as present (waited on for the simultaneous reveal). */
	syncPresence() {
		for (const ws of this.sockets()) this.room.touch(ws.deserializeAttachment()?.device);
	}

	async save({ bumpExpiry = true } = {}) {
		if (bumpExpiry) this.meta.expiresAt = Date.now() + IDLE_TTL_MS;
		await this.ctx.storage.put({ state: this.room.toJSON(), meta: this.meta });
		await this.schedule();
	}

	/** Next alarm: a live check soon if phones are watching an airing episode, else the expiry. */
	async schedule() {
		const expiresAt = this.meta?.expiresAt ?? Date.now() + IDLE_TTL_MS;
		let at = expiresAt;
		if (this.sockets().length && this.room.needsLive()) {
			// A minute after the last check (right away if this episode hasn't been checked yet).
			const last = this.room.live[this.room.episode]?.checked ?? 0;
			at = Math.min(at, Math.max(Date.now() + 1000, last + LIVE_INTERVAL_MS));
		}
		const current = await this.ctx.storage.getAlarm();
		if (current == null || Math.abs(current - at) > 500) await this.ctx.storage.setAlarm(at);
	}

	broadcast() {
		const sockets = this.sockets();
		if (!sockets.length) return;
		this.syncPresence();
		for (const ws of sockets) {
			const device = ws.deserializeAttachment()?.device ?? '';
			try {
				ws.send(JSON.stringify({ ...this.room.tally(device), mine: this.room.mine(device) }));
			} catch {}
		}
	}

	/** Claim this room for a new host. Returns false if the code is already taken. */
	async init(code, hostToken) {
		if (this.meta) return false;
		this.meta = { code, hostHash: await sha256(hostToken), created: Date.now() };
		this.room = new Room(null, LATEST);
		await this.save();
		return true;
	}

	exists() {
		return !!this.meta;
	}

	/** What the room is scoring, for its link preview. Null if the room doesn't exist. */
	preview() {
		return this.meta ? { info: infoOf(getEpisode(this.room.episode)), title: this.room.title } : null;
	}

	async isHost(hostToken) {
		return !!this.meta && typeof hostToken === 'string' && hostToken.length > 0 && (await sha256(hostToken)) === this.meta.hostHash;
	}

	async act(action, method, input, hostToken) {
		if (!this.meta) return { status: 404, body: { message: 'Room not found' } };
		const isHost = await this.isHost(hostToken);
		this.syncPresence();
		const result = handle(this.room, action, method, input ?? {}, { isHost });
		if (result.changed) {
			await this.save();
			this.broadcast();
		}
		return { status: result.status, body: result.status === 200 ? { ...result.body, isHost } : result.body };
	}

	/** WebSocket upgrade for GET /api/r/CODE/live?device=… */
	async fetch(request) {
		if (!this.meta) return new Response('Room not found', { status: 404 });
		if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
		const device = new URL(request.url).searchParams.get('device');
		if (!validDevice(device)) return new Response('Bad device', { status: 400 });
		const { 0: client, 1: server } = new WebSocketPair();
		this.ctx.acceptWebSocket(server);
		server.serializeAttachment({ device });
		this.broadcast(); // the newcomer gets the current state; everyone else sees them as present
		await this.schedule();
		return new Response(null, { status: 101, webSocket: client });
	}

	webSocketMessage() {
		// Phones only send "ping" (auto-answered). Votes and host actions go through the HTTP API.
	}

	async webSocketClose(ws) {
		const device = ws.deserializeAttachment()?.device;
		// Another tab of the same phone may still be connected.
		if (device && !this.sockets().some((s) => s !== ws && s.deserializeAttachment()?.device === device)) this.room.leave(device);
		this.broadcast();
	}

	async webSocketError(ws) {
		await this.webSocketClose(ws);
	}

	async alarm() {
		if (!this.meta) return;
		if (Date.now() >= this.meta.expiresAt) {
			for (const ws of this.sockets()) ws.close(1000, 'Room expired');
			await this.ctx.storage.deleteAll();
			this.meta = null;
			this.room = new Room(null, LATEST);
			return;
		}
		if (this.sockets().length && this.room.needsLive()) {
			const key = this.room.episode;
			const prev = this.room.live[key];
			try {
				const next = await fetchLive(getEpisode(key), prev);
				this.room.setLive(key, next);
				await this.ctx.storage.put('state', this.room.toJSON());
				if (liveChanged(prev, next)) this.broadcast();
			} catch (e) {
				console.warn('live check failed', key, e?.message ?? e);
				this.room.setLive(key, { ...prev, checked: Date.now() });
			}
		}
		await this.schedule();
	}
}

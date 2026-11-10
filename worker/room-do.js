// Cloudflare mode: one Durable Object per room (named by its room code).
// Requests for a room are serialized through its object, so votes never race.
// Appended to the SvelteKit worker by scripts/cf-postbuild.mjs; bound as env.ROOMS in wrangler.jsonc.
import { DurableObject } from 'cloudflare:workers';
import { Room, handle } from '../src/lib/server/room.js';
import { LATEST } from '../src/lib/server/episodes.js';

const IDLE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // rooms are deleted after 30 days without a change

export async function sha256(text) {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class RoomDO extends DurableObject {
	constructor(ctx, env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			this.meta = (await ctx.storage.get('meta')) ?? null; // { code, hostHash, created }
			this.room = new Room((await ctx.storage.get('state')) ?? null, LATEST);
		});
	}

	async persist() {
		await this.ctx.storage.put({ state: this.room.toJSON(), meta: this.meta });
		await this.ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS);
	}

	/** Claim this room for a new host. Returns false if the code is already taken. */
	async init(code, hostToken) {
		if (this.meta) return false;
		this.meta = { code, hostHash: await sha256(hostToken), created: Date.now() };
		this.room = new Room(null, LATEST);
		await this.persist();
		return true;
	}

	exists() {
		return !!this.meta;
	}

	async isHost(hostToken) {
		return !!this.meta && typeof hostToken === 'string' && hostToken.length > 0 && (await sha256(hostToken)) === this.meta.hostHash;
	}

	async act(action, method, input, hostToken) {
		if (!this.meta) return { status: 404, body: { message: 'Room not found' } };
		const isHost = await this.isHost(hostToken);
		const result = handle(this.room, action, method, input ?? {}, { isHost });
		if (result.changed) await this.persist();
		return { status: result.status, body: result.status === 200 ? { ...result.body, isHost } : result.body };
	}

	async alarm() {
		await this.ctx.storage.deleteAll();
		this.meta = null;
		this.room = new Room(null, LATEST);
	}
}

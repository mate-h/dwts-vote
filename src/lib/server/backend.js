// Routes the room API to the right backend:
//  - Cloudflare (env.ROOMS bound): rooms, each a Durable Object addressed by its code.
//  - LAN party (node adapter): the single room in store.js.
import { error } from '@sveltejs/kit';
// Real bindings on Cloudflare; an empty stub in the node build (aliased in vite.config.js).
import { env } from 'cloudflare:workers';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
export const CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;

export const isCloud = () => !!env?.ROOMS;

export function normalizeCode(code) {
	const c = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
	return CODE_RE.test(c) ? c : null;
}

function newCode() {
	const bytes = crypto.getRandomValues(new Uint8Array(6));
	return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function roomStub(code) {
	const ns = env.ROOMS;
	return ns.get(ns.idFromName(code));
}

export async function createRoom() {
	const hostToken = crypto.randomUUID() + crypto.randomUUID();
	for (let attempt = 0; attempt < 5; attempt++) {
		const code = newCode();
		if (await roomStub(code).init(code, hostToken)) return { code, hostToken };
	}
	error(503, 'Could not allocate a room code, please try again');
}

export async function roomExists(code) {
	return await roomStub(code).exists();
}

/** Run one room API action. `room` is null in LAN mode. */
export async function callRoom({ room, action, method, input, hostToken }) {
	if (isCloud()) {
		if (!room) error(404, 'Open a room first');
		return await roomStub(room).act(action, method, input, hostToken ?? '');
	}
	if (room) error(404, 'Rooms are only available in the Cloudflare deployment');
	const { run } = await import('./store.js');
	const r = run(action, method, input);
	return { status: r.status, body: r.status === 200 ? { ...r.body, isHost: true } : r.body };
}

/** GET/POST handlers for /api/[action] (LAN) and /api/r/[room]/[action] (Cloudflare). */
export async function respond({ request, url, params }) {
	let room = null;
	if (params.room != null) {
		room = normalizeCode(params.room);
		if (!room) error(404, 'Room not found');
	}
	const method = request.method;
	let input;
	if (method === 'GET') input = Object.fromEntries(url.searchParams);
	else {
		try { input = await request.json(); } catch { input = {}; }
	}
	const { status, body } = await callRoom({ room, action: params.action, method, input, hostToken: request.headers.get('x-host-token') });
	return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

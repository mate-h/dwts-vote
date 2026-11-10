#!/usr/bin/env node
// Smoke test for the Cloudflare rooms API. Run against `npm run cf:dev` (default) or a deployed URL:
//   node scripts/smoke-rooms.mjs [http://127.0.0.1:8787]
const B = process.argv[2] ?? 'http://127.0.0.1:8787';
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); if (!ok) failed++; };
const post = (path, body, token) => fetch(B + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { 'x-host-token': token } : {}) }, body: JSON.stringify(body ?? {}) });
const get = (path, token) => fetch(B + path, { headers: token ? { 'x-host-token': token } : {} });

const landing = await get('/');
check('landing page', landing.ok && (await landing.text()).includes('Create a room'));
check('LAN pages redirect home', (await fetch(B + '/results', { redirect: 'manual' })).status === 307);
check('unknown room 404', (await get('/r/ZZZZZZ')).status === 404);

const created = await post('/api/rooms');
const { code, hostToken } = await created.json();
check('create room', created.ok && /^[A-Z2-9]{6}$/.test(code), code);

for (const p of ['', '/results', '/host']) check(`room page ${p || '/'}`, (await get(`/r/${code}${p}`)).ok);
const lower = await fetch(`${B}/r/${code.toLowerCase()}/results`, { redirect: 'manual' });
check('lowercase code redirects', lower.status === 308 && lower.headers.get('location')?.includes(`/r/${code}/results`));

const guest = await (await get(`/api/r/${code}/votes?device=guestdevice1&seen=1`)).json();
check('guest sees ballot', guest.couples?.length > 0 && guest.isHost === false, guest.season);
const host = await (await get(`/api/r/${code}/votes?device=hostdevice1&seen=1`, hostToken)).json();
check('host token recognised', host.isHost === true);

check('guest cannot switch episode', (await post(`/api/r/${code}/episode`, { episode: 's34e03' })).status === 403);
check('wrong token cannot reset', (await post(`/api/r/${code}/reset`, {}, 'nope')).status === 403);
const switched = await post(`/api/r/${code}/episode`, { episode: 's34e03' }, hostToken);
check('host switches episode', switched.ok && (await switched.json()).episode === 's34e03');

const v1 = await (await post(`/api/r/${code}/votes`, { device: 'guestdevice1', coupleId: 'affleck', score: 8, name: 'Guest' })).json();
check('guest vote hidden until host votes', v1.mine?.affleck === 8 && v1.revealed?.affleck === false);
const v2 = await (await post(`/api/r/${code}/votes`, { device: 'hostdevice1', coupleId: 'affleck', score: 10, name: 'Host' })).json();
check('revealed once both voted', v2.revealed?.affleck === true && v2.sums?.affleck === 18, `sum ${v2.sums?.affleck}`);

const other = await (await post('/api/rooms')).json();
const o = await (await get(`/api/r/${other.code}/votes?device=x12345678`)).json();
check('rooms are isolated', o.total === 0 && other.code !== code);

const reset = await post(`/api/r/${code}/reset`, {}, hostToken);
check('host resets round', reset.ok && (await reset.json()).total === 0);
check('LAN API disabled on Cloudflare', (await get('/api/votes?device=abcdefgh')).status === 404);

// ---- live updates over WebSocket ----
const wsBase = B.replace(/^http/, 'ws');
function openSocket(room, device) {
	const ws = new WebSocket(`${wsBase}/api/r/${room}/live?device=${device}`);
	const inbox = [];
	const waiters = [];
	ws.onmessage = (e) => {
		if (e.data === 'pong') return inbox.push('pong');
		const msg = JSON.parse(e.data);
		inbox.push(msg);
		for (const w of [...waiters]) if (w.test(msg)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); }
	};
	const next = (test, ms = 5000) =>
		new Promise((resolve, reject) => {
			const hit = inbox.find((m) => m !== 'pong' && test(m));
			if (hit) return resolve(hit);
			const w = { test, resolve };
			waiters.push(w);
			setTimeout(() => reject(new Error('timed out')), ms);
		});
	const opened = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
	return { ws, inbox, next, opened };
}
const live = await (await post('/api/rooms')).json();
await post(`/api/r/${live.code}/episode`, { episode: 's34e06' }, live.hostToken);
const a = openSocket(live.code, 'wsguest001');
const h = openSocket(live.code, 'wshost0001');
try {
	await Promise.all([a.opened, h.opened]);
	const first = await a.next((m) => m.episode === 's34e06');
	check('socket gets state on connect', first.couples?.length === 10 && !first.couples.some((c) => c.judges || c.result));
	check('plain GET on the live URL refused', (await get(`/api/r/${live.code}/live`)).status === 426);
	await post(`/api/r/${live.code}/votes`, { device: 'wsguest001', coupleId: 'hoying', score: 7, name: 'Guest' });
	const pushed = await h.next((m) => m.counts?.hoying === 1);
	check('vote pushed to the other phone', pushed.revealed?.hoying === false && pushed.mine?.hoying == null);
	await post(`/api/r/${live.code}/votes`, { device: 'wshost0001', coupleId: 'hoying', score: 9, name: 'Host' });
	const shown = await a.next((m) => m.revealed?.hoying === true);
	const hoying = shown.couples.find((c) => c.id === 'hoying');
	const earle = shown.couples.find((c) => c.id === 'earle');
	check('judges shown only after reveal', hoying.judgesTotal > 0 && !!hoying.result && !earle.judges, `hoying ${hoying.judges} ${hoying.result}`);
	a.ws.send('ping');
	await new Promise((r) => setTimeout(r, 500));
	check('ping auto-answered', a.inbox.includes('pong'));
	// A phone that hasn't voted counts as present only while connected.
	const v = openSocket(live.code, 'wsviewer01');
	await v.opened;
	const withViewer = await a.next((m) => m.expected?.earle === 3);
	v.ws.close();
	const without = await a.next((m) => m.expected?.earle === 2).catch(() => null);
	check('presence follows open connections', !!withViewer && !!without, `expected ${withViewer?.expected?.earle} -> ${without?.expected?.earle}`);
	await post(`/api/r/${live.code}/episode`, { episode: 's35e09' }, live.hostToken);
	const airing = await a.next((m) => m.episode === 's35e09');
	check('airing episode is tracked live', airing.tracking === true);
	await new Promise((r) => setTimeout(r, 6000)); // first check runs ~1 s after switching; Wikipedia takes a moment
	const after = await (await get(`/api/r/${live.code}/votes?device=wsguest001`)).json();
	check('room checks Wikipedia while phones watch', !!after.live?.checked, after.live ? `checked ${new Date(after.live.checked).toISOString()}` : 'not checked');
} catch (e) {
	check('websocket flow', false, e.message);
} finally {
	a.ws.close();
	h.ws.close();
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);

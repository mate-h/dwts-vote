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

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);

export function deviceId() {
	let id = localStorage.getItem('ballot-device');
	if (!id) { id = globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2) + Date.now(); localStorage.setItem('ballot-device', id); }
	return id;
}
// Room context. `room` is the room code in the Cloudflare deployment (/r/CODE/...), null in LAN party mode.
// `base` prefixes page links, and API calls go to /api/... (LAN) or /api/r/CODE/... (room).
export function roomOf(page) {
	const room = page.params.room ? String(page.params.room).toUpperCase() : null;
	return { room, base: room ? '/r/' + room : '' };
}
const hostKey = (room) => 'room-host:' + room;
export function hostToken(room) {
	if (!room) return '';
	try { return localStorage.getItem(hostKey(room)) ?? ''; } catch { return ''; }
}
export function saveHostToken(room, token) {
	try { localStorage.setItem(hostKey(room), token); } catch {}
}
export async function callApi(room, action, body) {
	const url = (room ? '/api/r/' + room : '/api') + '/' + action;
	const headers = { 'content-type': 'application/json' };
	const token = hostToken(room);
	if (token) headers['x-host-token'] = token;
	return fetch(url, { method: 'POST', headers, body: JSON.stringify(body ?? {}) });
}
export async function fetchVotes(room = null) {
	const url = (room ? '/api/r/' + room : '/api') + '/votes?device=' + encodeURIComponent(deviceId()) + (document.hidden ? '' : '&seen=1');
	const token = hostToken(room);
	const r = await fetch(url, { cache: 'no-store', headers: token ? { 'x-host-token': token } : {} });
	if (!r.ok) throw Object.assign(new Error('votes ' + r.status), { status: r.status });
	return r.json();
}
function parseUA(ua) {
	if (/iPad/.test(ua)) return 'iPad';
	if (/iPhone/.test(ua)) return 'iPhone';
	const a = ua.match(/Android[^;)]*;\s*(?:[a-z]{2}-[a-z]{2};\s*)?([^;)]+?)(?:\s+Build|\))/i);
	if (a && a[1] && a[1] !== 'K') return a[1].trim();
	if (/Android/.test(ua)) return 'Android phone';
	if (/Macintosh/.test(ua)) return navigator.maxTouchPoints > 1 ? 'iPad' : 'Mac';
	if (/Windows/.test(ua)) return 'Windows PC';
	if (/Linux/.test(ua)) return 'Linux PC';
	return '';
}
export async function deviceName() {
	const saved = localStorage.getItem('ballot-name');
	if (saved) return saved;
	let name = '';
	try {
		const h = await navigator.userAgentData?.getHighEntropyValues(['model', 'platform']);
		name = h?.model || '';
	} catch {}
	if (!name) name = parseUA(navigator.userAgent);
	name = (name || 'Guest phone').slice(0, 64);
	localStorage.setItem('ballot-name', name);
	return name;
}
export function votersFor(ballots, id) {
	return (ballots ?? []).filter((b) => b.coupleId === id).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

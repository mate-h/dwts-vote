export function deviceId() {
	let id = localStorage.getItem('ballot-device');
	if (!id) { id = globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2) + Date.now(); localStorage.setItem('ballot-device', id); }
	return id;
}
export async function fetchVotes() {
	const r = await fetch('/api/votes?device=' + encodeURIComponent(deviceId()) + (document.hidden ? '' : '&seen=1'), { cache: 'no-store' });
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

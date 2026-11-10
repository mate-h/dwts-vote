// Keep a page fed with its room's state.
// Rooms (Cloudflare): one WebSocket per phone; the room pushes new state after every change. If WebSockets
// are blocked or the connection drops, it polls every few seconds until it can reconnect.
// LAN party: polls (free on your own Mac).
// Either way it pauses while the page is hidden (phone locked, app in the background) and resumes on return.
import { fetchVotes, deviceId } from './api.js';

/** @returns {() => void} stop */
export function subscribe(room, onData, { onError = () => {}, pollMs = 3000 } = {}) {
	let ws = null, timer = null, retry = null, ping = null, stopped = false, failures = 0;

	const poll = async () => {
		try { onData(await fetchVotes(room)); onError(null); } catch (e) { onError(e); }
	};
	const startPolling = () => { if (!timer) { poll(); timer = setInterval(poll, pollMs); } };
	const stopPolling = () => { clearInterval(timer); timer = null; };

	function connect() {
		clearTimeout(retry);
		if (stopped || document.hidden || ws) return;
		const s = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/r/${room}/live?device=${encodeURIComponent(deviceId())}`);
		ws = s;
		let opened = false;
		const giveUp = setTimeout(() => { if (!opened) s.close(); }, 6000);
		s.onopen = () => {
			opened = true;
			failures = 0;
			clearTimeout(giveUp);
			stopPolling();
			onError(null);
			ping = setInterval(() => { if (s.readyState === WebSocket.OPEN) s.send('ping'); }, 30000);
		};
		s.onmessage = (e) => {
			if (e.data === 'pong') return;
			try { onData(JSON.parse(e.data)); } catch {}
		};
		s.onclose = () => {
			clearTimeout(giveUp);
			clearInterval(ping);
			if (ws !== s) return; // closed on purpose (pause) or replaced by a newer connection
			ws = null;
			if (stopped || document.hidden) return;
			failures++;
			startPolling(); // keep the ballot fresh while reconnecting
			retry = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(failures, 5)));
		};
	}

	function resume() {
		if (room && typeof WebSocket !== 'undefined') connect();
		else startPolling();
	}
	function pause() {
		clearTimeout(retry);
		stopPolling();
		clearInterval(ping);
		const s = ws;
		ws = null; // before close(), so its onclose knows this was on purpose
		s?.close(1000, 'hidden');
	}
	const onVisibility = () => (document.hidden ? pause() : resume());

	document.addEventListener('visibilitychange', onVisibility);
	if (!document.hidden) resume();
	else poll(); // render something even if opened in the background
	return () => {
		stopped = true;
		document.removeEventListener('visibilitychange', onVisibility);
		pause();
	};
}

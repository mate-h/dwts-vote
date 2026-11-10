let ctx;

function audio() {
	if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') return null;
	if (!ctx) ctx = new (AudioContext || webkitAudioContext)();
	if (ctx.state === 'suspended') ctx.resume();
	return ctx;
}

function tone(ac, { freq, t, dur, type = 'sine', gain = 0.08, freqEnd }) {
	const o = ac.createOscillator();
	const g = ac.createGain();
	o.type = type;
	o.frequency.setValueAtTime(freq, t);
	if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + dur);
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
	g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	o.connect(g);
	g.connect(ac.destination);
	o.start(t);
	o.stop(t + dur + 0.02);
}

function noise(ac, t, dur, { freq = 1800, gain = 0.05, type = 'bandpass' } = {}) {
	const n = ac.createBufferSource();
	const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate);
	const data = buf.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
	n.buffer = buf;
	const f = ac.createBiquadFilter();
	f.type = type;
	f.frequency.value = freq;
	const g = ac.createGain();
	g.gain.setValueAtTime(gain, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	n.connect(f);
	f.connect(g);
	g.connect(ac.destination);
	n.start(t);
	n.stop(t + dur);
}

function synthPick() {
	const ac = audio();
	if (!ac) return;
	const t = ac.currentTime;
	noise(ac, t, 0.045, { freq: 1400, gain: 0.045 });
	tone(ac, { freq: 210, t, dur: 0.08, type: 'triangle', gain: 0.06 });
	tone(ac, { freq: 880, t: t + 0.018, dur: 0.07, type: 'sine', gain: 0.035 });
}

function synthLockIn() {
	const ac = audio();
	if (!ac) return;
	const t = ac.currentTime;
	noise(ac, t, 0.06, { freq: 420, gain: 0.055, type: 'lowpass' });
	tone(ac, { freq: 148, t, dur: 0.14, type: 'square', gain: 0.04 });
	tone(ac, { freq: 523.25, t: t + 0.03, dur: 0.28, type: 'sine', gain: 0.07 });
	tone(ac, { freq: 659.25, t: t + 0.08, dur: 0.32, type: 'sine', gain: 0.05 });
	tone(ac, { freq: 783.99, t: t + 0.13, dur: 0.4, type: 'triangle', gain: 0.035 });
}

function whoosh() {
	const ac = audio();
	if (!ac) return;
	const t = ac.currentTime;
	tone(ac, { freq: 360, t, dur: 0.2, type: 'sine', gain: 0.045, freqEnd: 640 });
	tone(ac, { freq: 240, t: t + 0.03, dur: 0.18, type: 'triangle', gain: 0.03, freqEnd: 420 });
	noise(ac, t, 0.12, { freq: 900, gain: 0.025, type: 'highpass' });
}

const clips = {};

function playClip(key, src, fallback) {
	try {
		if (typeof Audio !== 'undefined') {
			if (!clips[key]) {
				const el = new Audio(src);
				el.preload = 'auto';
				clips[key] = el;
			}
			const el = clips[key];
			el.currentTime = 0;
			const p = el.play();
			if (p && typeof p.catch === 'function') p.catch(() => { try { fallback(); } catch {} });
			return;
		}
		fallback();
	} catch {
		try { fallback(); } catch {}
	}
}

export function playPick() {
	playClip('pick', '/sounds/pick.mp3', synthPick);
}

export function playLockIn() {
	playClip('lock', '/sounds/lock-in.mp3', synthLockIn);
}

export function playNext() {
	playClip('next', '/sounds/next-couple.mp3', whoosh);
}

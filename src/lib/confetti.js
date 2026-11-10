function reduced() {
	return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function canvas() {
	const c = document.createElement('canvas');
	const dpr = Math.min(devicePixelRatio || 1, 2);
	c.width = innerWidth * dpr;
	c.height = innerHeight * dpr;
	Object.assign(c.style, {
		position: 'fixed',
		inset: '0',
		width: '100%',
		height: '100%',
		pointerEvents: 'none',
		zIndex: '999'
	});
	document.body.appendChild(c);
	const ctx = c.getContext('2d');
	ctx.scale(dpr, dpr);
	return { c, ctx, W: innerWidth, H: innerHeight };
}

export function celebrate(score) {
	if (reduced()) return;
	const n = Number(score);
	if (n === 10) goldRain();
	else if (n === 9) silverStars();
	else if (n === 8) ribbonStreamers();
	else if (n === 7) cometStreaks();
	else if (n === 6) risingEmbers();
	else if (n === 5) rippleClap();
	else if (n === 4) fireflies();
	else if (n === 3) copperCoins();
	else if (n === 2) fizzleSparks();
	else ashMotes();
}

export function goldConfetti() {
	goldRain();
}

function goldRain() {
	const COLORS = ['#d4af37', '#ffe9a8', '#f7e7ce', '#e9a23b', '#b8860b', '#fff3c4', '#ffd700', '#f3d377'];
	const { c, ctx, W, H } = canvas();
	const flake = (staggered) => ({
		x: Math.random() * W,
		y: staggered ? -12 - Math.random() * H * 0.9 : -18 - Math.random() * 80,
		vx: (Math.random() - 0.5) * 1.5,
		vy: 2.3 + Math.random() * 3.5,
		w: 7 + Math.random() * 8,
		h: 4 + Math.random() * 6,
		r: Math.random() * 6,
		vr: (Math.random() - 0.5) * 0.28,
		col: COLORS[(Math.random() * COLORS.length) | 0],
		round: Math.random() < 0.2,
		phase: Math.random() * 6.3
	});
	const ps = Array.from({ length: 300 }, () => flake(true));
	let lastEmit = 0;
	const t0 = performance.now();
	const duration = 5600;
	function frame(t) {
		const elapsed = t - t0;
		ctx.clearRect(0, 0, W, H);
		if (elapsed < 1200 && elapsed - lastEmit > 48) {
			lastEmit = elapsed;
			for (let i = 0; i < 12; i++) ps.push(flake(false));
		}
		let alive = false;
		const fadeOut = Math.min(1, Math.max(0, 1 - (elapsed - (duration - 700)) / 700));
		for (const p of ps) {
			p.vy += 0.08;
			p.x += p.vx + Math.sin(p.phase + p.y * 0.018) * 0.55;
			p.y += p.vy;
			p.r += p.vr;
			if (p.y < H + 40) alive = true;
			const edge = p.y > H - 50 ? Math.max(0, (H + 30 - p.y) / 80) : 1;
			ctx.globalAlpha = edge * fadeOut;
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(p.r);
			ctx.fillStyle = p.col;
			if (p.round) {
				ctx.beginPath();
				ctx.arc(0, 0, p.h / 1.4, 0, 6.3);
				ctx.fill();
			} else {
				ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
			}
			ctx.restore();
		}
		if ((alive || elapsed < 1300) && elapsed < duration) requestAnimationFrame(frame);
		else c.remove();
	}
	requestAnimationFrame(frame);
}

function drawRibbon(ctx, nodes, width, front, back, alpha) {
	if (nodes.length < 2) return;
	ctx.globalAlpha = alpha;
	const nrm = [];
	for (let i = 0; i < nodes.length; i++) {
		const prev = nodes[Math.max(0, i - 1)];
		const next = nodes[Math.min(nodes.length - 1, i + 1)];
		let tx = next.x - prev.x;
		let ty = next.y - prev.y;
		const len = Math.hypot(tx, ty) || 1;
		nrm.push({ x: (-ty / len) * width, y: (tx / len) * width });
	}
	for (let i = 0; i < nodes.length - 1; i++) {
		const a = nodes[i];
		const b = nodes[i + 1];
		const na = nrm[i];
		const nb = nrm[i + 1];
		const nxt = nodes[Math.min(nodes.length - 1, i + 2)];
		const tx = b.x - a.x;
		const ty = b.y - a.y;
		const cross = tx * (nxt.y - b.y) - ty * (nxt.x - b.x);
		ctx.fillStyle = cross < 0 ? back : front;
		ctx.beginPath();
		ctx.moveTo(a.x + na.x, a.y + na.y);
		ctx.lineTo(b.x + nb.x, b.y + nb.y);
		ctx.lineTo(b.x - nb.x, b.y - nb.y);
		ctx.lineTo(a.x - na.x, a.y - na.y);
		ctx.closePath();
		ctx.fill();
	}
	const tip = nodes[0];
	ctx.fillStyle = front;
	ctx.beginPath();
	ctx.arc(tip.x, tip.y, width, 0, Math.PI * 2);
	ctx.fill();
	const tail = nodes[nodes.length - 1];
	ctx.beginPath();
	ctx.arc(tail.x, tail.y, width * 0.85, 0, Math.PI * 2);
	ctx.fill();
}

function ribbonStreamers() {
	const COLORS = [
		['#e8c35a', '#a67c2a'],
		['#ff4d6d', '#8a1430'],
		['#3ecfbf', '#0e6b62'],
		['#c084fc', '#5b21b6'],
		['#fb7185', '#9f1239'],
		['#fde68a', '#d97706'],
		['#38bdf8', '#1d4ed8'],
		['#f5f0e1', '#b8a48a']
	];
	const { c, ctx, W, H } = canvas();
	const ribbons = Array.from({ length: 14 }, (_, i) => {
		const [front, back] = COLORS[i % COLORS.length];
		const n = 24;
		const length = 240 + (i % 5) * 18;
		const rest = length / (n - 1);
		const x = ((i + 0.55) / 14) * W + (Math.random() - 0.5) * 28;
		const originY = -12;
		const spread = (Math.random() - 0.5) * 0.32;
		const angle = Math.PI / 2 + spread;
		const speed = 3.6 + Math.random() * 2.4;
		const vx0 = Math.cos(angle) * speed;
		const vy0 = Math.sin(angle) * speed;
		const dirx = Math.cos(angle);
		const diry = Math.sin(angle);
		const nodes = Array.from({ length: n }, (_, k) => {
			const px = x - dirx * k * rest;
			const py = originY - diry * k * rest;
			const falloff = Math.pow(1 - k / (n - 1), 1.2);
			return { x: px, y: py, ox: px - vx0 * falloff, oy: py - vy0 * falloff };
		});
		return {
			nodes,
			rest,
			front,
			back,
			width: 2.55 + (i % 4) * 0.3,
			phase: Math.random() * 6.283,
			gust: (Math.random() - 0.5) * 0.04
		};
	});
	const t0 = performance.now();
	function frame(t) {
		const elapsed = t - t0;
		ctx.clearRect(0, 0, W, H);
		let alive = false;
		const fade = Math.min(1, Math.max(0, 1 - (elapsed - 5000) / 800));
		for (const rib of ribbons) {
			const { nodes, rest } = rib;
			for (let i = 0; i < nodes.length; i++) {
				const nd = nodes[i];
				let vx = nd.x - nd.ox;
				let vy = nd.y - nd.oy;
				const prev = nodes[Math.max(0, i - 1)];
				const next = nodes[Math.min(nodes.length - 1, i + 1)];
				let tx = next.x - prev.x;
				let ty = next.y - prev.y;
				const tlen = Math.hypot(tx, ty) || 1;
				tx /= tlen;
				ty /= tlen;
				const nx = -ty;
				const ny = tx;
				const vPar = vx * tx + vy * ty;
				const vPerp = vx * nx + vy * ny;
				const dampPar = 1 / (1 + 0.01 * Math.abs(vPar));
				const dampPerp = 1 / (1 + 0.05 * Math.abs(vPerp));
				const vPar2 = vPar * dampPar;
				const vPerp2 = vPerp * dampPerp;
				vx = tx * vPar2 + nx * vPerp2;
				vy = ty * vPar2 + ny * vPerp2;
				const along = i / Math.max(1, nodes.length - 1);
				const flutter = Math.sin(elapsed * 0.0045 + rib.phase + i * 0.32) * (0.022 + 0.028 * along);
				const x2 = nd.x + vx + rib.gust + flutter * nx;
				const y2 = nd.y + vy + 0.11;
				nd.ox = nd.x;
				nd.oy = nd.y;
				nd.x = x2;
				nd.y = y2;
			}
			const rest2 = rest * 1.88;
			for (let iter = 0; iter < 10; iter++) {
				for (let j = 0; j < nodes.length - 1; j++) {
					const a = nodes[j];
					const b = nodes[j + 1];
					const dx = b.x - a.x;
					const dy = b.y - a.y;
					const d = Math.hypot(dx, dy) || 0.0001;
					const diff = (d - rest) / d;
					a.x += dx * diff * 0.5;
					a.y += dy * diff * 0.5;
					b.x -= dx * diff * 0.5;
					b.y -= dy * diff * 0.5;
				}
				for (let j = 0; j < nodes.length - 2; j++) {
					const a = nodes[j];
					const c = nodes[j + 2];
					const dx = c.x - a.x;
					const dy = c.y - a.y;
					const d = Math.hypot(dx, dy) || 0.0001;
					const limit = j < 3 ? rest * 1.93 : rest2;
					if (d >= limit) continue;
					const diff = (d - limit) / d;
					const stiff = j < 3 ? 0.42 : 0.32;
					a.x += dx * diff * stiff;
					a.y += dy * diff * stiff;
					c.x -= dx * diff * stiff;
					c.y -= dy * diff * stiff;
				}
			}
			if (nodes[0].y < H + 200) alive = true;
			drawRibbon(ctx, nodes, rib.width, rib.front, rib.back, fade);
		}
		if (alive && elapsed < 5800) requestAnimationFrame(frame);
		else c.remove();
	}
	requestAnimationFrame(frame);
}

function drawStar(ctx, r) {
	ctx.beginPath();
	for (let i = 0; i < 8; i++) {
		const a = (i * Math.PI) / 4 - Math.PI / 2;
		const rad = i % 2 ? r * 0.38 : r;
		if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
		else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
	}
	ctx.closePath();
	ctx.fill();
}

function silverStars() {
	const COLORS = ['#f8fafc', '#e2e8f0', '#fef9c3', '#f1f5f9', '#ffe9a8'];
	const { c, ctx, W, H } = canvas();
	const ps = Array.from({ length: 90 }, () => ({
		x: Math.random() * W,
		y: -20 - Math.random() * H * 0.35,
		vx: (Math.random() - 0.5) * 1.2,
		vy: 1.4 + Math.random() * 2.2,
		r: 0,
		vr: (Math.random() - 0.5) * 0.12,
		s: 5 + Math.random() * 8,
		col: COLORS[(Math.random() * COLORS.length) | 0],
		tw: Math.random() * 6
	}));
	const t0 = performance.now();
	function frame(t) {
		const elapsed = t - t0;
		ctx.clearRect(0, 0, W, H);
		let alive = false;
		for (const p of ps) {
			p.vy += 0.04;
			p.x += p.vx;
			p.y += p.vy;
			p.r += p.vr;
			if (p.y < H + 20) alive = true;
			const twinkle = 0.55 + 0.45 * Math.abs(Math.sin(elapsed * 0.008 + p.tw));
			ctx.globalAlpha = twinkle * Math.max(0, 1 - elapsed / 3800);
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(p.r);
			ctx.fillStyle = p.col;
			drawStar(ctx, p.s);
			ctx.restore();
		}
		if (alive && elapsed < 3800) requestAnimationFrame(frame);
		else c.remove();
	}
	requestAnimationFrame(frame);
}

function cometStreaks() {
	const COLORS = ['#5eead4', '#2dd4bf', '#99f6e4', '#e9c75a'];
	const { c, ctx, W, H } = canvas();
	const ps = Array.from({ length: 26 }, () => {
		const left = Math.random() < 0.5;
		return {
			x: left ? -40 : W + 40,
			y: H * (0.15 + Math.random() * 0.55),
			vx: (left ? 1 : -1) * (8 + Math.random() * 7),
			vy: -1 + Math.random() * 2.4,
			col: COLORS[(Math.random() * COLORS.length) | 0],
			len: 28 + Math.random() * 42
		};
	});
	const t0 = performance.now();
	function frame(t) {
		const elapsed = t - t0;
		ctx.clearRect(0, 0, W, H);
		ctx.globalAlpha = Math.max(0, 1 - elapsed / 1600);
		for (const p of ps) {
			p.x += p.vx;
			p.y += p.vy;
			const ang = Math.atan2(p.vy, p.vx);
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(ang);
			const g = ctx.createLinearGradient(-p.len, 0, 0, 0);
			g.addColorStop(0, 'rgba(0,0,0,0)');
			g.addColorStop(1, p.col);
			ctx.fillStyle = g;
			ctx.fillRect(-p.len, -1.6, p.len, 3.2);
			ctx.restore();
		}
		if (elapsed < 1600) requestAnimationFrame(frame);
		else c.remove();
	}
	requestAnimationFrame(frame);
}

function risingEmbers() {
	const COLORS = ['#fb923c', '#f59e0b', '#ef4444', '#fde68a'];
	const { c, ctx, W, H } = canvas();
	const ps = Array.from({ length: 70 }, () => ({
		x: W * (0.15 + Math.random() * 0.7),
		y: H + Math.random() * 40,
		vx: (Math.random() - 0.5) * 0.8,
		vy: -(1.6 + Math.random() * 2.4),
		s: 2 + Math.random() * 3,
		col: COLORS[(Math.random() * COLORS.length) | 0],
		life: 0.7 + Math.random() * 0.6
	}));
	const t0 = performance.now();
	function frame(t) {
		const elapsed = t - t0;
		ctx.clearRect(0, 0, W, H);
		for (const p of ps) {
			p.x += p.vx + Math.sin(elapsed * 0.004 + p.x) * 0.15;
			p.y += p.vy;
			p.vy *= 0.995;
			const a = Math.max(0, p.life - elapsed / 2800);
			ctx.globalAlpha = a * (0.6 + 0.4 * Math.abs(Math.sin(elapsed * 0.02 + p.x)));
			ctx.fillStyle = p.col;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.s, 0, 6.3);
			ctx.fill();
		}
		if (elapsed < 2800) requestAnimationFrame(frame);
		else c.remove();
	}
	requestAnimationFrame(frame);
}

function rippleClap() {
	const { c, ctx, W, H } = canvas();
	const cx = W / 2;
	const cy = H * 0.42;
	const rings = Array.from({ length: 5 }, (_, i) => ({
		delay: i * 160,
		max: 40 + i * 55,
		n: 18 + i * 8
	}));
	const t0 = performance.now();
	function frame(t) {
		const elapsed = t - t0;
		ctx.clearRect(0, 0, W, H);
		for (const ring of rings) {
			const local = elapsed - ring.delay;
			if (local < 0) continue;
			const u = Math.min(1, local / 900);
			const rad = ring.max * (1 - Math.pow(1 - u, 2));
			ctx.globalAlpha = (1 - u) * 0.85;
			for (let i = 0; i < ring.n; i++) {
				const a = (i / ring.n) * Math.PI * 2;
				ctx.fillStyle = i % 2 ? '#ffe9a8' : '#d4af37';
				ctx.beginPath();
				ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 2.4, 0, 6.3);
				ctx.fill();
			}
		}
		if (elapsed < 1800) requestAnimationFrame(frame);
		else c.remove();
	}
	requestAnimationFrame(frame);
}

function fireflies() {
	const { c, ctx, W, H } = canvas();
	const ps = Array.from({ length: 24 }, () => ({
		x: W * (0.15 + Math.random() * 0.7),
		y: H * (0.25 + Math.random() * 0.5),
		vx: (Math.random() - 0.5) * 0.7,
		vy: (Math.random() - 0.5) * 0.7,
		phase: Math.random() * 6
	}));
	const t0 = performance.now();
	function frame(t) {
		const elapsed = t - t0;
		ctx.clearRect(0, 0, W, H);
		for (const p of ps) {
			p.vx += (Math.random() - 0.5) * 0.05;
			p.vy += (Math.random() - 0.5) * 0.05;
			p.x += p.vx;
			p.y += p.vy;
			const glow = 0.25 + 0.75 * Math.abs(Math.sin(elapsed * 0.004 + p.phase));
			ctx.globalAlpha = glow * Math.max(0, 1 - elapsed / 3200);
			ctx.fillStyle = '#c4b5fd';
			ctx.beginPath();
			ctx.arc(p.x, p.y, 3.2, 0, 6.3);
			ctx.fill();
			ctx.globalAlpha *= 0.35;
			ctx.beginPath();
			ctx.arc(p.x, p.y, 8, 0, 6.3);
			ctx.fill();
		}
		if (elapsed < 3200) requestAnimationFrame(frame);
		else c.remove();
	}
	requestAnimationFrame(frame);
}

function copperCoins() {
	const COLORS = ['#b87333', '#cd7f32', '#e0a15a', '#8c5a28'];
	const { c, ctx, W, H } = canvas();
	const ps = Array.from({ length: 18 }, () => ({
		x: W * (0.2 + Math.random() * 0.6),
		y: H * 0.2 + Math.random() * 40,
		vx: (Math.random() - 0.5) * 2,
		vy: 1 + Math.random() * 2,
		r: Math.random() * 6,
		vr: (Math.random() - 0.5) * 0.2,
		s: 7 + Math.random() * 5,
		col: COLORS[(Math.random() * COLORS.length) | 0],
		bounced: false
	}));
	const t0 = performance.now();
	function frame(t) {
		const elapsed = t - t0;
		ctx.clearRect(0, 0, W, H);
		ctx.globalAlpha = Math.max(0, 1 - elapsed / 2800);
		for (const p of ps) {
			p.vy += 0.22;
			p.x += p.vx;
			p.y += p.vy;
			p.r += p.vr;
			if (!p.bounced && p.y > H * 0.82) {
				p.vy *= -0.38;
				p.bounced = true;
			}
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(p.r);
			ctx.scale(1, 0.62 + 0.38 * Math.abs(Math.cos(p.r)));
			ctx.fillStyle = p.col;
			ctx.beginPath();
			ctx.arc(0, 0, p.s, 0, 6.3);
			ctx.fill();
			ctx.restore();
		}
		if (elapsed < 2800) requestAnimationFrame(frame);
		else c.remove();
	}
	requestAnimationFrame(frame);
}

function fizzleSparks() {
	const COLORS = ['#fb923c', '#fdba74', '#f97316'];
	const { c, ctx, W, H } = canvas();
	const ps = Array.from({ length: 40 }, () => ({
		x: W * (0.25 + Math.random() * 0.5),
		y: H * (0.72 + Math.random() * 0.1),
		vx: (Math.random() - 0.5) * 3,
		vy: -(2 + Math.random() * 3.5),
		col: COLORS[(Math.random() * COLORS.length) | 0],
		s: 1.5 + Math.random() * 2
	}));
	const t0 = performance.now();
	function frame(t) {
		const elapsed = t - t0;
		ctx.clearRect(0, 0, W, H);
		for (const p of ps) {
			p.vy += 0.28;
			p.x += p.vx;
			p.y += p.vy;
			ctx.globalAlpha = Math.max(0, 1 - elapsed / 900);
			ctx.fillStyle = p.col;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.s, 0, 6.3);
			ctx.fill();
		}
		if (elapsed < 900) requestAnimationFrame(frame);
		else c.remove();
	}
	requestAnimationFrame(frame);
}

function ashMotes() {
	const COLORS = ['#6b7280', '#9ca3af', '#4b5563'];
	const { c, ctx, W, H } = canvas();
	const ps = Array.from({ length: 22 }, () => ({
		x: W * (0.2 + Math.random() * 0.6),
		y: H * 0.15 + Math.random() * 80,
		vx: (Math.random() - 0.5) * 0.4,
		vy: 0.4 + Math.random() * 0.5,
		s: 1.5 + Math.random() * 2.2,
		col: COLORS[(Math.random() * COLORS.length) | 0]
	}));
	const t0 = performance.now();
	function frame(t) {
		const elapsed = t - t0;
		ctx.clearRect(0, 0, W, H);
		ctx.globalAlpha = Math.max(0, 0.7 - elapsed / 4000);
		for (const p of ps) {
			p.x += p.vx + Math.sin(elapsed * 0.002 + p.y) * 0.15;
			p.y += p.vy;
			ctx.fillStyle = p.col;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.s, 0, 6.3);
			ctx.fill();
		}
		if (elapsed < 3200) requestAnimationFrame(frame);
		else c.remove();
	}
	requestAnimationFrame(frame);
}

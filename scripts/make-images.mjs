#!/usr/bin/env node
// Renders the favicon set and the social share images into static/. Re-run after changing the designs:
//   node scripts/make-images.mjs
// static/og.png       site link preview (1200×630)
// static/og-room.png  room invite preview (the room code goes in the title/description tags)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (f) => path.join(ROOT, 'static', f);

// Scoring paddle like the judges' (gold trapezoid with art-deco wings), drawn in a 100×120 box.
const paddle = (score, id) => `
	<defs>
		<linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#fff1b8"/><stop offset="0.45" stop-color="#e9c75a"/><stop offset="0.75" stop-color="#b48a26"/><stop offset="1" stop-color="#f3dc8a"/>
		</linearGradient>
	</defs>
	<path d="M6 22 L20 30 L22 104 L10 96 Z" fill="#1a0d05" stroke="#c9a86a" stroke-width="2"/>
	<path d="M94 22 L80 30 L78 104 L90 96 Z" fill="#1a0d05" stroke="#c9a86a" stroke-width="2"/>
	<path d="M30 6 H70 L84 112 H16 Z" fill="url(#g${id})" stroke="#6b4d12" stroke-width="2"/>
	<path d="M16 112 H84 L83 118 H17 Z" fill="#6b4d12"/>
	<text x="50" y="${score === 10 ? 80 : 82}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${score === 10 ? 50 : 56}" fill="#1a0d05" letter-spacing="-2">${score}</text>`;

// Favicon: a single "10" paddle on a dark rounded tile.
const icon = (size, { tile = true } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
	${tile ? '<rect width="128" height="128" rx="28" fill="#2a0a12"/><rect x="3" y="3" width="122" height="122" rx="25" fill="none" stroke="#c9a86a" stroke-width="3" opacity="0.6"/>' : ''}
	<g transform="translate(14 4) scale(1 1)">${paddle(10, 'i')}</g>
</svg>`;

// Deterministic confetti so the image doesn't change on every run.
function confetti(n, w, h, seed = 7) {
	let s = seed;
	const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
	const colors = ['#e9c75a', '#ffe9a8', '#d4af37', '#fff', '#f0a33a'];
	let svg = '';
	for (let i = 0; i < n; i++) {
		const x = rnd() * w, y = rnd() * h, c = colors[Math.floor(rnd() * colors.length)], o = (0.35 + rnd() * 0.6).toFixed(2);
		if (rnd() < 0.4) svg += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.5 + rnd() * 4).toFixed(1)}" fill="${c}" opacity="${o}"/>`;
		else svg += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(4 + rnd() * 8).toFixed(0)}" height="${(2 + rnd() * 4).toFixed(0)}" fill="${c}" opacity="${o}" transform="rotate(${(rnd() * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
	}
	return svg;
}

const W = 1200, H = 630;
function card({ eyebrow, title, lines, cta }) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
	<defs>
		<radialGradient id="bg" cx="0.5" cy="0" r="1.1"><stop offset="0" stop-color="#5a1324"/><stop offset="0.5" stop-color="#1c080e"/><stop offset="1" stop-color="#050304"/></radialGradient>
		<radialGradient id="spot" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#e9c75a" stop-opacity="0.28"/><stop offset="1" stop-color="#e9c75a" stop-opacity="0"/></radialGradient>
		<linearGradient id="btn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e3a0"/><stop offset="1" stop-color="#d4af37"/></linearGradient>
	</defs>
	<rect width="${W}" height="${H}" fill="url(#bg)"/>
	${confetti(140, W, H)}
	<ellipse cx="930" cy="330" rx="330" ry="260" fill="url(#spot)"/>
	<rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="28" fill="none" stroke="#c9a86a" stroke-opacity="0.55" stroke-width="2"/>
	<g transform="translate(700 185) rotate(-14 80 96) scale(1.6)">${paddle(8, 'a')}</g>
	<g transform="translate(985 185) rotate(14 80 96) scale(1.6)">${paddle(9, 'b')}</g>
	<g transform="translate(830 130) scale(2.0)">${paddle(10, 'c')}</g>
	<text x="80" y="262" font-family="system-ui, -apple-system, Helvetica, sans-serif" font-weight="800" font-size="24" letter-spacing="6" fill="#c9a86a">${eyebrow}</text>
	${title.map((t, i) => `<text x="76" y="${334 + i * 70}" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="62" fill="#fff3c4">${t}</text>`).join('')}
	${lines.map((t, i) => `<text x="80" y="${334 + title.length * 70 - 10 + i * 34}" font-family="system-ui, -apple-system, Helvetica, sans-serif" font-size="25" fill="#e2cfa4">${t}</text>`).join('')}
	<rect x="80" y="${H - 104}" width="${cta.length * 15 + 70}" height="62" rx="31" fill="url(#btn)"/>
	<text x="${80 + (cta.length * 15 + 70) / 2}" y="${H - 63}" text-anchor="middle" font-family="system-ui, -apple-system, Helvetica, sans-serif" font-weight="800" font-size="26" fill="#1a0d05">${cta}</text>
	<text x="${W - 70}" y="${H - 50}" text-anchor="end" font-family="system-ui, -apple-system, Helvetica, sans-serif" font-weight="700" font-size="22" letter-spacing="2" fill="#a98e65">dwts.mateh.dev</text>
</svg>`;
}

async function shareImage(file, opts) {
	const logo = await sharp(out('dwts-logo.png')).resize({ width: 360 }).toBuffer();
	await sharp(Buffer.from(card(opts)))
		.composite([{ input: logo, left: 72, top: 44 }])
		.png({ compressionLevel: 9, palette: true, quality: 90 })
		.toFile(out(file));
	console.log('wrote static/' + file);
}

await shareImage('og.png', {
	eyebrow: 'FAN BALLOT · PLAY ALONG LIVE',
	title: ['Score every dance', 'with your friends'],
	lines: ['Everyone votes from their own phone. Scores stay', 'hidden until the whole room has voted.'],
	cta: 'Create a room →'
});
await shareImage('og-room.png', {
	eyebrow: "YOU'RE INVITED · WATCH PARTY",
	title: ['Grab your paddle,', "it's scoring time"],
	lines: ['Join the room and score each couple as they dance.', 'See how your 10s compare with the judges’.'],
	cta: 'Tap to join →'
});

// Favicons
fs.writeFileSync(out('favicon.svg'), icon(128));
for (const [file, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
	await sharp(Buffer.from(icon(size))).png().toFile(out(file));
	console.log('wrote static/' + file);
}
// favicon.ico holding PNG images (supported by every current browser).
const pngs = await Promise.all([16, 32, 48].map((s) => sharp(Buffer.from(icon(s))).png().toBuffer()));
const head = Buffer.alloc(6 + 16 * pngs.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
let offset = head.length;
pngs.forEach((png, i) => {
	const s = [16, 32, 48][i], e = 6 + 16 * i;
	head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
	head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(offset, e + 12);
	offset += png.length;
});
fs.writeFileSync(out('favicon.ico'), Buffer.concat([head, ...pngs]));
console.log('wrote static/favicon.ico');

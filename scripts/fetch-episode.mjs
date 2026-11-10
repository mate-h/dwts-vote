#!/usr/bin/env node
// Fetch one or more DWTS weeks from Wikipedia and write the app's episode data files.
//
//   node scripts/fetch-episode.mjs --week 5            # writes src/lib/episodes/s34e05.json
//   node scripts/fetch-episode.mjs --week 2-6          # a range (or a list: --week 2,4,7)
//   node scripts/fetch-episode.mjs --all               # every week on the page
//   node scripts/fetch-episode.mjs --week 5 --dry-run  # print the JSON, write nothing
//   node scripts/fetch-episode.mjs --week 5 --scores   # also keep judges' scores (spoilers!)
//
// Source: the season's English Wikipedia article ("Weekly scores" section), via the MediaWiki API.
// Each "=== Week N: Theme ===" section has a performance-order table with Couple / Scores / Dance /
// Music / [theme-specific column] / Result. "Couple" cells ("Andy & Emma") are matched to src/lib/cast.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAST, SEASON } from '../src/lib/cast.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'src/lib/episodes');
const API = 'https://en.wikipedia.org/w/api.php';
const UA = 'dwts-vote-episode-fetcher/1.0 (local fan app)';

// ---------- CLI ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes('--' + name);
const opt = (name) => {
	const i = args.indexOf('--' + name);
	return i >= 0 ? args[i + 1] : undefined;
};
if (flag('help') || (!opt('week') && !flag('all'))) {
	console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 11).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
	process.exit(flag('help') ? 0 : 1);
}
const season = Number(opt('season') ?? SEASON);
if (season !== SEASON) console.warn(`warning: src/lib/cast.js is season ${SEASON}; couples for season ${season} will not match unless you update it.`);
const pageTitle = opt('page') ?? `Dancing with the Stars (American TV series) season ${season}`;

function parseWeeks(spec) {
	const out = new Set();
	for (const part of String(spec).split(',')) {
		const [a, b] = part.split('-').map(Number);
		if (!Number.isInteger(a)) throw new Error('bad --week ' + spec);
		for (let w = a; w <= (Number.isInteger(b) ? b : a); w++) out.add(w);
	}
	return [...out];
}

// ---------- fetch ----------
async function fetchWikitext(title) {
	const url = new URL(API);
	url.search = new URLSearchParams({ action: 'parse', page: title, prop: 'wikitext|revid', redirects: '1', format: 'json', formatversion: '2' });
	const res = await fetch(url, { headers: { 'User-Agent': UA } });
	if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
	const data = await res.json();
	if (data.error) throw new Error(`Wikipedia: ${data.error.info} (page "${title}"; pass --page "<exact title>")`);
	return { title: data.parse.title, revid: data.parse.revid, wikitext: data.parse.wikitext };
}

// ---------- wikitext helpers ----------
function stripRefs(s) {
	return s.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
}
// Remove {{...}} templates, keeping the text of the few inline ones that carry content.
function stripTemplates(s) {
	let prev;
	do {
		prev = s;
		s = s.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => {
			const [name, ...rest] = inner.split('|');
			const n = name.trim().toLowerCase();
			if (n === "'") return "'";
			if (['nowrap', 'nobr', 'small', 'abbr', 'sortname', 'nowrap begin'].includes(n)) return rest[0] ?? '';
			return '';
		});
	} while (s !== prev);
	return s;
}
function clean(s) {
	s = stripTemplates(stripRefs(s));
	s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1'); // [[target|text]] / [[text]]
	s = s.replace(/\[https?:\/\/\S+ ([^\]]*)\]/g, '$1'); // [url text]
	s = s.replace(/'''?/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
	s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
	return s.replace(/\s+/g, ' ').trim();
}
// A table cell is "attrs | content" when it has attributes; split on the first lone | outside [[ ]] / {{ }}.
function splitCell(raw) {
	let depth = 0;
	for (let i = 0; i < raw.length; i++) {
		const two = raw.slice(i, i + 2);
		if (two === '[[' || two === '{{') { depth++; i++; continue; }
		if (two === ']]' || two === '}}') { depth--; i++; continue; }
		if (raw[i] === '|' && depth === 0 && raw[i + 1] !== '|') {
			const attrs = raw.slice(0, i);
			if (/^\s*[\w-]+\s*=/.test(attrs)) return { attrs, text: raw.slice(i + 1) };
			break;
		}
	}
	return { attrs: '', text: raw };
}

// Parse a {| ... |} wikitable into { headers, rows } with rowspans expanded.
function parseTable(src) {
	const rawRows = [];
	let cur = null;
	for (const line of src.split('\n')) {
		const t = line.trim();
		if (t.startsWith('{|') || t.startsWith('|}') || t.startsWith('|+')) continue;
		if (t.startsWith('|-')) { cur = null; continue; }
		if (!t.startsWith('|') && !t.startsWith('!')) { if (cur?.length) cur[cur.length - 1].raw += '\n' + line; continue; }
		if (!cur) rawRows.push((cur = []));
		const header = t[0] === '!';
		for (const part of t.slice(1).split(header ? /!!|\|\|/ : /\|\|/)) cur.push({ header, raw: part });
	}
	const cells = rawRows.map((r) =>
		r.map(({ header, raw }) => {
			const { attrs, text } = splitCell(raw);
			const span = Number(/rowspan\s*=\s*"?(\d+)/.exec(attrs)?.[1] ?? 1);
			const colspan = Number(/colspan\s*=\s*"?(\d+)/.exec(attrs)?.[1] ?? 1);
			return { header, attrs, text: clean(text), raw: text, span, colspan };
		})
	);
	const headers = cells.shift().map((c) => c.text);
	const rows = [];
	const pending = []; // per column: { cell, left }
	for (const r of cells) {
		const row = [];
		let k = 0;
		let carry = null; // a colspan cell still covering columns to its right
		for (let col = 0; col < headers.length; col++) {
			if (pending[col]?.left > 0) { row.push(pending[col].cell); pending[col].left--; continue; }
			const cell = carry?.left > 0 ? (carry.left--, carry.cell) : r[k++];
			if (!cell) break;
			row.push(cell);
			if (cell !== carry?.cell && cell.colspan > 1) carry = { cell, left: cell.colspan - 1 };
			if (cell.span > 1) pending[col] = { cell, left: cell.span - 1 };
		}
		rows.push(row);
	}
	return { headers, rows };
}

// ---------- week extraction ----------
function weekSections(wikitext) {
	const re = /^===\s*Week (\d+):\s*(.+?)\s*===\s*$/gm;
	const marks = [...wikitext.matchAll(re)];
	return marks.map((m, i) => ({
		week: Number(m[1]),
		night: clean(m[2]),
		body: wikitext.slice(m.index + m[0].length, marks[i + 1]?.index ?? wikitext.indexOf('\n== ', m.index + 1))
	}));
}

const findCol = (headers, re) => headers.findIndex((h) => re.test(h));

function normDance(d) {
	return d
		.replace(/cha-cha-cha/i, 'Cha Cha')
		.split(' ')
		.map((w) => (/^(and|&)$/i.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
		.join(' ');
}

const byFirstNames = new Map(Object.values(CAST).map((c) => [`${c.celeb.split(' ')[0]} & ${c.pro.split(' ')[0]}`.toLowerCase(), c.id]));
// A couple cell is "Andy & Emma", or for team/group dances a <br>-separated list that can include a
// non-competing captain ("Alfonso Ribeiro<br />Danielle & Pasha<br />..."). Returns every couple id in it.
function coupleIds(cell) {
	const parts = cell.raw.split(/<br\s*\/?>/i).map(clean).filter(Boolean);
	const ids = parts.map((p) => byFirstNames.get(p.toLowerCase())).filter(Boolean);
	const unknown = parts.filter((p) => p.includes('&') && !byFirstNames.has(p.toLowerCase()));
	if (unknown.length) throw new Error(`Unknown couple "${unknown[0]}". Add it to src/lib/cast.js (known: ${[...byFirstNames.keys()].join(', ')})`);
	return ids;
}

function splitMusic(music) {
	// '"Song" — Artist' (artist weeks) or just '"Song"' (theme column carries the source instead).
	const m = /^"(.+?)"\s*(?:[—–-]\s*(.+))?$/.exec(music);
	return m ? { song: m[1], artist: m[2]?.trim() || undefined } : { song: music.replace(/"/g, ''), artist: undefined };
}

function extractWeek(sec, { scores }) {
	const tables = [...sec.body.matchAll(/^\{\|[\s\S]*?^\|\}/gm)].map((m) => parseTable(m[0]));
	const table = tables.find((t) => findCol(t.headers, /^Couple/i) >= 0 && findCol(t.headers, /^Dance/i) >= 0);
	if (!table) throw new Error(`Week ${sec.week}: no performance table found`);
	const { headers, rows } = table;
	const col = {
		couple: findCol(headers, /^Couple/i),
		scores: findCol(headers, /^Scores?/i),
		dance: findCol(headers, /^Dance/i),
		music: findCol(headers, /music|song/i),
		result: findCol(headers, /^Result/i)
	};
	const known = new Set(Object.values(col));
	const judgeCol = findCol(headers, /^Judge/i);
	known.add(judgeCol);
	const extraCols = headers.map((h, i) => i).filter((i) => !known.has(i));

	const couples = new Map();
	const wentHome = [];
	for (const row of rows) {
		if (!row[col.couple]?.text) continue;
		const ids = coupleIds(row[col.couple]);
		const { song, artist } = col.music >= 0 ? splitMusic(row[col.music]?.text ?? '') : {};
		const notes = extraCols.map((i) => ({ label: headers[i], value: row[i]?.text })).filter((n) => n.value);
		const perf = {
			dance: normDance(row[col.dance]?.text ?? ''),
			...(song ? { song } : {}),
			// What the card shows under the song: the artist, else the theme column (film, decade, ...).
			...(artist || notes[0] ? { songFrom: artist ?? notes[0].value } : {}),
			...(artist && notes.length ? { notes } : notes.length > 1 ? { notes: notes.slice(1) } : {}),
			...(scores && col.scores >= 0 ? { score: row[col.scores].text } : {})
		};
		const result = col.result >= 0 ? row[col.result]?.text ?? '' : '';
		for (const id of ids) {
			if (!couples.has(id)) couples.set(id, { id, performances: [] });
			const c = couples.get(id);
			if (!c.performances.some((p) => p.dance === perf.dance && p.song === perf.song)) c.performances.push(perf);
			if (ids.length === 1 && /eliminat|withdr/i.test(result) && !wentHome.includes(id)) wentHome.push(id);
		}
	}
	return {
		season,
		week: sec.week,
		night: sec.night,
		label: `Season ${season} · Episode ${sec.week} · ${sec.night}`,
		couples: [...couples.values()],
		wentHome
	};
}

// ---------- main ----------
const page = await fetchWikitext(pageTitle);
const sections = weekSections(page.wikitext);
const weeks = flag('all') ? sections.map((s) => s.week) : parseWeeks(opt('week'));
const source = { page: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`, revid: page.revid, fetched: new Date().toISOString().slice(0, 10), license: 'CC BY-SA 4.0' };

let failed = 0;
for (const week of weeks) {
	const sec = sections.find((s) => s.week === week);
	try {
		if (!sec) throw new Error(`no "Week ${week}" section on ${page.title} (has: ${sections.map((s) => s.week).join(', ') || 'none'})`);
		const data = { ...extractWeek(sec, { scores: flag('scores') }), source };
		const json = JSON.stringify(data, null, '\t') + '\n';
		if (flag('dry-run')) { process.stdout.write(json); continue; }
		fs.mkdirSync(OUT_DIR, { recursive: true });
		const file = path.join(OUT_DIR, `s${season}e${String(week).padStart(2, '0')}.json`);
		fs.writeFileSync(file, json);
		console.log(`wrote ${path.relative(ROOT, file)} — ${data.night}: ${data.couples.length} couples${data.wentHome.length ? `, went home: ${data.wentHome.join(', ')}` : ''}`);
	} catch (e) {
		failed++;
		console.error(`week ${week}: ${e.message}`);
	}
}
process.exit(failed ? 1 : 0);

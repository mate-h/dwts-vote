// Parse a Dancing with the Stars (US) season article from English Wikipedia into ballot data.
// Used by scripts/fetch-episode.mjs (bundles seasons into src/lib/episodes/) and by the server for live judges' scores (live.js).
//
// The article has a "Couples" cast table (Celebrity / Notability / Professional partner / Status) and a
// "=== Week N: Theme ===" section per week whose performance tables have Couple / Scores / Dance /
// Music / [theme-specific columns] / Result. Couple cells use first names ("Andy & Emma").

const API = 'https://en.wikipedia.org/w/api.php';
const UA = 'dwts-vote/1.0 (https://github.com/mate-h/dwts-vote; fan voting app)';
export const LICENSE = 'CC BY-SA 4.0';

export const pageTitle = (season) => `Dancing with the Stars (American TV series) season ${season}`;
export const episodeKey = (season, week) => `s${season}e${String(week).padStart(2, '0')}`;
export function parseKey(key) {
	const m = /^s(\d{1,3})e(\d{1,3})$/.exec(String(key ?? ''));
	return m ? { season: Number(m[1]), week: Number(m[2]) } : null;
}

export class WikiError extends Error {
	constructor(message, code) {
		super(message);
		this.code = code; // 'missing' when the season has no article yet
	}
}

/** Fetch the season article's wikitext. Throws WikiError('missing') if there is no article. */
export async function fetchSeasonPage(season, { title = pageTitle(season), fetchImpl = fetch } = {}) {
	const url = new URL(API);
	url.search = new URLSearchParams({ action: 'parse', page: title, prop: 'wikitext|revid', redirects: '1', format: 'json', formatversion: '2' });
	const res = await fetchImpl(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
	if (!res.ok) throw new WikiError(`Wikipedia returned HTTP ${res.status}`);
	const data = await res.json();
	if (data.error?.code === 'missingtitle') throw new WikiError(`Wikipedia has no article for season ${season} yet`, 'missing');
	if (data.error) throw new WikiError(`Wikipedia: ${data.error.info}`);
	const t = data.parse.title;
	return {
		title: t,
		revid: data.parse.revid,
		wikitext: data.parse.wikitext,
		url: `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`
	};
}

// ---------- wikitext helpers ----------
const stripComments = (s) => s.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
const stripRefs = (s) => s.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
// Remove {{...}} templates, keeping the text of the few inline ones that carry content.
function stripTemplates(s) {
	let prev;
	do {
		prev = s;
		s = s.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => {
			const [name, ...rest] = inner.split('|').map((p) => p.trim());
			const n = name.toLowerCase();
			if (n === "'") return "'";
			if (n === 'sortname') return rest.filter((p) => !p.includes('=')).slice(0, 2).filter(Boolean).join(' ');
			if (['nowrap', 'nobr', 'small', 'abbr', 'nowrap begin', 'sic', 'lang'].includes(n)) return (n === 'lang' ? rest[1] : rest[0]) ?? '';
			return '';
		});
	} while (s !== prev);
	return s;
}
function clean(s) {
	s = stripRefs(s).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1'); // [[target|text]] / [[text]], before templates (links can sit inside them)
	s = stripTemplates(s);
	s = s.replace(/\[https?:\/\/\S+ ([^\]]*)\]/g, '$1'); // [url text]
	s = s.replace(/'''?/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
	s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
	return s.replace(/\s+/g, ' ').trim();
}
const lines = (raw) => raw.split(/<br\s*\/?>/i).map(clean).filter(Boolean);

// A table cell is "attrs | content" when it has attributes; split on the first lone | outside [[ ]] / {{ }}.
function splitCell(raw) {
	let depth = 0;
	for (let i = 0; i < raw.length; i++) {
		const two = raw.slice(i, i + 2);
		if (two === '[[' || two === '{{') { depth++; i++; continue; }
		if (two === ']]' || two === '}}') { depth--; i++; continue; }
		if (raw[i] === '|' && depth === 0 && raw[i + 1] !== '|') {
			const attrs = raw.slice(0, i);
			if (/^\s*'*\s*[\w-]+\s*=/.test(attrs)) return { attrs, text: raw.slice(i + 1) };
			break;
		}
	}
	return { attrs: '', text: raw };
}

// Split "a || b" (or "a !! b" in header rows) into cells, ignoring separators inside [[ ]] / {{ }}.
function splitCells(line, header) {
	const out = [];
	let depth = 0, start = 0;
	for (let i = 0; i < line.length; i++) {
		const two = line.slice(i, i + 2);
		if (two === '[[' || two === '{{') { depth++; i++; }
		else if (two === ']]' || two === '}}') { depth = Math.max(0, depth - 1); i++; }
		else if (depth === 0 && (two === '||' || (header && two === '!!'))) { out.push(line.slice(start, i)); start = i + 2; i++; }
	}
	out.push(line.slice(start));
	return out;
}

// Parse a {| ... |} wikitable into { headers, rows } with rowspans/colspans expanded.
function parseTable(src) {
	const rawRows = [];
	let cur = null;
	for (const line of src.split('\n')) {
		const t = line.trim();
		if (t.startsWith('{|') || t.startsWith('|}') || t.startsWith('|+')) continue;
		if (t.startsWith('|-')) { cur = null; continue; }
		if (!t.startsWith('|') && !t.startsWith('!')) { if (cur?.length) cur[cur.length - 1].raw += '\n' + line; continue; }
		const header = t[0] === '!';
		// Lines with no |- between them ("! Col" one per line) belong to the same row.
		if (!cur) rawRows.push((cur = []));
		for (const part of splitCells(t.slice(1), header)) cur.push({ header, raw: part });
	}
	const cells = rawRows.map((r) =>
		r.map(({ header, raw }) => {
			const { attrs, text } = splitCell(raw);
			const span = Number(/rowspan\s*=\s*"?(\d+)/.exec(attrs)?.[1] ?? 1);
			const colspan = Number(/colspan\s*=\s*"?(\d+)/.exec(attrs)?.[1] ?? 1);
			return { header, attrs, text: clean(text), raw: text, span, colspan };
		})
	);
	if (!cells.length) return { headers: [], rows: [] };
	// Some tables put the header cells and the first data row in one block (no |- after the headers).
	const first = cells.shift();
	const headerCount = first.findIndex((c, i) => i > 0 && c.header && /scope\s*=\s*"?row/.test(c.attrs));
	const headerCells = headerCount > 0 ? first.slice(0, headerCount) : first;
	if (headerCount > 0) cells.unshift(first.slice(headerCount));
	const headers = headerCells.map((c) => c.text);
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
const tablesIn = (body) => [...body.matchAll(/^\{\|[\s\S]*?^\|\}/gm)].map((m) => parseTable(m[0]));
const findCol = (headers, re) => headers.findIndex((h) => re.test(h));

// ---------- cast ----------
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = (s) => fold(s).replace(/[^a-z0-9]+/g, '');
const firstName = (name) => name.split(' ')[0];

/** The "Couples" table: [{ id, celeb, pro }] in table order. id = celebrity's last name (votes are keyed by it). */
export function parseCast(wikitext) {
	wikitext = stripComments(wikitext);
	const start = wikitext.search(/^===?\s*(Couples|Cast)\s*===?\s*$/m);
	if (start < 0) return [];
	const body = wikitext.slice(start, wikitext.indexOf('\n== ', start + 1) >>> 0 || undefined);
	const table = tablesIn(body).find((t) => findCol(t.headers, /^Celebrit/i) >= 0 && findCol(t.headers, /partner|^Pro/i) >= 0);
	if (!table) return [];
	const cCol = findCol(table.headers, /^Celebrit/i);
	const pCol = findCol(table.headers, /partner|^Pro/i);
	const cast = [];
	for (const row of table.rows) {
		const celeb = lines(row[cCol]?.raw ?? '')[0]; // All-Stars seasons add "Season 4" on a second line
		if (!celeb) continue;
		const pros = lines(row[pCol]?.raw ?? '').map((p) => p.replace(/\s*\([^)]*\)/g, '').trim()); // "Alan Bersten (Week 6)" substitutes
		cast.push({ celeb, pro: pros.join(' & ') || '' });
	}
	// id: last-name slug, or the full-name slug if two celebrities share a last name.
	const lastOf = (c) => slug(c.celeb.split(' ').at(-1));
	const counts = {};
	for (const c of cast) counts[lastOf(c)] = (counts[lastOf(c)] ?? 0) + 1;
	return cast.map((c) => ({ id: counts[lastOf(c)] > 1 ? slug(c.celeb) : lastOf(c), ...c }));
}

/** Resolve a week-table couple label ("Andy & Emma", "Conner L. & Adele") to a cast member. */
function coupleMatcher(cast) {
	return (label) => {
		const [left, right = ''] = label.split(/\s*&\s*/);
		const [first, initial] = left.split(/\s+/);
		let cands = cast.filter((c) => fold(firstName(c.celeb)) === fold(first) || fold(c.celeb) === fold(left));
		if (!cands.length) cands = cast.filter((c) => fold(c.celeb).includes(fold(left)));
		if (cands.length > 1 && initial) cands = cands.filter((c) => fold(c.celeb.split(' ').at(-1))[0] === fold(initial)[0]);
		if (cands.length > 1 && right) cands = cands.filter((c) => c.pro.split(' & ').some((p) => fold(firstName(p)) === fold(firstName(right))));
		if (cands.length === 1) {
			const c = cands[0];
			// A substitute pro for the week ("Andy & Witney") shows under that name.
			const pro = c.pro.split(' & ').find((p) => !right || fold(firstName(p)) === fold(firstName(right))) ?? right;
			return { id: c.id, celeb: c.celeb, pro };
		}
		// Not in the cast table (or ambiguous): keep the couple on the ballot under its label.
		return { id: slug(left) || slug(label), celeb: left, pro: right };
	};
}

// ---------- weeks ----------
function weekSections(wikitext) {
	const re = /^===\s*Week (\d+)\s*(?::\s*(.*?))?\s*===\s*$/gm;
	const marks = [...wikitext.matchAll(re)];
	return marks.map((m, i) => {
		const end = marks[i + 1]?.index ?? wikitext.slice(m.index).search(/\n==[^=]/) + m.index;
		return { week: Number(m[1]), night: clean(m[2] ?? ''), body: wikitext.slice(m.index + m[0].length, end > m.index ? end : undefined) };
	});
}

function normDance(d) {
	return d
		.replace(/cha-cha-cha/i, 'Cha Cha')
		.split(' ')
		.map((w) => (/^(and|&)$/i.test(w) || !w ? w : w[0].toUpperCase() + w.slice(1)))
		.join(' ');
}

function splitMusic(music) {
	// '"Song" — Artist' (artist weeks) or just '"Song"' (theme column carries the source instead).
	const m = /^"(.+?)"\s*(?:[—–-]\s*(.+))?$/.exec(music);
	return m ? { song: m[1], artist: m[2]?.trim() || undefined } : { song: music.replace(/"/g, ''), artist: undefined };
}

function extractWeek(sec, match, { season }) {
	const tables = tablesIn(sec.body).filter((t) => findCol(t.headers, /^Couple/i) >= 0 && findCol(t.headers, /^Dance/i) >= 0);
	const couples = new Map();
	const wentHome = [];
	let scored = false; // a line-up is published before the show; scores appear once it has aired
	for (const { headers, rows } of tables) {
		const col = {
			couple: findCol(headers, /^Couple/i),
			scores: findCol(headers, /score/i),
			dance: findCol(headers, /^Dance/i),
			music: findCol(headers, /music|song/i),
			result: findCol(headers, /^Result/i)
		};
		const known = new Set([...Object.values(col), ...headers.map((h, i) => (/score|^Judge/i.test(h) ? i : -1))]);
		const extraCols = headers.map((h, i) => i).filter((i) => !known.has(i));
		for (const row of rows) {
			if (!row[col.couple]?.text) continue;
			// Team/group dances list several couples (plus non-competing captains, which have no "&").
			const members = lines(row[col.couple].raw).filter((p) => p.includes('&')).map(match);
			if (!members.length) continue;
			const { song, artist } = col.music >= 0 ? splitMusic(row[col.music]?.text ?? '') : {};
			const notes = extraCols.map((i) => ({ label: headers[i], value: row[i]?.text })).filter((n) => n.value);
			const dance = normDance(row[col.dance]?.text ?? '');
			if (!dance && !song) continue;
			const perf = {
				dance,
				...(song ? { song } : {}),
				// What the card shows under the song: the artist, else the theme column (film, decade, ...).
				...(artist || notes[0] ? { songFrom: artist ?? notes[0].value } : {}),
				...(artist && notes.length ? { notes } : notes.length > 1 ? { notes: notes.slice(1) } : {})
			};
			// Judges' scores ("27 (9, 9, 9)") and the result ("Safe", "Eliminated") are spoilers: the app only
			// shows them to a phone after the room has revealed its own scores for that couple.
			const score = col.scores >= 0 ? row[col.scores]?.text ?? '' : '';
			if (/\d/.test(score)) scored = true;
			const result = col.result >= 0 ? row[col.result]?.text ?? '' : '';
			for (const m of members) {
				if (!couples.has(m.id)) couples.set(m.id, { ...m, performances: [] });
				const c = couples.get(m.id);
				if (!c.performances.some((p) => p.dance === perf.dance && p.song === perf.song)) {
					c.performances.push(perf);
					if (/\d/.test(score)) (c.judges ??= []).push(score);
				}
				if (members.length === 1 && result) c.result = result;
				if (members.length === 1 && /eliminat|withdr/i.test(result) && !wentHome.includes(m.id)) wentHome.push(m.id);
			}
		}
	}
	return {
		season,
		week: sec.week,
		night: sec.night,
		label: `Season ${season} · Episode ${sec.week}${sec.night ? ' · ' + sec.night : ''}`,
		couples: [...couples.values()],
		wentHome,
		aired: scored
	};
}

/**
 * Parse a season article.
 * @returns {{ cast, weeks: {week, night, status: 'ready'|'upcoming'|'error', aired?: boolean, couples?: number, error?: string}[], episodes: Record<number, object> }}
 *   episodes holds the full ballot for every 'ready' week.
 */
export function parseSeason(wikitext, season, { source } = {}) {
	wikitext = stripComments(wikitext);
	const cast = parseCast(wikitext);
	const match = coupleMatcher(cast);
	const weeks = [];
	const episodes = {};
	for (const sec of weekSections(wikitext)) {
		if (weeks.some((w) => w.week === sec.week)) continue;
		try {
			const ep = extractWeek(sec, match, { season });
			if (!ep.couples.length) { weeks.push({ week: sec.week, night: sec.night, status: 'upcoming' }); continue; }
			episodes[sec.week] = source ? { ...ep, source } : ep;
			weeks.push({ week: sec.week, night: sec.night, status: 'ready', aired: ep.aired, couples: ep.couples.length });
		} catch (e) {
			weeks.push({ week: sec.week, night: sec.night, status: 'error', error: String(e?.message ?? e) });
		}
	}
	return { cast, weeks, episodes };
}

export const sourceOf = (page) => ({ page: page.url, revid: page.revid, fetched: new Date().toISOString().slice(0, 10), license: LICENSE });

/** Parse one week's section (fetched on its own during a live show), matching couples to a known line-up. */
export function parseWeekSection(wikitext, season, week, couples) {
	const sec = weekSections(stripComments(wikitext)).find((w) => w.week === week);
	return sec ? extractWeek(sec, coupleMatcher(couples), { season }) : null;
}

/** Fetch one section of the season article (a few KB instead of the whole page). */
export async function fetchSection(season, matchLine, { fetchImpl = fetch, index } = {}) {
	const call = async (params) => {
		const url = new URL(API);
		url.search = new URLSearchParams({ action: 'parse', page: pageTitle(season), redirects: '1', format: 'json', formatversion: '2', ...params });
		const res = await fetchImpl(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
		if (!res.ok) throw new WikiError(`Wikipedia returned HTTP ${res.status}`);
		const data = await res.json();
		if (data.error) throw new WikiError(`Wikipedia: ${data.error.info}`, data.error.code === 'missingtitle' ? 'missing' : undefined);
		return data.parse;
	};
	if (index == null) {
		const { sections } = await call({ prop: 'sections' });
		index = sections.find((s) => matchLine.test(clean(s.line)))?.index ?? null;
		if (index == null) return null;
	}
	const parsed = await call({ prop: 'wikitext|revid', section: String(index) });
	return { index, revid: parsed.revid, wikitext: parsed.wikitext };
}

// Episode line-ups live in src/lib/episodes/s<season>e<week>.json, generated from Wikipedia by
//   node scripts/fetch-episode.mjs --week <n>
// Every episode file for the current SEASON (listed in episodes/index.js, which the script regenerates) shows up in the episode picker automatically.
// Couples eliminated at the END of an episode stay votable on that episode's ballot.
// Dance styles are per episode (an unlearned dance each week); multi-dance weeks join them with " · ".
import { CAST, SEASON as SEASON_NUMBER } from './cast.js';
import files from './episodes/index.js';

function toEpisode(data) {
	const home = new Set(data.wentHome ?? []);
	const couples = data.couples.map((entry, i) => {
		const person = CAST[entry.id];
		if (!person) throw new Error('Unknown couple ' + entry.id);
		const [first, ...more] = entry.performances;
		const dance = [first, ...more].map((p) => p.dance).filter(Boolean).join(' · ');
		return {
			...person,
			order: i + 1,
			out: false,
			wentHome: home.has(entry.id),
			dance,
			...(first?.song ? { song: first.song, songFrom: first.songFrom } : {}),
			...(first?.notes ? { notes: first.notes } : {})
		};
	});
	return { id: data.week, label: data.label, night: data.night, couples };
}

export const EPISODES = Object.fromEntries(
	Object.values(files)
		.filter((d) => d.season === SEASON_NUMBER)
		.map((d) => [d.week, toEpisode(d)])
);

export function getEpisode(id) {
	return EPISODES[Number(id)] ?? null;
}

export function episodeList() {
	return Object.values(EPISODES)
		.sort((a, b) => a.id - b.id)
		.map(({ id, label }) => ({ id, label }));
}

export const LATEST_EPISODE = Math.max(...Object.keys(EPISODES).map(Number));
const FIRST = EPISODES[Math.min(...Object.keys(EPISODES).map(Number))];
export const SEASON = FIRST.label;
export const couples = FIRST.couples;

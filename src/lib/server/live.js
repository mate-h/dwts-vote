// Live judges' scores and results for an episode that is airing: polled from the week's section of the
// season's Wikipedia article (a few KB per check), which editors update during the broadcast.
// Used by the room Durable Object (alarm, while phones are connected) and the LAN store (while phones poll).
import { fetchSection, parseWeekSection } from './wiki.js';

export const LIVE_INTERVAL_MS = 60_000;

/** Is this episode worth polling? Only one whose line-up was bundled before it aired, until it's complete. */
export const wantsLive = (ep, live) => ep?.status === 'lineup' && !live?.final;

/** Fetch the latest scores/results. `prev` is the previous result (keeps the section index). */
export async function fetchLive(ep, prev) {
	const line = new RegExp(`^Week ${ep.week}\\b`);
	let sec = await fetchSection(ep.season, line, { index: prev?.index });
	let parsed = sec && parseWeekSection(sec.wikitext, ep.season, ep.week, ep.couples);
	if (sec && !parsed && prev?.index != null) {
		// Sections were added or removed since the last check: look the index up again.
		sec = await fetchSection(ep.season, line);
		parsed = sec && parseWeekSection(sec.wikitext, ep.season, ep.week, ep.couples);
	}
	const couples = {};
	for (const c of parsed?.couples ?? []) if (c.judges || c.result) couples[c.id] = { ...(c.judges ? { judges: c.judges } : {}), ...(c.result ? { result: c.result } : {}) };
	return {
		index: sec?.index ?? null,
		revid: sec?.revid ?? null,
		checked: Date.now(),
		couples,
		wentHome: parsed?.wentHome ?? [],
		// Every couple scored and given a result: nothing more to wait for.
		final: ep.couples.length > 0 && ep.couples.every((c) => couples[c.id]?.judges && couples[c.id]?.result)
	};
}

/** True if the new check changed anything phones would see. */
export const liveChanged = (a, b) => JSON.stringify({ c: a?.couples, w: a?.wentHome }) !== JSON.stringify({ c: b?.couples, w: b?.wentHome });

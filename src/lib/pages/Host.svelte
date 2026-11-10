<script>
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { fetchVotes, callApi, roomOf } from '#lib/api.js';
	import { getProfile } from '#lib/profile.svelte.js';
	import ShareRoom from '#lib/ShareRoom.svelte';
	import Countdown from '#lib/Countdown.svelte';

	const { room } = $derived(roomOf(page));
	const show = getProfile();
	let status = $state('');
	let loaded = $state(false);
	let busy = $state(false);
	let data = $state({ episode: null, info: null, played: {}, isHost: false });
	let seasons = $state([]);
	let picked = $state(null); // season number shown in the list
	let strip = $state();

	const current = $derived(data.info);
	const season = $derived(seasons.find((s) => s.season === (picked ?? current?.season)) ?? seasons[0]);
	const playedIn = (s) => s.weeks.filter((w) => w.key && data.played?.[w.key]).length;
	const airing = (s) => s.weeks.some((w) => w.status !== 'ready');

	async function refresh() {
		try {
			data = await fetchVotes(room);
			if (data.info) show.season = data.info.season;
		} catch {
			status = 'Could not load the room.';
		}
		loaded = true;
	}

	onMount(async () => {
		const [catalog] = await Promise.all([fetch('/api/catalog').then((r) => r.json()).catch(() => null), refresh()]);
		seasons = catalog?.seasons ?? [];
		if (!seasons.length) status = 'Could not load the episode list.';
		await tick();
		strip?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
	});

	async function reset() {
		if (!confirm('Start the next round? This clears ALL votes for the current episode.')) return;
		const r = await callApi(room, 'reset');
		status = r.ok ? 'All votes cleared for this episode.' : r.status === 403 ? 'Only the host can do that.' : 'Reset failed.';
		if (r.ok) await refresh();
	}

	async function use(s, w) {
		if (!w.key || w.key === data.episode || busy) return;
		const name = `Season ${s.season} · Episode ${w.week}${w.night ? ` (${w.night})` : ''}`;
		if (!confirm(`Switch everyone to ${name}? Votes for each episode are kept separately.`)) return;
		busy = true;
		const r = await callApi(room, 'episode', { episode: w.key });
		busy = false;
		status = r.ok ? `Now scoring ${name}.` : r.status === 403 ? 'Only the host can do that.' : 'Could not switch episode.';
		if (r.ok) await refresh();
	}

	const airDate = (w) => (w.airsAt ? new Date(w.airsAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
	function meta(w) {
		if (w.status === 'upcoming') return w.airsAt ? `Airs ${airDate(w)}` : 'Not aired yet';
		if (w.status === 'lineup') return `${w.airsAt ? `Airs ${airDate(w)}` : 'Line-up announced'} · ${w.couples} couples`;
		return `${w.couples} couples`;
	}
</script>

<section class="panel">
	<h2>Host controls</h2>
	{#if room}
		<ShareRoom {room} />
	{:else}
		<p class="note">Heads up: anyone on this network who knows this URL can change the episode or reset the votes. It's a LAN party app.</p>
	{/if}

	<div class="now">
		<p class="eyebrow">Now scoring</p>
		{#if current}
			<p class="title">{current.night || `Episode ${current.week}`}</p>
			<p class="sub">Season {current.season} · Episode {current.week}{#if current.status === 'lineup'}{' · '}<span class="tag">Airs next</span>{/if}</p>
			{#if current.airsAt}<div class="cd"><Countdown airsAt={current.airsAt} /></div>{/if}
		{:else}
			<p class="title">…</p>
		{/if}
		{#if data.isHost}<button type="button" class="reset" onclick={reset}>↻ Next round</button>{/if}
	</div>
	{#if status}<p class="status" role="status">{status}</p>{/if}
	{#if loaded && !data.isHost}
		<p class="note">Only the person who created room <b>{room}</b> can switch episodes or start the next round. Ask them to do it from their phone.</p>
	{/if}
</section>

{#if data.isHost && season}
	<section class="panel picker" aria-labelledby="pick-title">
		<h2 id="pick-title">Choose an episode</h2>
		<p class="note">Every season of the US show is ready to play. Pick a season, then an episode.</p>

		<div class="seasons" bind:this={strip} role="group" aria-label="Season">
			{#each seasons as s (s.season)}
				{@const n = playedIn(s)}
				<button type="button" class={{ chip: true, on: s.season === season.season, mine: s.season === current?.season }} aria-pressed={s.season === season.season} onclick={() => (picked = s.season)}>
					<span class="num">{s.season}</span>
					{#if airing(s)}<span class="flag">Airing</span>{:else if n}<span class="flag">{n} played</span>{/if}
				</button>
			{/each}
		</div>

		<h3>Season {season.season} <small>{season.weeks.filter((w) => w.key).length} episodes{#if playedIn(season)}{' · '}{playedIn(season)} played here{/if}</small></h3>
		<ol class="weeks">
			{#each season.weeks as w (w.week)}
				{@const isNow = w.key === data.episode}
				{@const votes = w.key ? data.played?.[w.key] : 0}
				<li>
					<button type="button" class={{ week: true, now: isNow, off: !w.key }} disabled={!w.key || busy} aria-current={isNow ? 'true' : undefined} onclick={() => use(season, w)}>
						<span class="wk">{w.week}</span>
						<span class="what">
							<span class="night">{w.night || `Week ${w.week}`}</span>
							<span class="meta">{meta(w)}</span>
						</span>
						<span class="state">
							{#if isNow}<span class="pill gold">Scoring now</span>
							{:else if votes}<span class="pill">{votes} vote{votes === 1 ? '' : 's'}</span>
							{:else if w.status === 'lineup'}<span class="pill live">Airs next</span>{/if}
						</span>
					</button>
				</li>
			{/each}
		</ol>
		{#if season.source}<p class="credit">Line-ups from <a href={season.source} target="_blank" rel="noreferrer">Wikipedia</a> (CC BY-SA){#if season.fetched}, updated {season.fetched}{/if}.</p>{/if}
	</section>
{/if}

<style>
	.panel { text-align: center; padding: 1.5rem 1rem; border-radius: 18px; border: 1px solid #5a4416; background: rgba(40, 12, 20, 0.7); }
	.panel + .panel { margin-top: 1rem; }
	h2 { font-family: Georgia, serif; color: #e9c75a; margin-top: 0; }
	h3 { margin: 1.1rem 0 0.5rem; font-family: Georgia, serif; color: #fff3c4; text-align: left; font-size: 1.15rem; }
	h3 small { display: block; font-family: system-ui; font-size: 0.75rem; font-weight: 600; color: #c9b58f; }
	.note { color: #d8c39a; font-size: 0.9rem; }
	.status { color: #e9c75a; }

	.now { margin-top: 1rem; padding: 1rem; border-radius: 14px; border: 1px solid #e9c75a; background: linear-gradient(160deg, rgba(90, 20, 35, 0.8), rgba(15, 8, 10, 0.9)); }
	.eyebrow { margin: 0; color: #c9a86a; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
	.title { margin: 0.25rem 0 0; font-family: Georgia, serif; font-size: 1.35rem; color: #fff3c4; }
	.sub { margin: 0.2rem 0 0; color: #d8c39a; font-size: 0.85rem; }
	.tag { color: #e9c75a; font-weight: 700; }
	.cd { margin-top: 0.7rem; }
	.reset { margin-top: 0.9rem; min-height: 52px; width: 100%; border-radius: 999px; border: 1px solid #e9c75a; background: #7a1530; color: #fff3c4; font-size: 1.05rem; font-weight: 700; }

	/* Season strip: horizontally scrollable chips, newest first */
	.seasons { display: flex; gap: 0.45rem; overflow-x: auto; padding: 0.3rem 0.1rem 0.6rem; margin: 0 -0.2rem; scroll-snap-type: x proximity; scrollbar-width: thin; }
	.chip { flex: none; scroll-snap-align: center; display: grid; justify-items: center; align-content: center; gap: 0.1rem; min-width: 3.4rem; min-height: 3.4rem; padding: 0.3rem 0.5rem; border-radius: 14px; border: 1px solid #5a4416; background: rgba(10, 4, 6, 0.55); color: #ffe9a8; }
	.chip .num { font-family: Georgia, serif; font-size: 1.25rem; font-weight: 700; line-height: 1; }
	.chip .flag { font-size: 0.58rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #c9a86a; white-space: nowrap; }
	.chip.mine { border-color: #c9a86a; }
	.chip.on { background: linear-gradient(180deg, #e9c75a, #a8801f); border-color: #e9c75a; color: #1a0d05; }
	.chip.on .flag { color: #3a2208; }

	.weeks { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
	.week { width: 100%; display: grid; grid-template-columns: 2.4rem minmax(0, 1fr) auto; align-items: center; gap: 0.7rem; min-height: 60px; padding: 0.55rem 0.75rem; border-radius: 14px; border: 1px solid #5a4416; background: rgba(10, 4, 6, 0.45); color: #fff3c4; text-align: left; font: inherit; }
	.week:not(:disabled):hover { border-color: #c9a86a; }
	.week.now { border-color: #e9c75a; box-shadow: 0 0 14px rgba(233, 199, 90, 0.3); background: rgba(90, 20, 35, 0.6); }
	.week.off { opacity: 0.5; }
	.week:disabled:not(.now):not(.off) { opacity: 0.7; }
	.wk { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border-radius: 50%; border: 1px solid #a8801f; font-family: Georgia, serif; font-weight: 700; color: #e9c75a; }
	.now .wk { background: #e9c75a; color: #1a0d05; }
	.what { min-width: 0; display: grid; }
	.night { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.meta { color: #c9b58f; font-size: 0.78rem; }
	.pill { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px; border: 1px solid #5a4416; color: #d8c39a; font-size: 0.7rem; font-weight: 700; white-space: nowrap; }
	.pill.gold { background: #e9c75a; border-color: #e9c75a; color: #1a0d05; }
	.pill.live { border-color: #e9c75a; color: #e9c75a; }
	.credit { margin: 1rem 0 0; color: #a98e65; font-size: 0.75rem; }
	.credit a { color: #c9a86a; }

	@media (max-width: 640px) {
		.panel { border-radius: 0; border-left: none; border-right: none; }
	}
</style>

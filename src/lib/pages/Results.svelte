<script>
	import { onMount } from 'svelte';
 import PersonName from '#lib/PersonName.svelte';
	import { getProfile } from '#lib/profile.svelte.js';
	import { page } from '$app/state';
	import { fetchVotes, votersFor, roomOf } from '#lib/api.js';
	const { room } = $derived(roomOf(page));

	let data = $state({ counts: {}, avg: {}, tens: {}, sums: {}, ballots: [], total: 0, mine: null, couples: null, season: null });
	const ranked = $derived(
		(data.couples ?? [])
			.map((c) => ({ ...c, n: data.counts[c.id] ?? 0, sum: data.sums[c.id] ?? 0, hidden: data.revealed ? !data.revealed[c.id] : false }))
			.sort((a, b) => b.sum - a.sum || b.n - a.n || a.order - b.order)
	);
	const show = getProfile();
	$effect(() => { if (data.info) show.season = data.info.season; });
	onMount(() => {
		const load = async () => { try { data = await fetchVotes(room); } catch {} };
		load();
		const t = setInterval(load, 2000);
		return () => clearInterval(t);
	});
</script>

<h2>Leaderboard <small>{data.season ? data.season + " · " : ""}{data.total} votes · live</small></h2>
<ol>
	{#each ranked as c, i (c.id)}
		{@const voters = votersFor(data.ballots, c.id)}
		<li class={{ mine: data.mine?.[c.id] != null }}>
			<div class="row">
				<span class="rank">{i + 1}</span>
				<div class="main">
					<div class="headline">
						<div class="who"><div class="celeb-name"><PersonName name={c.celeb} /></div><div><PersonName name={c.pro} pro /></div></div>
						<span class="score">{c.hidden ? '—' : c.sum}</span>
					</div>
					<div class="tags">
						{#if c.dance}<span class="dance">{c.dance}</span>{/if}
						{#if c.wentHome}<span class="gone">Went home</span>{/if}
					</div>
					{#if c.song}<span class="song">“{c.song}”{#if c.songFrom}<small>{c.songFrom}</small>{/if}</span>{/if}
				</div>
			</div>
			<div class="meta">{#if data.mine?.[c.id] != null}★ Your score: {data.mine[c.id]} · {/if}{c.n} votes{#if c.hidden} · Waiting for everyone to lock in…{:else if data.tens?.[c.id]} · {data.tens[c.id]}× 10{/if}
			</div>
			{#if !c.hidden && voters.length}<div class="voters">{#each voters as v, j (j)}<span>{v.name}{#if v.score} — {v.score}{/if}</span>{/each}</div>{/if}
		</li>
	{/each}
</ol>


<style>
 .song { display:block; margin-top:0.4rem; color:#f6ead0; font-size:0.82rem; line-height:1.4; overflow-wrap:anywhere; }
 .song small { display:block; color:#c9b58f; font-size:0.72rem; }
	h2 { font-family: Georgia, serif; color: #e9c75a; text-align: center; margin: 0 0 1rem; }
	h2 small { display: block; font-size: 0.8rem; color: #b99; font-family: system-ui; font-weight: 400; }
	ol { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.7rem; }
	li { padding: 0.7rem 0.9rem; border-radius: 14px; background: rgba(40, 12, 20, 0.7); border: 1px solid #3d2a10; }
	li.mine { border-color: #e9c75a; }
	.row { display: flex; align-items: flex-start; gap: 0.6rem; }
	.rank { width: 1.8rem; height: 1.8rem; border-radius: 50%; display: grid; place-items: center; background: #f2ce61; color: #080808; font-weight: 900; font-size: 1.1rem; flex: none; }
	.main { flex: 1; min-width: 0; }
	.headline { display: flex; align-items: center; gap: 0.6rem; }
	.who { flex: 1; min-width: 0; color: #fff3c4; display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem; }
 .celeb-name { font-family: Georgia, serif; font-weight: 700; }
	.tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.3rem; }
	.dance { display: inline-block; padding: 0.12rem 0.5rem; border-radius: 999px; border: 1px solid #c9a86a; color: #e9c75a; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; }
	.gone { display: inline-block; padding: 0.12rem 0.5rem; border-radius: 999px; background: #7a1530; border: 1px solid #c45a6a; color: #ffd6dc; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; }
	.score { font-weight: 700; color: #e9c75a; flex: none; }
	.meta { font-size: 0.75rem; color: #b99; margin: 0.25rem 0 0 2.4rem; }
	.voters { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.35rem 0 0 2.4rem; }
	.voters span { padding: 0.15rem 0.55rem; border-radius: 999px; border: 1px solid #5a4416; font-size: 0.75rem; color: #f6ead0; }

	@media (max-width: 640px) {
		ol { gap: 0; }
		li {
			border-radius: 0;
			border-left: none;
			border-right: none;
		}
	}
</style>

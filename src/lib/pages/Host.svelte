<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { fetchVotes, callApi, roomOf } from '#lib/api.js';
	import ShareRoom from '#lib/ShareRoom.svelte';

	const { room } = $derived(roomOf(page));
	let status = $state('');
	let loaded = $state(false);
	let data = $state({ episode: null, season: '', episodes: [], isHost: false });

	async function refresh() {
		try {
			data = await fetchVotes(room);
		} catch {
			status = 'Could not load the room.';
		}
		loaded = true;
	}

	onMount(refresh);

	async function reset() {
		if (!confirm('Start the next round? This clears ALL votes for the current episode.')) return;
		const r = await callApi(room, 'reset');
		status = r.ok ? 'All votes cleared for this episode.' : r.status === 403 ? 'Only the host can do that.' : 'Reset failed.';
		if (r.ok) await refresh();
	}

	async function useEpisode(ep) {
		if (ep.id === data.episode) return;
		if (!confirm(`Switch to ${ep.label}? Votes for each episode are saved separately.`)) return;
		const r = await callApi(room, 'episode', { episode: ep.id });
		status = r.ok ? `Now scoring ${ep.label}.` : r.status === 403 ? 'Only the host can do that.' : 'Could not switch episode.';
		if (r.ok) data = { ...data, ...(await r.json()) };
	}
</script>

<section>
	<h2>Host controls</h2>
	{#if room}
		<ShareRoom {room} />
	{:else}
		<p>Heads up: anyone on this network who knows this URL can change the episode or reset the votes. It's a LAN party app.</p>
	{/if}
	<p class="now">Current: {data.season || '…'}</p>
	{#if !loaded}
		<p>Loading…</p>
	{:else if !data.isHost}
		<p>Only the person who created room <b>{room}</b> can switch episodes or start the next round. Ask them to do it from their phone.</p>
	{:else}
		<div class="episodes">
			{#each data.episodes ?? [] as ep (ep.id)}
				<button type="button" class={{ current: ep.id === data.episode }} onclick={() => useEpisode(ep)}>{ep.label}</button>
			{/each}
		</div>
		<button type="button" onclick={reset}>↻ Next round</button>
	{/if}
	{#if status}<p class="status">{status}</p>{/if}
</section>

<style>
	section { text-align: center; padding: 1.5rem 1rem; border-radius: 18px; border: 1px solid #5a4416; background: rgba(40, 12, 20, 0.7); }
	h2 { font-family: Georgia, serif; color: #e9c75a; margin-top: 0; }
	p { color: #d8c39a; }
	.now { color: #fff3c4; font-weight: 600; }
	.episodes { display: grid; gap: 0.6rem; margin: 1rem 0 1.2rem; }
	button { min-height: 56px; width: 100%; border-radius: 999px; border: 1px solid #e9c75a; background: #7a1530; color: #fff3c4; font-size: 1.1rem; font-weight: 700; }
	.episodes button { background: transparent; color: #ffe9a8; font-size: 0.95rem; }
	.episodes button.current { background: linear-gradient(180deg, #e9c75a, #a8801f); color: #1a0d05; }
	.status { color: #e9c75a; }

	@media (max-width: 640px) {
		section {
			border-radius: 0;
			border-left: none;
			border-right: none;
		}
	}
</style>

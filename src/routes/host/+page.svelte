<script>
	import { onMount } from 'svelte';

	let status = $state('');
	let data = $state({ episode: null, season: '', episodes: [] });

	async function refresh() {
		data = await fetch('/api/votes', { cache: 'no-store' }).then((r) => r.json());
	}

	onMount(refresh);

	async function reset() {
		if (!confirm('Start the next round? This clears ALL votes for the current episode.')) return;
		const r = await fetch('/api/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
		status = r.ok ? 'All votes cleared for this episode.' : 'Reset failed.';
		if (r.ok) await refresh();
	}

	async function useEpisode(ep) {
		if (ep.id === data.episode) return;
		if (!confirm(`Switch to ${ep.label}? Votes for each episode are saved separately.`)) return;
		const r = await fetch('/api/episode', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ episode: ep.id })
		});
		status = r.ok ? `Now scoring ${ep.label}.` : 'Could not switch episode.';
		if (r.ok) data = await r.json();
	}
</script>

<section>
	<h2>Host controls</h2>
	<p>Heads up: anyone on this network who knows this URL can change the episode or reset the votes. It's a LAN party app.</p>
	<p class="now">Current: {data.season || '…'}</p>
	<div class="episodes">
		{#each data.episodes ?? [] as ep (ep.id)}
			<button type="button" class={{ current: ep.id === data.episode }} onclick={() => useEpisode(ep)}>{ep.label}</button>
		{/each}
	</div>
	<button type="button" onclick={reset}>↻ Next round</button>
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

<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { saveHostToken } from '#lib/api.js';
	import Countdown from '#lib/Countdown.svelte';

	let code = $state('');
	let busy = $state(false);
	let message = $state('');
	let hosted = $state([]);
	let next = $state(null); // the upcoming live show

	onMount(() => {
		fetch('/api/catalog').then((r) => r.json()).then((c) => (next = c.next)).catch(() => {});
		try {
			hosted = Object.keys(localStorage).filter((k) => k.startsWith('room-host:')).map((k) => k.slice('room-host:'.length)).sort();
		} catch {}
	});

	async function create() {
		busy = true;
		message = '';
		try {
			const r = await fetch('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
			if (!r.ok) throw new Error();
			const { code, hostToken } = await r.json();
			saveHostToken(code, hostToken);
			await goto('/r/' + code + '/host');
		} catch {
			message = 'Could not create a room. Please try again.';
		} finally {
			busy = false;
		}
	}

	function join(event) {
		event.preventDefault();
		// Accept a bare code or a pasted invite link.
		const c = (code.match(/\/r\/([A-Za-z0-9]+)/)?.[1] ?? code).toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (!/^[A-HJKMNP-Z2-9]{6}$/.test(c)) { message = 'Room codes are 6 letters and numbers, like K7QX2M.'; return; }
		goto('/r/' + c);
	}
</script>

<section>
	<h2>Score the show with friends</h2>
	<p>Create a room, send the link, and everyone scores each couple from their own phone. Scores stay hidden until everyone has voted.</p>
	{#if next}
		<div class="next">
			<p class="eyebrow">Next live show</p>
			<p class="show">{next.night || `Episode ${next.week}`}</p>
			<p class="ep">Season {next.season} · Episode {next.week}</p>
			<Countdown airsAt={next.airsAt} endsAt={next.endsAt} />
		</div>
	{/if}
	<button type="button" class="primary" disabled={busy} onclick={create}>{busy ? 'Creating…' : 'Create a room'}</button>
	<p class="or">or join one</p>
	<form onsubmit={join}>
		<label for="room-code">Room code or invite link</label>
		<input id="room-code" bind:value={code} placeholder="K7QX2M" autocomplete="off" autocapitalize="characters" spellcheck="false" />
		<button type="submit" disabled={busy}>Join room</button>
	</form>
	{#if message}<p class="status" role="status">{message}</p>{/if}
	{#if hosted.length}
		<div class="mine">
			<p>Rooms you host</p>
			{#each hosted as r (r)}<a href={'/r/' + r}>{r}</a>{/each}
		</div>
	{/if}
</section>

<style>
	section { text-align: center; padding: 1.5rem 1rem; border-radius: 18px; border: 1px solid #5a4416; background: rgba(40, 12, 20, 0.7); }
	h2 { font-family: Georgia, serif; color: #e9c75a; margin-top: 0; }
	p { color: #d8c39a; }
	button { min-height: 56px; width: 100%; border-radius: 999px; border: 1px solid #e9c75a; background: transparent; color: #ffe9a8; font-size: 1.05rem; font-weight: 700; }
	button.primary { background: linear-gradient(180deg, #e9c75a, #a8801f); color: #1a0d05; font-size: 1.15rem; }
	.or { margin: 1.4rem 0 0.6rem; color: #c9b58f; font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; }
	form { display: grid; gap: 0.6rem; }
	label { color: #c9b58f; font-size: 0.85rem; }
	input { min-height: 52px; border-radius: 14px; border: 1px solid #c9a86a; background: rgba(10, 4, 6, 0.6); color: #fff3c4; font-size: 1.3rem; text-align: center; letter-spacing: 0.15em; font-family: ui-monospace, Menlo, monospace; }
	.status { color: #e9c75a; }
	.next { margin: 0 0 1.3rem; padding: 1rem; border-radius: 16px; border: 1px solid #c9a86a; background: linear-gradient(160deg, rgba(90, 20, 35, 0.8), rgba(15, 8, 10, 0.9)); }
	.next p { margin: 0; }
	.next .eyebrow { color: #c9a86a; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
	.next .show { margin-top: 0.2rem; font-family: Georgia, serif; font-size: 1.4rem; color: #fff3c4; }
	.next .ep { margin: 0.15rem 0 0.7rem; font-size: 0.85rem; }
	.mine { margin-top: 1.4rem; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; align-items: center; }
	.mine p { width: 100%; margin: 0; font-size: 0.8rem; color: #c9b58f; }
	.mine a { padding: 0.3rem 0.8rem; border-radius: 999px; border: 1px solid #c9a86a; color: #ffe9a8; font-family: ui-monospace, Menlo, monospace; text-decoration: none; }
	@media (max-width: 640px) { section { border-radius: 0; border-left: none; border-right: none; } }
</style>

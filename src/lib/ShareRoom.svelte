<script>
	let { room } = $props();
	let copied = $state(false);
	const link = $derived(typeof location === 'undefined' ? '/r/' + room : location.origin + '/r/' + room);

	async function share() {
		try {
			if (navigator.share) await navigator.share({ title: 'Star Ballot', text: `Join my Star Ballot room ${room}`, url: link });
			else await copy();
		} catch {}
	}
	async function copy() {
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {}
	}
</script>

<div class="share">
	<p class="label">Room code</p>
	<p class="code">{room}</p>
	<p class="link"><a href={link}>{link.replace(/^https?:\/\//, '')}</a></p>
	<div class="actions">
		<button type="button" onclick={share}>Invite friends</button>
		<button type="button" class="ghost" onclick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
	</div>
	<p class="hint">Anyone who opens the link joins this room and votes from their own phone.</p>
</div>

<style>
	.share { margin: 0 0 1.2rem; padding: 1rem; border-radius: 14px; border: 1px dashed #c9a86a; background: rgba(10, 4, 6, 0.5); }
	.label { margin: 0; color: #c9b58f; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; }
	.code { margin: 0.2rem 0; font-family: ui-monospace, Menlo, monospace; font-size: 2.2rem; font-weight: 800; letter-spacing: 0.25em; color: #ffe9a8; }
	.link { margin: 0 0 0.8rem; font-size: 0.85rem; overflow-wrap: anywhere; }
	.link a { color: #e9c75a; }
	.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
	button { min-height: 48px; border-radius: 999px; border: 1px solid #e9c75a; background: #7a1530; color: #fff3c4; font-size: 1rem; font-weight: 700; }
	button.ghost { background: transparent; color: #ffe9a8; }
	.hint { margin: 0.8rem 0 0; color: #c9b58f; font-size: 0.8rem; }
</style>

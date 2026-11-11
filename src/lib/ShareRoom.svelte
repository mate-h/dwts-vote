<script>
	// Invite card on the Host page. The host can name the room; the code in the link never changes.
	let { room, title = '', canEdit = false, onrename = async () => false } = $props();
	const MAX = 40; // same limit as cleanTitle() on the server
	let copied = $state(false);
	let editing = $state(false);
	let draft = $state('');
	let saving = $state(false);
	let input = $state();
	const link = $derived(typeof location === 'undefined' ? '/r/' + room : location.origin + '/r/' + room);

	async function share() {
		try {
			const text = title ? `Join "${title}" on Star Ballot (room ${room})` : `Join my Star Ballot room ${room}`;
			if (navigator.share) await navigator.share({ title: title || 'Star Ballot', text, url: link });
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

	async function edit() {
		draft = title;
		editing = true;
		await Promise.resolve();
		input?.focus();
		input?.select();
	}
	async function save(event) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		const ok = await onrename(draft);
		saving = false;
		if (ok) editing = false;
	}
	function onkeydown(event) {
		if (event.key === 'Escape') editing = false;
	}
</script>

<div class="share">
	{#if editing}
		<form class="rename" onsubmit={save}>
			<label for="room-title">Room name</label>
			<input id="room-title" bind:this={input} bind:value={draft} maxlength={MAX} placeholder="e.g. Grammy Night at Mac's" autocomplete="off" {onkeydown} />
			<p class="count">{[...draft].length}/{MAX} · leave empty to show the code</p>
			<div class="actions">
				<button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save name'}</button>
				<button type="button" class="ghost" onclick={() => (editing = false)}>Cancel</button>
			</div>
		</form>
	{:else}
		{#if title}<p class="title">{title}</p>{/if}
		<p class="label">Room code</p>
		<p class={{ code: true, small: !!title }}>{room}</p>
		{#if canEdit}<button type="button" class="link-btn" onclick={edit}>{title ? '✎ Rename room' : '✎ Name this room'}</button>{/if}
	{/if}
	<p class="link"><a href={link}>{link.replace(/^https?:\/\//, '')}</a></p>
	<div class="actions">
		<button type="button" onclick={share}>Invite friends</button>
		<button type="button" class="ghost" onclick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
	</div>
	<p class="hint">Anyone who opens the link joins this room and votes from their own phone.</p>
</div>

<style>
	.share { margin: 0 0 1.2rem; padding: 1rem; border-radius: 14px; border: 1px dashed #c9a86a; background: rgba(10, 4, 6, 0.5); }
	.title { margin: 0 0 0.5rem; font-family: Georgia, serif; font-size: 1.5rem; font-weight: 700; color: #fff3c4; overflow-wrap: anywhere; }
	.label { margin: 0; color: #c9b58f; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; }
	.code { margin: 0.2rem 0; font-family: ui-monospace, Menlo, monospace; font-size: 2.2rem; font-weight: 800; letter-spacing: 0.25em; color: #ffe9a8; }
	.code.small { font-size: 1.4rem; }
	.link-btn { min-height: 40px; margin: 0 0 0.4rem; padding: 0 0.9rem; border: none; background: none; color: #e9c75a; font-size: 0.9rem; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
	.link { margin: 0 0 0.8rem; font-size: 0.85rem; overflow-wrap: anywhere; }
	.link a { color: #e9c75a; }
	.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
	button { min-height: 48px; border-radius: 999px; border: 1px solid #e9c75a; background: #7a1530; color: #fff3c4; font-size: 1rem; font-weight: 700; }
	button.ghost { background: transparent; color: #ffe9a8; }
	.rename { margin-bottom: 0.9rem; text-align: left; }
	.rename label { display: block; margin-bottom: 0.35rem; color: #c9b58f; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
	.rename input { width: 100%; min-height: 48px; padding: 0 0.9rem; border-radius: 12px; border: 1px solid #c9a86a; background: rgba(0, 0, 0, 0.45); color: #fff3c4; font-size: 1.05rem; }
	.rename input:focus { outline: 2px solid #e9c75a; outline-offset: 1px; }
	.count { margin: 0.35rem 0 0.7rem; color: #a98e65; font-size: 0.75rem; }
	.hint { margin: 0.8rem 0 0; color: #c9b58f; font-size: 0.8rem; }
</style>

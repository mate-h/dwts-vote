<script>
	import { page } from '$app/state';
 import ProfileModal from '#lib/ProfileModal.svelte';
 import { setProfile, ProfileController } from '#lib/profile.svelte.js';
 import { roomOf, hostToken } from '#lib/api.js';
 setProfile(new ProfileController());
	let { children, data } = $props();
	const { room, base } = $derived(roomOf(page));
	let isHost = $state(false);
	$effect(() => { isHost = !!hostToken(room); });
	// Cloudflare landing page (no room yet) has no ballot to navigate.
	const showNav = $derived(!data.cloud || !!room);
	const links = $derived([
		{ href: base || '/', label: 'Vote' },
		{ href: (base || '/') + '?view=history', label: 'Look back' },
		{ href: base + '/results', label: 'Results' },
		...(room && isHost ? [{ href: base + '/host', label: 'Host' }] : [])
	]);
	const here = $derived(page.url.pathname + (page.url.searchParams.get('view') === 'history' ? '?view=history' : ''));
</script>

<svelte:head><title>Dancing with the Stars</title><meta name="theme-color" content="#0a0708" /></svelte:head>

<div class="sparkles" aria-hidden="true"></div>
<header>
	<h1><img src="/dwts-logo.png" alt="Dancing with the Stars" width="2400" height="1117" /></h1>
	<p class="sub">Season 34{#if room}{' · '}<a class="room" href={base + '/host'} title="Invite friends">Room {room}</a>{/if}</p>
</header>
<main>{@render children()}</main>
<ProfileModal />
{#if showNav}
<nav class={{ four: links.length > 3 }}>
	{#each links as l (l.href)}
		<a href={l.href} class={{active: here === l.href}}>{l.label}</a>
	{/each}
</nav>
{/if}

<style>
	:global(*) { box-sizing: border-box; }
	:global(body) {
		margin: 0; min-height: 100dvh; color: #f6ead0;
		font-family: system-ui, -apple-system, sans-serif;
		background: radial-gradient(ellipse at top, #4a0f1d 0%, #14070b 45%, #050304 100%) fixed;
	}
	.sparkles {
		position: fixed; inset: 0; pointer-events: none; opacity: 0.55;
		background-image:
			radial-gradient(1.5px 1.5px at 12% 18%, #ffe9a8, transparent),
			radial-gradient(1px 1px at 72% 12%, #fff, transparent),
			radial-gradient(2px 2px at 40% 60%, #d4af37, transparent),
			radial-gradient(1px 1px at 85% 75%, #fff, transparent),
			radial-gradient(1.5px 1.5px at 22% 85%, #ffe9a8, transparent),
			radial-gradient(1px 1px at 60% 35%, #fff, transparent);
		animation: twinkle 4s ease-in-out infinite alternate;
	}
	@keyframes twinkle { to { opacity: 0.15; } }
	header { text-align: center; padding: calc(env(safe-area-inset-top) + 0.85rem) 1rem 0.25rem; position: relative; }
	h1 { margin: 0; }
	h1 img {
		display: block;
		width: min(13rem, 52vw);
		height: auto;
		margin: 0 auto;
	}
	.sub { margin: 0.2rem 0 0; font-style: normal; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #c9a86a; }
	.sub .room { color: #ffe9a8; text-decoration: none; border-bottom: 1px dashed #c9a86a; font-family: ui-monospace, Menlo, monospace; }
	header::after { content: ''; display: block; width: 3.6rem; height: 1px; margin: 0.7rem auto 0; background: linear-gradient(90deg, transparent, #d4af37, transparent); }
	main { position: relative; max-width: 640px; margin: 0 auto; padding: 1rem 1rem calc(env(safe-area-inset-bottom) + 6rem); }
	nav {
		position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 0.5rem; justify-content: center;
		padding: 0.6rem 0.8rem calc(env(safe-area-inset-bottom) + 0.6rem);
		background: rgba(10, 5, 7, 0.92); border-top: 1px solid #5a4416; backdrop-filter: blur(8px);
	}
	nav a {
		flex: 1; min-width: 0; max-width: 200px; text-align: center; padding: 0.9rem 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 999px;
		color: #d4af37; text-decoration: none; font-weight: 600; border: 1px solid #5a4416;
	}
	nav.four a { font-size: 0.9rem; }
	nav a.active { background: linear-gradient(180deg, #e9c75a, #a8801f); color: #1a0d05; }
	@media (max-width: 640px) {
		main { padding-left: 0; padding-right: 0; }
		main > :global(:not(ul, ol, section, form)) { padding-left: 1rem; padding-right: 1rem; }
	}
</style>

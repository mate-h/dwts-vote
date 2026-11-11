<script>
	import { page } from '$app/state';
 import ProfileModal from '#lib/ProfileModal.svelte';
 import Meta from '#lib/Meta.svelte';
 import { setProfile, ProfileController } from '#lib/profile.svelte.js';
 import { roomOf, hostToken } from '#lib/api.js';
 const show = new ProfileController();
 setProfile(show);
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

<Meta />

<div class="sparkles" aria-hidden="true"></div>
<header>
	<h1><img src="/dwts-logo.png" alt="Dancing with the Stars" width="2400" height="1117" /></h1>
	<p class="sub">{show.season ? 'Season ' + show.season : 'Star Ballot'}{#if room}{' · '}<a class="room" href={base + '/host'} title="Invite friends">Room {room}</a>{/if}</p>
</header>
<main>
	{@render children()}
	<footer><a href="https://github.com/mate-h/dwts-vote" target="_blank" rel="noreferrer"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>Source on GitHub</a></footer>
</main>
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
	footer { margin-top: 2rem; text-align: center; font-size: 0.75rem; }
	footer a { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.8rem; color: #a98e65; text-decoration: none; }
	footer a:hover { color: #e9c75a; }
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

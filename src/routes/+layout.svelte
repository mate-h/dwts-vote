<script>
	import { page } from '$app/state';
 import ProfileModal from '#lib/ProfileModal.svelte';
 import { setProfile, ProfileController } from '#lib/profile.svelte.js';
 setProfile(new ProfileController());
	let { children } = $props();
	const links = [
		{ href: '/', label: 'Vote' },
		{ href: '/?view=history', label: 'Look back' },
		{ href: '/results', label: 'Results' }
	];
</script>

<svelte:head><title>Dancing with the Stars</title><meta name="theme-color" content="#0a0708" /></svelte:head>

<div class="sparkles" aria-hidden="true"></div>
<header>
	<h1><img src="/dwts-logo.png" alt="Dancing with the Stars" width="2400" height="1117" /></h1>
	<p class="sub">Season 34</p>
</header>
<main>{@render children()}</main>
<ProfileModal />
<nav>
	{#each links as l (l.href)}
		<a href={l.href} class={{active: page.url.pathname + (page.url.searchParams.get('view') === 'history' ? '?view=history' : '') === l.href}}>{l.label}</a>
	{/each}
</nav>

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
	header::after { content: ''; display: block; width: 3.6rem; height: 1px; margin: 0.7rem auto 0; background: linear-gradient(90deg, transparent, #d4af37, transparent); }
	main { position: relative; max-width: 640px; margin: 0 auto; padding: 1rem 1rem calc(env(safe-area-inset-bottom) + 6rem); }
	nav {
		position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 0.5rem; justify-content: center;
		padding: 0.6rem 0.8rem calc(env(safe-area-inset-bottom) + 0.6rem);
		background: rgba(10, 5, 7, 0.92); border-top: 1px solid #5a4416; backdrop-filter: blur(8px);
	}
	nav a {
		flex: 1; max-width: 200px; text-align: center; padding: 0.9rem 0; border-radius: 999px;
		color: #d4af37; text-decoration: none; font-weight: 600; border: 1px solid #5a4416;
	}
	nav a.active { background: linear-gradient(180deg, #e9c75a, #a8801f); color: #1a0d05; }
	@media (max-width: 640px) {
		main { padding-left: 0; padding-right: 0; }
		main > :global(:not(ul, ol, section, form)) { padding-left: 1rem; padding-right: 1rem; }
	}
</style>

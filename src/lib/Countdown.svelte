<script>
	// Counts down to a live show; "On air now" during it; renders nothing once it's over.
	// Times show in the viewer's own time zone.
	import { onMount } from 'svelte';

	let { airsAt, endsAt = null, compact = false } = $props();
	let now = $state(Date.now());
	onMount(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});

	const start = $derived(Date.parse(airsAt));
	const end = $derived(endsAt ? Date.parse(endsAt) : start + 2 * 60 * 60 * 1000);
	const left = $derived(Math.max(0, start - now));
	const live = $derived(now >= start && now < end);
	const pad = (n) => String(n).padStart(2, '0');
	const parts = $derived({
		d: Math.floor(left / 86_400_000),
		h: Math.floor(left / 3_600_000) % 24,
		m: Math.floor(left / 60_000) % 60,
		s: Math.floor(left / 1000) % 60
	});
	const when = $derived(
		Number.isFinite(start)
			? new Date(start).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
			: ''
	);
</script>

{#if Number.isFinite(start) && now < end}
	<div class={{ countdown: true, compact, live }} role="timer" aria-live="off">
		{#if live}
			<span class="dot" aria-hidden="true"></span><span class="on">On air now</span>
		{:else}
			<span class="label">Live in</span>
			<span class="clock" aria-label={`${parts.d} days ${parts.h} hours ${parts.m} minutes`}>
				{#if parts.d}<b>{parts.d}</b><small>d</small>{/if}<b>{pad(parts.h)}</b><small>h</small><b>{pad(parts.m)}</b><small>m</small><b>{pad(parts.s)}</b><small>s</small>
			</span>
			<span class="when">{when}</span>
		{/if}
	</div>
{/if}

<style>
	.countdown { display: inline-flex; flex-wrap: wrap; align-items: baseline; justify-content: center; gap: 0.15rem 0.5rem; padding: 0.45rem 0.9rem; border-radius: 999px; border: 1px solid #e9c75a; background: rgba(10, 4, 6, 0.6); color: #ffe9a8; }
	.label { color: #c9a86a; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
	.clock { font-variant-numeric: tabular-nums; white-space: nowrap; }
	.clock b { font-family: Georgia, serif; font-size: 1.35rem; color: #fff3c4; }
	.clock small { margin: 0 0.25rem 0 0.05rem; color: #c9a86a; font-size: 0.7rem; font-weight: 700; }
	.when { width: 100%; text-align: center; color: #c9b58f; font-size: 0.75rem; }
	.compact { padding: 0.25rem 0.7rem; }
	.compact .clock b { font-size: 1rem; }
	.compact .when { display: none; }
	.live { align-items: center; border-color: #ff6b81; background: rgba(122, 21, 48, 0.75); }
	.on { color: #fff3c4; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
	.dot { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: #ff3b5c; box-shadow: 0 0 0 0 rgba(255, 59, 92, 0.7); animation: pulse 1.6s ease-out infinite; }
	@keyframes pulse { to { box-shadow: 0 0 0 0.6rem rgba(255, 59, 92, 0); } }
	@media (prefers-reduced-motion: reduce) { .dot { animation: none; } }
</style>

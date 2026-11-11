<script>
	// <head> tags for search engines, AI crawlers and link previews (iMessage, WhatsApp, Slack, X, …).
	// Room links get their own title, description and invite image; rooms are kept out of search results.
	import { page } from '$app/state';

	const SITE = 'https://dwts.mateh.dev';
	const NAME = 'DWTS Star Ballot';
	const DESCRIPTION = 'Score Dancing with the Stars with friends: create a room, share the link, and everyone rates each couple from their phone while the show airs. Scores stay hidden until the whole room has voted, then compare with the judges. Free unofficial fan ballot.';

	const room = $derived(page.data.room ?? null);
	const info = $derived(page.data.roomInfo ?? null);
	const episode = $derived(info ? `Season ${info.season} · ${info.night || 'Episode ' + info.week}` : '');
	const title = $derived(room ? `Join room ${room}${episode ? ' · ' + episode : ''}` : `${NAME} · Score Dancing with the Stars with friends`);
	const description = $derived(
		room
			? `You're invited to score ${episode ? episode.replace(' · ', ', ') : 'Dancing with the Stars'} together in room ${room}. Tap the link, pick a name, and rate each couple from your phone. Scores are revealed once everyone has voted.`
			: DESCRIPTION
	);
	// Room previews always use the canonical domain, whichever host served the page.
	const url = $derived(SITE + (room ? `/r/${room}` : page.url.pathname === '/' ? '/' : page.url.pathname));
	const image = $derived(SITE + (room ? '/og-room.png' : '/og.png'));
	const imageAlt = $derived(room ? `Invitation to Dancing with the Stars watch party room ${room}` : 'Golden scoring paddles showing 8, 10 and 9 next to the words "Score every dance with your friends"');
	const indexable = $derived(!room && page.status === 200 && page.url.pathname === '/');

	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: NAME,
		url: SITE + '/',
		description: DESCRIPTION,
		applicationCategory: 'EntertainmentApplication',
		operatingSystem: 'Any (web browser)',
		browserRequirements: 'Requires JavaScript',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		image: SITE + '/og.png',
		about: { '@type': 'TVSeries', name: 'Dancing with the Stars' },
		featureList: ['Private rooms you share by link', 'Score each couple 1–10 from your phone', 'Scores hidden until everyone has voted', "Compare with the judges' scores", 'Countdown to the next live show', 'Every season of the US show'],
		codeRepository: 'https://github.com/mate-h/dwts-vote'
	}).replace(/</g, '\\u003c');
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content={indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'} />
	<link rel="canonical" href={url} />
	<meta name="theme-color" content="#0a0708" />
	<meta name="application-name" content={NAME} />
	<meta name="apple-mobile-web-app-title" content="Star Ballot" />
	<link rel="icon" href="/favicon.ico" sizes="48x48" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={NAME} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={image} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={imageAlt} />
	<meta property="og:locale" content="en_US" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
	<meta name="twitter:image:alt" content={imageAlt} />
	{#if indexable}{@html `<script type="application/ld+json">${jsonLd}</script>`}{/if}
</svelte:head>

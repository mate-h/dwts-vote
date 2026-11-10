<script>
	import Vote from '#lib/pages/Vote.svelte';
	import Landing from '#lib/pages/Landing.svelte';
	let { data } = $props();
</script>

{#if data.cloud}<Landing />{:else}<Vote />{/if}

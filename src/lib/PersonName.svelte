<script>
 import { profiles, initials } from '#lib/profiles.js';
 import { getProfile } from '#lib/profile.svelte.js';
 let { name, pro = false } = $props();
 const controller = getProfile();
 // Bios and photos were written for season 34; other seasons show initials.
 const person = $derived(controller.season === 34 ? profiles[name] : null);
</script>

<button type="button" class={{ pro }} aria-haspopup="dialog" aria-label={`About ${name}`} onclick={(event) => { event.stopPropagation(); if (person) controller.open(person); }}>
 {#if person?.photo}<img src={person.photo} alt="" width="28" height="28" loading="lazy" />{:else}<span class="avatar" aria-hidden="true">{initials(name)}</span>{/if}
 <span class="label">{#if pro}<span class="amp">&amp;</span>{/if}{name}</span>
</button>

<style>
 button { display: inline-flex; align-items: center; gap: .5rem; max-width: 100%; padding: 0; border: 0; background: none; color: #fff3c4; font: inherit; text-align: left; cursor: pointer; vertical-align: middle; white-space: nowrap; }
 .label { display: inline-flex; align-items: baseline; gap: .35em; min-width: 0; }
 button:hover .label { color: #ffe394; }
 button:focus-visible { outline: 2px solid #e9c75a; outline-offset: 3px; border-radius: 3px; }
 img, .avatar { flex: none; width: 1.65rem; height: 1.65rem; border: 1px solid #b7954b; border-radius: 50%; object-fit: cover; object-position: center 25%; }
 .avatar { display: grid; place-items: center; background: linear-gradient(145deg, #664321, #241016); color: #f2d483; font: 700 .62rem system-ui; }
 .pro { color: #d8c39a; font-family: system-ui, sans-serif; font-size: .95rem; font-weight: 500; }
 .amp { color: #a98e65; font-weight: 500; }
 @media (max-width: 360px) { button { gap: .4rem; font-size: .94em; } .pro { font-size: .82rem; } }
</style>

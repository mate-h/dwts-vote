<script>
 import { profiles, initials } from '#lib/profiles.js';
 import { getProfile } from '#lib/profile.svelte.js';
 let { couples = [] } = $props();
 const controller = getProfile();
 const first = (name) => name.split(' ')[0];
</script>

{#snippet avatar(name)}
 {@const person = controller.season === 34 ? profiles[name] : null}
 <button type="button" class="face" aria-haspopup="dialog" aria-label={`About ${name}`} onclick={() => { if (person) controller.open(person); }}>
  {#if person?.photo}<img src={person.photo} alt="" width="64" height="64" loading="lazy" />{:else}<span class="mono" aria-hidden="true">{initials(name)}</span>{/if}
  <span class="cap">{first(name)}</span>
 </button>
{/snippet}

<ol class="lineup">
 {#each couples as c (c.id)}
  <li>
   <div class="pair">{@render avatar(c.celeb)}{@render avatar(c.pro)}</div>
   <span class="style">{c.dance || 'TBA'}</span>
   {#if c.song}<span class="song">“{c.song}”{#if c.songFrom}<small>{c.songFrom}</small>{/if}</span>{/if}
  </li>
 {/each}
</ol>

<style>
 .song { max-width:100%; color:#f6ead0; font-size:0.76rem; line-height:1.4; text-align:center; overflow-wrap:anywhere; }
 .song small { display:block; margin-top:0.15rem; color:#c9b58f; font-size:0.68rem; }
 .lineup { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0.7rem; }
 li { display:flex; flex-direction:column; align-items:center; gap:0.55rem; padding:0.9rem 0.5rem; border:1px solid #5a4416; border-radius:18px; background:linear-gradient(160deg,rgba(90,20,35,0.75),rgba(15,8,10,0.9)); }
 .pair { display:flex; justify-content:center; gap:0.4rem; }
 .face { display:flex; flex-direction:column; align-items:center; gap:0.25rem; min-width:64px; padding:0; border:0; background:none; color:#d8c39a; cursor:pointer; }
 .face:focus-visible { outline:2px solid #e9c75a; outline-offset:3px; border-radius:8px; }
 img, .mono { width:64px; height:64px; border-radius:50%; border:2px solid #b7954b; object-fit:cover; object-position:center 25%; }
 .mono { display:grid; place-items:center; background:linear-gradient(145deg,#664321,#241016); color:#f2d483; font:700 1.1rem system-ui; }
 .cap { font:600 0.7rem system-ui; max-width:70px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
 .style { padding:0.2rem 0.7rem; border:1px solid #e9c75a; border-radius:999px; color:#e9c75a; font:800 0.8rem system-ui; letter-spacing:0.05em; text-transform:uppercase; text-align:center; }
</style>

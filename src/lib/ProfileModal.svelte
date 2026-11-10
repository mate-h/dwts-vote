<script>
 import { getProfile } from '#lib/profile.svelte.js';
 import { initials } from '#lib/profiles.js';
 const controller = getProfile();
 const person = $derived(controller.current);
 function trapFocus(event) {
  if (event.key !== 'Tab') return;
  const controls = [...event.currentTarget.querySelectorAll('button, a[href], [tabindex="0"]')];
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
   event.preventDefault(); last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
   event.preventDefault(); first?.focus();
  }
 }
 function mountDialog(dialog) {
  const previousFocus = document.activeElement;
  const overflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  dialog.showModal();
  dialog.querySelector('button')?.focus();
  return () => {
   dialog.close();
   document.body.style.overflow = overflow;
   if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
  };
 }
</script>

{#if person}
 <!-- svelte-ignore a11y_no_redundant_roles (Keep the explicitly requested dialog role alongside native dialog behavior.) -->
 <dialog {@attach mountDialog} role="dialog" aria-modal="true" aria-labelledby="profile-title" onkeydown={trapFocus} oncancel={(event) => { event.preventDefault(); controller.close(); }} onclick={(event) => { if (event.target === event.currentTarget) controller.close(); }}>
  <article>
   <button class="close" type="button" aria-label="Close profile" onclick={() => controller.close()}>×</button>
   <p class="eyebrow">Dancing with the Stars · Season 34 · {person.role === 'pro' ? 'Professional' : 'Contestant'}</p>
   <div class="content">
    <figure>
     {#if person.photo}<img src={person.photo} alt={person.name} width="400" height="500" />{:else}<div class="monogram" aria-label="No licensed portrait available">{initials(person.name)}</div>{/if}
     {#if person.photoCredit}<figcaption>Photo: <a href={person.photoSource} target="_blank" rel="noreferrer">{person.photoCredit}</a> · <a href={person.photoLicenseUrl} target="_blank" rel="noreferrer">{person.photoLicense}</a> · resized / cropped</figcaption>{:else}<figcaption>Portrait not available</figcaption>{/if}
    </figure>
    <div class="overview">
     <h2 id="profile-title">{person.name}</h2>
     <p class="occupation">{person.title}</p>
     <p class="bio">{person.bio}</p>
     {#if person.facts?.length}<dl>{#each person.facts as fact (fact.label)}<div><dt>{fact.label}</dt><dd>{fact.value}</dd></div>{/each}</dl>{/if}
     <p class="source">Overview adapted from <a href={person.source} target="_blank" rel="noreferrer">Wikipedia</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA</a></p>
    </div>
   </div>
  </article>
 </dialog>
{/if}

<style>
 dialog { position: fixed; inset: 0; width: 100%; max-width: none; height: 100dvh; max-height: none; margin: 0; padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom)); border: 0; background: rgba(6, 3, 5, .94); color: #f6ead0; overflow-y: auto; overscroll-behavior: contain; }
 dialog::backdrop { background: #080305e8; }
 article { position: relative; max-width: 800px; margin: 3vh auto; padding: 2rem; border: 1px solid #9d7a36; border-radius: 12px; background: linear-gradient(150deg,#3f101e,#10080c 70%); box-shadow: 0 0 40px #0008; }
 .close { position: absolute; top: .65rem; right: .65rem; display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid #ac8c48; border-radius: 50%; background: #190a10; color: #ffe394; font-size: 1.9rem; cursor: pointer; }
 .close:focus-visible { outline: 2px solid #ffe394; outline-offset: 3px; }
 .eyebrow { margin: 0 3rem 1.5rem 0; font-size: .66rem; line-height: 1.7; text-transform: uppercase; letter-spacing: .15em; color: #c9a86a; }
 .content { display: grid; grid-template-columns: minmax(0, 280px) minmax(0, 1fr); gap: 1.6rem; }
 figure { margin: 0; }
 figure img, .monogram { display: block; width: 100%; height: auto; aspect-ratio: 4/5; object-fit: cover; object-position: center 25%; border: 1px solid #7e622d; border-radius: 6px; }
 .monogram { display: grid; place-items: center; background: radial-gradient(circle,#624120,#210c15); font: 4rem Georgia, serif; color: #e9c75a; }
 figcaption, .source { font-size: .65rem; line-height: 1.5; color: #c2ad95; margin-top: .5rem; }
 a { color: #cfb776; text-underline-offset: .15em; }
 h2 { margin: 0; font: 2rem/1.12 Georgia, serif; color: #ffe394; }
 .occupation { color: #dcc38f; margin: .65rem 0 1rem; font-weight: 600; }
 .bio { line-height: 1.65; font-size: .96rem; }
 dl { border-top: 1px solid #70542a; margin: 1.3rem 0; padding-top: .6rem; font-size: .85rem; }
 dl div { display: grid; grid-template-columns: 5rem 1fr; gap: .6rem; padding: .4rem 0; }
 dt { color: #c9a86a; } dd { margin: 0; }
 @media (max-width: 600px) {
  dialog { padding: 0; background: #17080e; }
  article { min-height: 100%; margin: 0; padding: calc(env(safe-area-inset-top) + 1.1rem) 1.25rem calc(env(safe-area-inset-bottom) + 2rem); border: 0; border-radius: 0; }
  .close { top: calc(env(safe-area-inset-top) + .6rem); }
  .content { grid-template-columns: minmax(0,1fr); gap: 1.3rem; }
  figure { width: min(100%, 290px); margin-inline: auto; }
  figure img, .monogram { max-height: 40dvh; }
  h2 { font-size: 1.85rem; }
 }
</style>

<script>
 let { score, selected = false, disabled = false, onclick } = $props();
 const goldId = $props.id();
</script>

{#snippet artwork(gold)}
 <svg viewBox="0 0 100 128" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
  {#if gold}
   <defs><linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#fff0b9" /><stop offset="27%" stop-color="#c89b37" />
    <stop offset="45%" stop-color="#fff1ba" /><stop offset="68%" stop-color="#b68625" /><stop offset="100%" stop-color="#eccc79" />
   </linearGradient></defs>
  {/if}
  <g class="wings">
   <path d="M25 40 L3 26 L10 91 L24 108 Z M75 40 L97 26 L90 91 L76 108 Z" />
   <path d="M27 46 L8 35 L15 101 L28 113 Z M73 46 L92 35 L85 101 L72 113 Z" />
   <path d="M29 53 L14 46 L20 110 L31 118 Z M71 53 L86 46 L80 110 L69 118 Z" />
  </g>
  <path class="edge" d="M26 10 L74 10 L87 120 L13 120 Z" />
  <path class="board" fill={gold ? `url(#${goldId})` : '#080808'} d="M26 7 L74 7 L87 116 L13 116 Z" />
  <path class="inner-line" d="M28 10 L72 10 L84 113 L16 113 Z" />
 </svg>
 <span class="number">{score}</span>
{/snippet}

<button class={['paddle', { selected }]} {disabled} {onclick} aria-label="Score {score}" aria-pressed={selected}>
 <span class="rotor" aria-hidden="true">
  <span class="face front">{@render artwork(false)}</span>
  <span class="face back">{@render artwork(true)}</span>
 </span>
</button>

<style>
 .paddle { appearance:none; position:relative; display:block; width:100%; min-width:0; height:auto; aspect-ratio:100 / 128; padding:0; border:0; background:transparent; cursor:pointer; perspective:650px; -webkit-tap-highlight-color:transparent; }
 .rotor { position:relative; display:block; width:100%; height:100%; transform-style:preserve-3d; transform:rotateY(0deg); transition:transform 480ms cubic-bezier(.2,.7,.2,1); }
 .selected .rotor { transform:rotateY(180deg); }
 .face { position:absolute; inset:0; backface-visibility:hidden; -webkit-backface-visibility:hidden; filter:drop-shadow(0 5px 3px #0009); }
 .front { transform:translateZ(2px); color:#e8d29d; }
 .back { transform:rotateY(180deg) translateZ(2px); color:#100d07; }
 svg { width:100%; height:100%; overflow:visible; }
 .wings path { fill:#080808; stroke:#d7bd83; stroke-width:0.85; stroke-linejoin:round; vector-effect:non-scaling-stroke; }
 .edge { fill:#5b4928; stroke:#b69b63; stroke-width:0.8; vector-effect:non-scaling-stroke; }
 .board { stroke:#e8d29d; stroke-width:1.15; stroke-linejoin:round; vector-effect:non-scaling-stroke; }
 .inner-line { fill:none; stroke:#d7bd83; stroke-width:0.35; vector-effect:non-scaling-stroke; opacity:0.8; }
 .number { position:absolute; inset:0; display:grid; place-items:center; padding-top:8px; font-family:Didot,'Bodoni 72',Georgia,serif; font-size:clamp(2rem,8vw,3.2rem); font-weight:700; line-height:1; letter-spacing:-.07em; padding-right:.07em; }
 .back .number { text-shadow:0 1px #fff6; }
 .paddle:focus-visible { outline:2px solid #fff0b9; outline-offset:3px; border-radius:5px; }
 .paddle:disabled { cursor:default; }
 @media(prefers-reduced-motion:reduce) { .rotor { transition:none; } }
</style>

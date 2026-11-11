<script>
 import { onMount } from 'svelte';
 import { page } from '$app/state';
 import { goto } from '$app/navigation';
 import { getProfile } from '#lib/profile.svelte.js';
 import Countdown from '#lib/Countdown.svelte';
 import { deviceId, deviceName, votersFor, roomOf, callApi } from '#lib/api.js';
 import { subscribe } from '#lib/live.js';
 import ScorePaddle from '#lib/ScorePaddle.svelte';
 import PersonName from '#lib/PersonName.svelte';
 import Lineup from '#lib/Lineup.svelte';
 import { celebrate } from '#lib/confetti.js';
 import { playPick, playLockIn, playNext } from '#lib/sounds.js';
 const scores = [1,2,3,4,5,6,7,8,9,10];
 const { room, base } = $derived(roomOf(page));
 let data = $state({counts:{},avg:{},ballots:[],mine:{},round:null,episode:null,info:null,season:null,couples:null});
 const show = getProfile();
 $effect(() => { if (data.info) show.season = data.info.season; if (typeof data.title === 'string') show.roomTitle = data.title; });
 let myName = $state('');
 let busy = $state(false);
 let presentingId = $state(null);
 let drafts = $state({});
 let ready = $state(false);
 const history = $derived(page.url.searchParams.get('view') === 'history');
 const lineup = $derived(page.url.searchParams.get('view') === 'lineup');
 const done = $derived(page.url.searchParams.get('view') === 'done' && page.url.searchParams.get('episode') === String(data.episode));
 let editingName = $state(false);
 let draftName = $state('');
 let message = $state('');
 let revision = 0;
 const couples = $derived(data.couples ?? []);
 const night = $derived(data.info?.night ?? '');
 const epNum = $derived(data.info?.week ?? '');
 const ordered = $derived([...couples].filter(c => !c.out).sort((a,b) => a.order-b.order));
 const current = $derived(ordered.find(c => data.mine?.[c.id] == null));
 const completed = $derived(ordered.filter(c => data.mine?.[c.id] != null).length);
 const displayed = $derived(ordered.find(c => c.id === presentingId) ?? current);
 const previous = $derived(ordered.filter(c => data.mine?.[c.id] != null).toReversed());
 const list = $derived(history ? previous : displayed ? [displayed] : []);
 function remember(d) {
  if ((data.round && d.round !== data.round) || (data.episode != null && d.episode != null && d.episode !== data.episode)) { presentingId = null; drafts = {}; }
  data = d;
  ready = true;
  try { localStorage.setItem('ballot-scores:' + (room ? room + ':' : '') + deviceId(), JSON.stringify({round:d.round,mine:d.mine,currentId:presentingId})); } catch {}
 }
 onMount(() => {
  deviceName().then(n => myName = n);
  try {
   const cached = JSON.parse(localStorage.getItem('ballot-scores:' + (room ? room + ':' : '') + deviceId()) || 'null');
   if (cached) { data = {...data,round:cached.round,mine:cached.mine}; presentingId = cached.currentId ?? null; }
  } catch {}
  // Live state: pushed by the room (or polled). Ignored while this phone is saving a vote, whose own response is fresher.
  let version = revision;
  return subscribe(room, (d) => {
   if (busy || version !== revision) { version = revision; return; }
   remember(d);
  }, { onError: (e) => { message = e ? 'Connection lost. Saved scores are kept; reconnect to continue.' : message.startsWith('Connection lost') ? '' : message; } });
 });
 async function vote(id, score) {
  busy = true; if (!history) presentingId = id; revision++;
  try {
   const r = await callApi(room, 'votes', {device:deviceId(),coupleId:id,score,name:myName || await deviceName()});
   if (!r.ok) throw new Error('save');
   remember(await r.json());
   delete drafts[id];
   message = 'Voted ' + score;
   playLockIn();
   celebrate(score);
  } catch { message = 'Could not confirm your score. Please try again; you have not advanced.'; }
  finally { busy = false; }
 }
 function pick(id, score) { if (data.mine?.[id] != null) return; drafts[id] = score; playPick(); }
 function nextCouple(id) {
  playNext();
  const last = id === ordered.at(-1)?.id;
  presentingId = null;
  remember(data);
  if (last) goto((base || '/') + '?view=done&episode=' + data.episode);
 }
 let wiggleId = $state(null);
 function replaySaved(id, score) {
  if (score == null) return;
  playLockIn();
  celebrate(score);
  wiggleId = null;
  requestAnimationFrame(() => { wiggleId = id; });
 }
 async function undo(id) {
  busy = true; revision++;
  try {
   const r = await callApi(room, 'unvote', {device:deviceId(),coupleId:id});
   if (!r.ok) throw new Error('undo');
   presentingId = id; drafts = {}; remember(await r.json()); message = 'Vote undone.';
   await goto(base || '/');
  } catch { message = 'Could not undo your latest vote. Please try again.'; }
  finally { busy = false; }
 }
 async function saveName(event) {
  event.preventDefault(); busy = true; revision++;
  try {
   const r = await callApi(room, 'name', {device:deviceId(),name:draftName});
   if (!r.ok) throw new Error('save');
   const d = await r.json();
   localStorage.setItem('ballot-name',d.name);
   myName = d.name; remember(d); editingName = false; message = 'Name saved.';
  } catch { message = 'Could not save your name. Please try again.'; }
  finally { busy = false; }
 }
</script>

<div class="intro">
 <p class="episode"><span>{#if data.info}Episode {epNum}{:else}&nbsp;{/if}</span> {night}</p>
 {#if data.info?.airsAt && Date.parse(data.info.airsAt) > Date.now() - 2 * 3600_000}<div class="countdown-row"><Countdown airsAt={data.info.airsAt} compact /></div>
 {:else if data.info?.status === 'lineup'}<p class="live">Line-up announced · airs next</p>{/if}
 {#if done}
  <p class="lede">Round complete</p>
 {:else if lineup}
  <p class="lede">This round's couples, in dance order</p>
 {:else if !history}
  <p class="lede">Score each couple in dance order</p>
 {:else}
  <p class="lede">Your scores, newest first</p>
 {/if}
 <div class="toolbar">
  <button class="name-button" disabled={busy} aria-expanded={editingName} onclick={() => { draftName = myName; editingName = !editingName; }}>Voting as <b>{myName || 'Guest phone'}</b></button>
  <p class="progress">{completed} of {ordered.length}</p>
  {#if lineup}<a class="lineup-link" href={base || "/"}>← Back to voting</a>{:else}<a class="lineup-link" href={(base || "/") + "?view=lineup"}>This round</a>{/if}
 </div>
</div>
{#if editingName}
 <form class="name-editor" onsubmit={saveName}>
  <label for="display-name">Your display name</label>
  <input id="display-name" name="display-name" type="text" maxlength="64" bind:value={draftName} disabled={busy} autocomplete="nickname" />
  <button class="next" disabled={busy}>Save name</button>
  <button class="next" type="button" disabled={busy} onclick={() => editingName = false}>Cancel</button>
 </form>
{/if}
{#if message}<p class="status" role="status">{message}</p>{/if}
{#if lineup}
 {#if ready}<Lineup couples={ordered} />{:else}<p class="rule">Loading this round…</p>{/if}
{:else if !ready}
 <p class="rule">Connecting to your saved scores…</p>
{:else if done || (!history && !displayed)}
 <section class="round-complete" aria-labelledby="round-complete-title">
  <h2 id="round-complete-title">All done for this round!</h2>
  <p class="rule">Your scores are saved. Take a look at the leaderboard.</p>
  <a class="vote-action results-action" href="{base}/results">View Results →</a>
 </section>
{:else if history && !list.length}
 <p class="rule">Your earlier scores will appear here after you vote.</p>
{/if}
{#if ready && !lineup && !done}
<ul>
 {#each list as c (c.id)}
  {@const picked = data.mine?.[c.id] != null}
  {@const voters = votersFor(data.ballots,c.id)}
  {@const chosen = drafts[c.id] ?? data.mine?.[c.id]}
  {@const confirmed = picked && chosen === data.mine[c.id]}
  <li class={{ picked }}>
   <div class="names"><strong><PersonName name={c.celeb} /></strong><div class="pro-name"><PersonName name={c.pro} pro /></div>{#if c.dance}<span class="dance">{c.dance}</span>{/if}{#if c.song}<span class="song">“{c.song}”{#if c.songFrom}<small>{c.songFrom}</small>{/if}</span>{/if}</div>
   <div class="count">{data.counts[c.id] ?? 0}<small>votes{#if data.avg?.[c.id]} · avg {data.avg[c.id]}{/if}</small></div>
   {#if history || picked}
    <div
     class={['saved-paddle', { wiggling: wiggleId === c.id }]}
     onanimationend={() => { if (wiggleId === c.id) wiggleId = null; }}
    >
     <ScorePaddle score={data.mine[c.id]} selected={true} onclick={() => replaySaved(c.id, data.mine[c.id])} />
    </div>
   {:else}
    <div class="paddles" role="group" aria-label="Score {c.celeb}">
     {#each scores as score (score)}
      <ScorePaddle {score} selected={chosen === score} disabled={busy || picked} onclick={() => pick(c.id,score)} />
     {/each}
    </div>
   {/if}
   {#if data.revealed && !data.revealed[c.id]}
    {#if picked}<p class="waiting" role="status">Waiting for everyone to lock in… <span>{data.counts[c.id] ?? 0} of {data.expected?.[c.id] ?? 0} locked in</span></p>{/if}
   {:else if voters.length}<div class="voters">{#each voters as v, i (i)}<span class="chip">{v.name}{#if v.score} — {v.score}{/if}</span>{/each}</div>
   {/if}
   {#if c.judges}<p class="judges"><b>Judges {c.judgesTotal}</b> {c.judges.join(' + ')}</p>{/if}
   {#if picked}<p class="yours">Voted {data.mine[c.id]}</p>{/if}
   {#if !history && !confirmed}
    <button class={['vote-action', { awaiting: chosen == null }]} disabled={busy || chosen == null} onclick={() => vote(c.id,chosen)}>Lock In</button>
   {:else if !history}
    <button class="vote-action" disabled={busy} onclick={() => nextCouple(c.id)}>{c.id === ordered.at(-1)?.id ? 'Finish round' : 'Next couple →'}</button>
   {/if}
   {#if history && c.id === previous[0]?.id}
    <button class="undo" disabled={busy} onclick={() => undo(c.id)}>Undo latest vote</button>
   {/if}
  </li>
 {/each}
</ul>
{/if}
<style>
 .judges { grid-column:1 / -1; margin:0; color:#c9b58f; font-size:0.8rem; }
 .judges b { padding:0.12rem 0.55rem; margin-right:0.3rem; border-radius:999px; background:#e9c75a; color:#1a0d05; font-size:0.75rem; }
 .countdown-row { margin:0.5rem 0 0; }
 .live { display:inline-block; margin:0.4rem 0 0; padding:0.15rem 0.6rem; border-radius:999px; border:1px solid #e9c75a; color:#e9c75a; font-size:0.7rem; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; }
 .song { color:#f6ead0; font-size:0.88rem; line-height:1.4; overflow-wrap:anywhere; }
 .song small { display:block; color:#c9b58f; font-size:0.75rem; }
 .saved-paddle { grid-column:1 / -1; width:120px; justify-self:center; margin:0.7rem 0 0.3rem; transform-origin:50% 72%; }
 .saved-paddle.wiggling { animation: paddle-wiggle 0.55s ease-in-out; }
 @keyframes paddle-wiggle {
  0% { transform: rotate(0deg); }
  18% { transform: rotate(-8deg); }
  38% { transform: rotate(7deg); }
  58% { transform: rotate(-5deg); }
  78% { transform: rotate(3deg); }
  100% { transform: rotate(0deg); }
 }
 @media (prefers-reduced-motion: reduce) {
  .saved-paddle.wiggling { animation: none; }
 }
 .lineup-link { display:inline-flex; align-items:center; min-height:40px; padding:0 0.9rem; border:1px solid #e9c75a; border-radius:999px; color:#ffe9a8; font-size:0.85rem; font-weight:700; text-decoration:none; white-space:nowrap; }
 .toolbar { flex-wrap:wrap; }
 .waiting { grid-column:1 / -1; margin:0; text-align:center; color:#f6ead0; font-size:0.9rem; }
 .waiting span { display:block; color:#b99; font-size:0.8rem; }
 .undo { grid-column:1 / -1; min-height:48px; color:#fff0b9; background:#481426; border:1px solid #c9a86a; border-radius:12px; font:700 1rem system-ui; }
 .vote-action { grid-column:1 / -1; display:block; width:100%; min-height:56px; margin-top:1rem; border:2px solid #fff0b9; border-radius:14px; background:linear-gradient(135deg,#f8e5a0,#d7af47); color:#100d07; font:800 1.15rem system-ui; }
 .vote-action.awaiting,
 .vote-action.awaiting:disabled { background:transparent; color:#fff0b9; opacity:1; }
 .names .dance { display:block; width:fit-content; margin-top:0.3rem; padding:0.12rem 0.5rem; border-radius:999px; border:1px solid #c9a86a; color:#e9c75a; font-size:0.7rem; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; }
	.rule { text-align: center; color: #c9a86a; font-size: 0.9rem; margin: 0 0 0.6rem; }
	.intro { text-align: center; margin: 0 0 1rem; }
	.episode { margin: 0; font-family: Georgia, serif; font-size: 1.2rem; color: #fff3c4; }
	.episode span { display: block; margin-bottom: 0.15rem; font-family: system-ui; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #c9a86a; }
	.lede { margin: 0.35rem 0 0; color: #c9a86a; font-size: 0.88rem; }
	.toolbar { display: flex; align-items: center; justify-content: center; gap: 0.8rem; margin-top: 0.85rem; }
	.progress { margin: 0; color: #e9c75a; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
	.status { text-align: center; color: #e9c75a; font-size: 0.9rem; margin: 0 0 0.8rem; }
 .round-complete { margin:1.5rem 1rem; padding:1.5rem 1rem; text-align:center; border:1px solid #c9a86a; border-radius:18px; background:linear-gradient(160deg,rgba(90,20,35,0.75),rgba(15,8,10,0.9)); }
 .results-action { display:flex; align-items:center; justify-content:center; min-height:64px; padding:1rem; text-decoration:none; }
	a { color: #ffe9a8; }
	h2 { text-align:center; color:#ffe9a8; }
	 .name-button { background:transparent; color:#f6ead0; border:1px solid #a8801f; border-radius:999px; min-height:40px; padding:0.35rem 0.95rem; font:inherit; font-size:0.88rem; }
 .name-editor { display:flex; flex-wrap:wrap; gap:0.5rem; padding:0.8rem; border:1px solid #a8801f; border-radius:14px; margin-bottom:1rem; }
 .name-editor label { width:100%; color:#fff3c4; }
 .name-editor input { flex:1; min-width:0; min-height:48px; font:inherit; color:#111; background:#fff3c4; border:2px solid #e9c75a; border-radius:8px; padding:0.5rem; }

	button:disabled { opacity:0.55; }
	.next { min-height: 44px; padding: 0 1.1rem; border-radius: 999px; border: 1px solid #e9c75a; background: #7a1530; color: #fff3c4; font-weight: 700; }
	ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.8rem; }
	li {
		display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.7rem; align-items: center;
		padding: 1rem; border-radius: 18px; border: 1px solid #5a4416;
		background: linear-gradient(160deg, rgba(90, 20, 35, 0.75), rgba(15, 8, 10, 0.9));
	}
	li.picked { border-color: #e9c75a; box-shadow: 0 0 18px rgba(233, 199, 90, 0.35); }
	.names { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 0.4rem; }
	.names strong { display: block; font-family: Georgia, serif; font-size: 1.2rem; color: #fff3c4; }
 .pro-name { margin-top: 0; }
	.count { text-align: right; font-size: 1.6rem; font-weight: 700; color: #e9c75a; }
	.count small { display: block; font-size: 0.7rem; font-weight: 400; color: #b99; }
	.paddles { grid-column:1 / -1; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:0.8rem 0.45rem; padding:0.6rem 0.1rem; }
	.yours { grid-column: 1 / -1; margin: 0; text-align: center; color: #e9c75a; font-weight: 600; }
	.voters { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 0.35rem; }
	.chip { padding: 0.3rem 0.65rem; border-radius: 999px; border: 1px solid #5a4416; background: rgba(0, 0, 0, 0.35); color: #f6ead0; font-size: 0.8rem; }

 @media (max-width: 640px) {
  ul { gap: 0; }
  li, .name-editor {
   border-radius: 0;
   border-left: none;
   border-right: none;
  }
 }
</style>

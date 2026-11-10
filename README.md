# Star Ballot — A Dancing with the Stars–style vote

Fan-made LAN voting app (SvelteKit + Svelte 5, adapter-node). Not affiliated with ABC/BBC; no official logos used.

Cast: DWTS Season 34 (fall 2025), Episode 2 — One-Hit Wonders Night (Hollywood Reporter, TVLine, E!). Edit `src/lib/couples.js`.
Order: couples numbered 1–14 in Episode 2 performance order. Votes show each phone's detected device name (e.g. "iPhone — 10").
Scoring: 1–10 paddles; a 10 fires gold confetti. "Next round" (Vote + Results pages) clears all votes.
Rule: one vote per phone (localStorage device id); tap another couple to move it.
Votes persist in `data/votes.json`. `/host` resets (anyone with the URL can).

```sh
npm install && npm run build
HOST=0.0.0.0 PORT=8787 node build
# LAN URL:
echo "http://$(ipconfig getifaddr en0):8787"
```

# Star Ballot — A Dancing with the Stars–style vote

Fan-made LAN voting app (SvelteKit + Svelte 5, adapter-node). Not affiliated with ABC/BBC; no official logos used.

Cast: DWTS Season 34 (fall 2025), in `src/lib/cast.js`. Episodes 2–5 are in `src/lib/episodes/s34eNN.json`.

## Adding an episode

Episode data (performance order, dance, song, artist or theme, who went home) comes from the season's Wikipedia article:

```sh
npm run fetch:episode -- --week 6            # writes src/lib/episodes/s34e06.json
npm run fetch:episode -- --week 6 --dry-run  # print only
npm run fetch:episode -- --week 2-6          # several weeks; --all for every week
npm run build                                # then restart the server
```

Every JSON file for the season shows up in the episode picker. If a couple isn't recognised, add it to `src/lib/cast.js`.
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

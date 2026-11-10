# Star Ballot — A Dancing with the Stars–style vote

Fan-made voting app (SvelteKit + Svelte 5). Not affiliated with ABC/BBC.

It runs in two modes from the same code:

- **LAN party:** one shared ballot for everyone on your Wi-Fi, served from your Mac (`adapter-node`).
- **Online rooms:** deployed to Cloudflare Workers. Anyone can create a room, which makes them its host, and invite friends with the room link (`/r/CODE`). Each room is a Durable Object.

Scoring: 1–10 paddles, and a 10 fires gold confetti. A couple's scores stay hidden until everyone present has voted on them. Each phone casts one vote per couple (identified by a device id in localStorage). The host can switch episodes and start the next round, which clears votes.

## LAN party mode

```sh
npm install && npm run build
HOST=0.0.0.0 PORT=8787 node build
# LAN URL:
echo "http://$(ipconfig getifaddr en0):8787"
```

Votes persist in `data/votes.json`. `/host` switches episodes and resets votes. It isn't linked from the app, but anyone with the URL can use it.

## Online rooms (Cloudflare Workers)

One-time setup: sign in with `npx wrangler login`, or set `CLOUDFLARE_API_TOKEN` (a token with the *Edit Cloudflare Workers* template) and `CLOUDFLARE_ACCOUNT_ID`.

```sh
npm run cf:deploy     # builds with ADAPTER=cloudflare, then `wrangler deploy`
npm run cf:dev        # same build, served locally by wrangler (Durable Objects simulated)
node scripts/smoke-rooms.mjs http://127.0.0.1:8787   # API smoke test against cf:dev or a deployed URL
```

- `/` is the landing page: create a room or join one by code or link. LAN-only pages redirect there.
- Creating a room returns a host token, which stays in the creator's browser (`localStorage`). The Durable Object stores only its SHA-256 hash. Requests carrying the token may change the episode and reset votes, and everyone else gets 403.
- A new room starts on the latest episode. A room with no changes for 30 days deletes itself.
- Config is in `wrangler.jsonc`. The adapter writes the worker to `.svelte-kit/cloudflare/_worker.js`, and `scripts/cf-postbuild.mjs` appends the `RoomDO` export.

### Code layout

- `src/lib/server/room.js`: all voting logic (`Room`) and the API actions (`handle`). Pure JS, shared by both modes.
- `src/lib/server/store.js`: LAN mode, a single `Room` saved to `data/votes.json`.
- `worker/room-do.js`: Cloudflare mode, a `Room` per Durable Object.
- `src/lib/server/backend.js`: picks the mode from the `ROOMS` binding (via `cloudflare:workers`, which is stubbed in the node build).
- `src/lib/pages/*`: the Vote / Results / Host / Landing pages, mounted at `/…` (LAN) and `/r/[room]/…` (rooms).

## Adding an episode

Cast: DWTS Season 34 (fall 2025), in `src/lib/cast.js`. Episodes 2–5 are in `src/lib/episodes/s34eNN.json`.

Episode data (performance order, dance, song, artist or theme, who went home) comes from the season's Wikipedia article:

```sh
npm run fetch:episode -- --week 6            # writes src/lib/episodes/s34e06.json + index.js
npm run fetch:episode -- --week 6 --dry-run  # print only
npm run fetch:episode -- --week 2-6          # several weeks; --all for every week
npm run build                                # (or cf:deploy) then restart the server
```

Every episode file for the season shows up in the episode picker. If a couple isn't recognised, add it to `src/lib/cast.js`.

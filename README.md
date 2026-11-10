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
- A new room starts on the newest episode, including a line-up announced for the next show. A room with no changes for 30 days deletes itself.
- Config is in `wrangler.jsonc`. The adapter writes the worker to `.svelte-kit/cloudflare/_worker.js`, and `scripts/cf-postbuild.mjs` appends the `RoomDO` export.

### Code layout

- `src/lib/server/room.js`: all voting logic (`Room`) and the API actions (`handle`). Pure JS, shared by both modes.
- `src/lib/server/episodes.js`: the bundled episode library (`s34e06` keys) and the `/api/catalog` list for the host picker.
- `src/lib/server/store.js`: LAN mode, a single `Room` saved to `data/votes.json`.
- `worker/room-do.js`: Cloudflare mode, a `Room` per Durable Object.
- `src/lib/server/backend.js`: picks the mode from the `ROOMS` binding (via `cloudflare:workers`, which is stubbed in the node build).
- `src/lib/pages/*`: the Vote / Results / Host / Landing pages, mounted at `/…` (LAN) and `/r/[room]/…` (rooms).

## Episodes

Every season of the US show (1–35, about 350 episodes) is bundled, so hosts can pick any episode from the Host page: a season strip, then that season's episodes. Each one is marked *Scoring now*, *Airs next* (line-up announced, not aired yet) or with the number of votes it already has in this room. The data stays on the server, and phones only get the current episode.

The data comes from each season's Wikipedia article: performance order, dance, song, artist or theme, and who went home. It's stored in `src/lib/episodes/sNN.json`. To pick up new weeks of the season on air, refresh it and redeploy:

```sh
npm run fetch:episode -- --season 35          # refresh one season
npm run fetch:episode -- --season 35 --list   # show each week's status, write nothing
npm run fetch:episode -- --all                # re-download every season
npm run build                                 # (or npm run cf:deploy) then restart the server
```

The parser is in `scripts/lib/wiki.mjs`. Couples are matched to the season's cast table, and votes are keyed by the celebrity's last name. Photos and bios (`src/lib/profiles.js`) exist for season 34 only. Other seasons show initials.

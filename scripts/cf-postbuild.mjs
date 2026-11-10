// adapter-cloudflare generates the Worker entry, but the Durable Object class has to be exported
// from that same entry. Append the export (idempotently) after `vite build`.
import fs from 'node:fs';

const entry = '.svelte-kit/cloudflare/_worker.js';
const line = "export { RoomDO } from '../../worker/room-do.js';";
const src = fs.readFileSync(entry, 'utf8');
if (!src.includes(line)) fs.writeFileSync(entry, src.trimEnd() + '\n' + line + '\n');
console.log('cf-postbuild: RoomDO exported from ' + entry);

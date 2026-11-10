// adapter-cloudflare writes the Worker to wrangler's `main` (.svelte-kit/cloudflare/_worker.js). Move it to
// _sveltekit.js and make _worker.js re-export worker/entry.js, which wraps it (WebSocket routing) and exports
// the RoomDO Durable Object class.
import fs from 'node:fs';

const dir = '.svelte-kit/cloudflare';
fs.renameSync(`${dir}/_worker.js`, `${dir}/_sveltekit.js`);
fs.writeFileSync(`${dir}/_worker.js`, "export * from '../../worker/entry.js';\nexport { default } from '../../worker/entry.js';\n");
const ignore = `${dir}/.assetsignore`;
const list = fs.existsSync(ignore) ? fs.readFileSync(ignore, 'utf8') : '';
if (!list.split('\n').includes('_sveltekit.js')) fs.writeFileSync(ignore, list.trimEnd() + '\n_sveltekit.js\n');
console.log('cf-postbuild: _worker.js -> worker/entry.js (wraps _sveltekit.js)');

import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export function build() {
  const candidates = process.env.PYTHON ? [process.env.PYTHON] : ['python3','python'];
  for (const command of candidates) {
    const result = spawnSync(command, ['scripts/build.py'], {cwd:root,stdio:'inherit'});
    if (result.error?.code === 'ENOENT') continue;
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Website build failed (${result.status}).`);
    return;
  }
  throw new Error('Python 3 is required. Install it, or set PYTHON to its executable.');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) build();

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

test('preview serves the app and modules, rejects writes, and cannot serve project files', async t => {
  const script = fileURLToPath(new URL('../scripts/serve.mjs', import.meta.url));
  const child = spawn(process.execPath, [script], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  });
  const address = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview server did not become ready.')), 5000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Preview exited early (${code}).`)); });
    child.stdout.on('data', chunk => {
      const match = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timeout); resolve(match[0]); }
    });
  });
  const page = await fetch(address);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Söyle Qazaq/);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  const module = await fetch(`${address}/js/domain.mjs`);
  assert.equal(module.status, 200);
  assert.match(module.headers.get('content-type'), /javascript/);
  assert.equal((await fetch(`${address}/package.json`)).status, 404);
  assert.equal((await fetch(`${address}/unknown-file`)).status, 404);
  assert.equal((await fetch(`${address}/`, { method: 'POST' })).status, 405);
  const traversal = await fetch(`${address}/%2e%2e%5cpackage.json`);
  assert.ok([403, 404].includes(traversal.status));
});

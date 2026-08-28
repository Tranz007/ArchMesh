import fs from 'node:fs/promises';

const debugUrl = process.env.ARCHMESH_CDP_URL ?? 'http://127.0.0.1:9222/json';
const outputPath = process.argv[2] ?? '/tmp/archmesh-flow.png';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findPageTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const targets = await fetch(debugUrl).then((response) => response.json());
      const target = targets.find((entry) => entry.type === 'page' && entry.url.includes('localhost:4242'));
      if (target?.webSocketDebuggerUrl) return target;
    } catch {
      // Chrome may still be starting.
    }
    await delay(100);
  }
  throw new Error('Could not find the ArchMesh Chrome debugging target.');
}

const target = await findPageTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

await send('Page.enable');
await send('Runtime.enable');

for (let attempt = 0; attempt < 80; attempt += 1) {
  const ready = await send('Runtime.evaluate', {
    expression: `document.readyState === 'complete' && !![...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Flow off'))`,
    returnByValue: true,
  });
  if (ready.result?.value === true) break;
  if (attempt === 79) throw new Error('ArchMesh Flow control did not become ready.');
  await delay(100);
}

// Let d3 finish and the final camera fit settle so any graph-region pixel
// differences after this point come from Flow rather than layout motion.
await delay(5200);

const graphClip = {
  x: 0,
  y: 150,
  width: 1040,
  height: 650,
  scale: 1,
};

const before = await send('Page.captureScreenshot', {
  format: 'png',
  fromSurface: true,
  clip: graphClip,
});

const clicked = await send('Runtime.evaluate', {
  expression: `(() => {
    const button = [...document.querySelectorAll('button')].find((entry) => entry.textContent?.includes('Flow off'));
    if (!button) return false;
    button.click();
    return true;
  })()`,
  returnByValue: true,
});
if (clicked.result?.value !== true) throw new Error('Could not enable Flow in the browser smoke test.');

const state = await send('Runtime.evaluate', {
  expression: `[...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Flow on'))`,
  returnByValue: true,
});
if (state.result?.value !== true) throw new Error('Flow button did not enter the on state.');

let after;
for (let attempt = 0; attempt < 8; attempt += 1) {
  await delay(220);
  after = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    clip: graphClip,
  });
  if (after.data !== before.data) break;
}

if (!after || after.data === before.data) {
  throw new Error('Flow was enabled but the settled graph region never changed visually.');
}

await fs.writeFile(outputPath, Buffer.from(after.data, 'base64'));
socket.close();

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

let child;
let baseUrl;
let adminToken;
let reviewId;
let temporaryDirectory;

async function availablePort() {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function jsonRequest(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, options);
  return { response, body: await response.json() };
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited during startup with ${child.exitCode}.`);
    try {
      const response = await fetch(`${baseUrl}/api/reviews`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error('Server did not become ready in time.');
}

test.before(async () => {
  const port = await availablePort();
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'vel-aari-test-'));
  adminToken = 'test-admin-token-that-is-long-enough-for-tests';
  baseUrl = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      APP_URL: baseUrl,
      ADMIN_TOKEN: adminToken,
      DATA_DIRECTORY: path.join(temporaryDirectory, 'reviews'),
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  await waitForServer();
});

test.after(async () => {
  if (child && child.exitCode === null) {
    child.kill();
    await once(child, 'exit');
  }
  if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

test('customer ratings remain private until approved', async () => {
  const submitted = await jsonRequest('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Happy Customer', rating: 5, text: 'Beautiful handwork and thoughtful service.' }),
  });
  assert.equal(submitted.response.status, 201);
  assert.equal((await jsonRequest('/api/reviews')).body.count, 0);

  const moderation = await jsonRequest('/api/studio/reviews', { headers: { 'x-studio-admin-token': adminToken } });
  reviewId = moderation.body.reviews[0].id;
  const approved = await jsonRequest(`/api/studio/reviews/${reviewId}/moderate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-studio-admin-token': adminToken },
    body: JSON.stringify({ status: 'approved' }),
  });
  assert.equal(approved.response.status, 200);
  const publicReviews = await jsonRequest('/api/reviews');
  assert.equal(publicReviews.body.count, 1);
  assert.equal(publicReviews.body.average, 5);
});

test('studio review API rejects requests without the admin token', async () => {
  const { response } = await jsonRequest('/api/studio/reviews');
  assert.equal(response.status, 401);
});

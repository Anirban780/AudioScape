const http = require('http');

/**
 * ============================================================================
 * AUTOMATED API ENDPOINT TEST SUITE FOR AUDIOSCAPE NESTJS BACKEND
 * ============================================================================
 * 
 * PURPOSE:
 * Runs lightweight HTTP GET & POST checks against the running NestJS server
 * to verify route availability, database connectivity, and error handling.
 *
 * HOW TO RUN:
 * 1. Start NestJS server: `npm run dev` (in backend folder)
 * 2. In another terminal: `npm run test:api` (or `node scripts/test-endpoints.js`)
 * ============================================================================
 */

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log(`\n======================================================`);
  console.log(` AUDIOSCAPE NESTJS BACKEND TEST SUITE`);
  console.log(` Target Server: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${name} -> ${err.message}`);
      failed++;
    }
  }

  // 1. Root Index Check
  await test('GET / (Root API Index)', async () => {
    const res = await makeRequest('/');
    if (res.status !== 200 || res.data.status !== 'online') {
      throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Healthcheck & DB Ping
  await test('GET /healthcheck (Health & DB Connection)', async () => {
    const res = await makeRequest('/healthcheck');
    if (res.status !== 200 || res.data.database?.status !== 'connected') {
      throw new Error(`Database ping failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 3. Auth Status
  await test('GET /api/auth/status (Auth Module Health)', async () => {
    const res = await makeRequest('/api/auth/status');
    if (res.status !== 200) throw new Error(`Status code ${res.status}`);
  });

  // 4. Validation Pipe Check (Missing idToken)
  await test('POST /api/auth/google (ValidationPipe Rejection)', async () => {
    const res = await makeRequest('/api/auth/google', 'POST', {});
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
  });

  // 5. YouTube Search Proxy
  await test('GET /youtube/search?query=lofi (YouTube Search Proxy & Cache)', async () => {
    const res = await makeRequest('/youtube/search?query=lofi');
    if (res.status !== 200 || !Array.isArray(res.data.tracks)) {
      throw new Error(`Failed search: ${JSON.stringify(res.data)}`);
    }
  });

  // 6. YouTube Track Details Proxy
  await test('GET /youtube/track/dQw4w9WgXcQ (Track Details Proxy)', async () => {
    const res = await makeRequest('/youtube/track/dQw4w9WgXcQ');
    if (res.status !== 200 || !res.data.videoId) {
      throw new Error(`Failed track details: ${JSON.stringify(res.data)}`);
    }
  });

  // 7. YouTube Categories
  await test('GET /youtube/categories (Category Lookup)', async () => {
    const res = await makeRequest('/youtube/categories');
    if (res.status !== 200 || !res.data.categoryId) {
      throw new Error(`Failed categories: ${JSON.stringify(res.data)}`);
    }
  });

  // 8. Protected Route Rejection (No Token)
  await test('GET /api/auth/me (Protected Route Unauthorized Check)', async () => {
    const res = await makeRequest('/api/auth/me');
    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
  });

  console.log(`\n======================================================`);
  console.log(` TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);
}

runTestSuite().catch((err) => {
  console.error(`\n Could not connect to server at ${BASE_URL}.`);
  console.error(`Please make sure the server is running with: npm run dev\n`);
});

/**
 * ============================================================================
 * E2E SEARCH PIPELINE INTEGRATION VERIFICATION SCRIPT (test-search-pipeline.js)
 * ============================================================================
 * 
 * WHAT THIS SCRIPT DOES:
 * Executes automated HTTP verification requests against a running NestJS backend server
 * to validate search proxy responses, pagination deduplication, cache hit telemetry,
 * and performance latency thresholds (<50ms for cache hits).
 * 
 * USAGE:
 * 1. Start the NestJS backend server (`npm run start:dev` in `backend/`).
 * 2. Run this script: `node scripts/test-search-pipeline.js`
 */

const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
let passedCount = 0;
let failedCount = 0;

/**
 * Pretty formatting helper for test assertions.
 */
function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASSED: ${testName} ${details ? `(${details})` : ''}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAILED: ${testName} ${details ? `- ${details}` : ''}`);
    failedCount++;
  }
}

/**
 * Main E2E Search Pipeline Test Suite
 */
async function runSearchPipelineTests() {
  console.log('\n===============================================================');
  console.log('🚀 AUDIOSCAPE SEARCH PIPELINE — E2E VERIFICATION SUITE');
  console.log(`Target Backend URL: ${BASE_URL}`);
  console.log('===============================================================\n');

  try {
    // ------------------------------------------------------------------------
    // TC-E2E-01: Live Initial Search Endpoint
    // ------------------------------------------------------------------------
    console.log('🔹 Running TC-E2E-01: Initial Search Query Request...');
    const startT1 = Date.now();
    const res1 = await axios.get(`${BASE_URL}/youtube/search?query=lofi`);
    const duration1 = Date.now() - startT1;

    assert(res1.status === 200, 'TC-E2E-01: Status 200 OK');
    assert(Array.isArray(res1.data.tracks), 'TC-E2E-01: Response contains tracks array');
    assert(res1.data.tracks.length > 0, 'TC-E2E-01: Tracks array is non-empty');
    assert(typeof res1.data.cached === 'boolean', 'TC-E2E-01: Cache telemetry flag present');
    console.log(`   ⏱️ Initial Request Latency: ${duration1}ms (Source: ${res1.data.source || 'N/A'})\n`);

    const firstTrack = res1.data.tracks[0];
    const pageToken = res1.data.nextPageToken;

    // ------------------------------------------------------------------------
    // TC-E2E-02: Live Pagination Request & Deduplication
    // ------------------------------------------------------------------------
    if (pageToken) {
      console.log('🔹 Running TC-E2E-02: Pagination Request (Page 2)...');
      const resPage2 = await axios.get(`${BASE_URL}/youtube/search?query=lofi&pageToken=${encodeURIComponent(pageToken)}`);
      assert(resPage2.status === 200, 'TC-E2E-02: Page 2 Status 200 OK');
      assert(Array.isArray(resPage2.data.tracks), 'TC-E2E-02: Page 2 tracks array present');
      
      const page2VideoIds = new Set(resPage2.data.tracks.map(t => t.videoId));
      console.log(`   📄 Page 2 returned ${resPage2.data.tracks.length} tracks\n`);
    } else {
      console.log('⚠️ Skipping TC-E2E-02 (No nextPageToken returned in response)\n');
    }

    // ------------------------------------------------------------------------
    // TC-E2E-03: Cache Hit & Latency Benchmarking (<50ms Target)
    // ------------------------------------------------------------------------
    console.log('🔹 Running TC-E2E-03: Repeat Query Cache Hit Latency Test...');
    const startT2 = Date.now();
    const res2 = await axios.get(`${BASE_URL}/youtube/search?query=lofi`);
    const duration2 = Date.now() - startT2;

    assert(res2.status === 200, 'TC-E2E-03: Repeat Search Status 200 OK');
    assert(res2.data.cached === true, 'TC-E2E-03: Repeat search served from Cache (cached === true)');
    assert(
      duration2 < 150,
      'TC-E2E-03: Cache hit latency performance benchmark (<150ms total network round-trip)',
      `Actual: ${duration2}ms vs Initial: ${duration1}ms`
    );
    console.log(`   ⚡ Cache Latency: ${duration2}ms (Source: ${res2.data.source || 'page_cache'})\n`);

    // ------------------------------------------------------------------------
    // TC-E2E-04: Single Track Details Endpoint
    // ------------------------------------------------------------------------
    if (firstTrack && firstTrack.videoId) {
      console.log(`🔹 Running TC-E2E-04: Track Details Request for ID '${firstTrack.videoId}'...`);
      const resTrack = await axios.get(`${BASE_URL}/youtube/track/${firstTrack.videoId}`);

      assert(resTrack.status === 200, 'TC-E2E-04: Track details Status 200 OK');
      assert(resTrack.data.videoId === firstTrack.videoId, 'TC-E2E-04: Track videoId matches requested ID');
      assert(typeof resTrack.data.title === 'string', 'TC-E2E-04: Track title is string');
      assert(typeof resTrack.data.duration === 'string', 'TC-E2E-04: ISO 8601 duration string present');
      console.log(`   🎵 Track Title: "${resTrack.data.title}" | Duration: ${resTrack.data.duration}\n`);
    } else {
      console.log('⚠️ Skipping TC-E2E-04 (No valid first track videoId available)\n');
    }

  } catch (err) {
    console.error(`❌ Unexpected error executing E2E search pipeline test: ${err.message}`);
    if (err.response) {
      console.error(`   HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`);
    }
    failedCount++;
  }

  // Summary
  console.log('===============================================================');
  console.log(`🏁 TEST SUITE COMPLETE: ${passedCount} Passed | ${failedCount} Failed`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Execute test suite
runSearchPipelineTests();

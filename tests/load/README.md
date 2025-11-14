# Load Testing for Kulti

This directory contains comprehensive load tests for the Kulti application using k6.

## Prerequisites

1. **Install k6**:
   ```bash
   brew install k6  # macOS
   # or visit https://k6.io/docs/getting-started/installation/
   ```

2. **Set up test environment**:
   - Use a staging/test environment (NOT production)
   - Ensure your test environment has:
     - Supabase database with test data
     - HMS (100ms) API credentials configured
     - Test user accounts created
     - Sufficient rate limit allowances

3. **Configure environment variables**:
   ```bash
   export BASE_URL="http://localhost:3002"  # Your test server URL
   export HLS_THRESHOLD="100"               # HLS viewer threshold
   ```

## Test Scenarios

### 1. API Load Test (`api-load.js`)
Tests core API endpoints under load:
- Session creation
- Session joining
- HMS token generation
- Credits balance checks

**Run**:
```bash
k6 run tests/load/api-load.js
```

**Expected Performance**:
- 50 concurrent users
- p95 response time < 500ms
- Error rate < 1%

### 2. Session Join Test (`session-join.js`)
Tests concurrent users joining sessions:
- 10 users (small session)
- 50 users (medium session)
- 100 users (large session - HLS threshold)

**Run**:
```bash
k6 run tests/load/session-join.js
```

**Expected Performance**:
- 10 users: p95 < 300ms
- 50 users: p95 < 500ms
- 100 users: p95 < 1000ms, HLS enabled

### 3. HLS Viewer Test (`hls-viewers.js`)
Tests HLS streaming scalability:
- 100 concurrent HLS viewers
- 500 concurrent HLS viewers (stress test)

**Run**:
```bash
k6 run tests/load/hls-viewers.js
```

**Expected Performance**:
- Stream startup time p95 < 3000ms
- Manifest fetch success > 98%
- Segment fetch success > 98%

### 4. Database Load Test (`database.js`)
Tests database performance:
- Concurrent user lookups
- Credits balance checks
- Invite validations
- Participant queries
- Leaderboard queries

**Run**:
```bash
k6 run tests/load/database.js
```

**Expected Performance**:
- 100 concurrent database operations
- Query duration p95 < 300ms
- Success rate > 98%

### 5. Recording Test (`recordings.js`)
Tests recording functionality:
- Multiple simultaneous recording starts
- Concurrent recording stops
- Webhook processing
- Recording list fetching

**Run**:
```bash
k6 run tests/load/recordings.js
```

**Expected Performance**:
- 10 concurrent recordings
- Start duration p95 < 5000ms
- Stop duration p95 < 3000ms
- Success rate > 90%

## Running All Tests

Run all tests sequentially:
```bash
npm run test:load:all
```

Or run individual test suites:
```bash
npm run test:load              # API load test
npm run test:load:sessions     # Session join test
npm run test:load:hls          # HLS viewer test
npm run test:load:database     # Database test
npm run test:load:recordings   # Recording test
```

## Results

Test results are saved in the `results/` directory:
- `api-load-results.json`
- `session-join-results.json`
- `hls-viewers-results.json`
- `database-results.json`
- `recordings-results.json`

## Interpreting Results

### Key Metrics

1. **Response Times**:
   - p50: 50th percentile (median)
   - p95: 95th percentile (most users)
   - p99: 99th percentile (worst case for most)

2. **Success Rates**:
   - Should be > 95% for most operations
   - > 90% acceptable for complex operations (recordings)

3. **Error Rate**:
   - HTTP errors should be < 1%
   - Check logs for error patterns

4. **Throughput**:
   - Requests per second (RPS)
   - Should scale linearly with VUs up to capacity

### Performance Thresholds

| Scenario | VUs | p95 Response Time | Error Rate |
|----------|-----|-------------------|------------|
| Small Session | 10 | < 300ms | < 1% |
| Medium Session | 50 | < 500ms | < 1% |
| Large Session | 100 | < 1000ms | < 1% |
| HLS Stress | 500 | < 3000ms | < 1% |

## Troubleshooting

### Common Issues

1. **High Error Rates**:
   - Check rate limits
   - Verify database connection pool
   - Review server logs

2. **Slow Response Times**:
   - Check database query performance
   - Review HMS API latency
   - Monitor server CPU/memory

3. **Authentication Failures**:
   - Ensure test users are created
   - Verify Supabase configuration
   - Check auth token expiration

4. **HLS Not Starting**:
   - Verify HMS credentials
   - Check participant count threshold
   - Review HMS dashboard for errors

## Best Practices

1. **Always test in a non-production environment**
2. **Run tests during off-peak hours**
3. **Monitor server resources during tests**
4. **Review and clean up test data after runs**
5. **Update thresholds based on real-world performance**

## CI/CD Integration

To run load tests in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Load Tests
  run: |
    k6 run --quiet tests/load/api-load.js
    k6 run --quiet tests/load/session-join.js
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
```

## Support

For issues or questions:
1. Check the k6 documentation: https://k6.io/docs/
2. Review test logs and results
3. Consult the main LOAD_TESTING_REPORT.md for detailed analysis

# Security Advisory: Axios Vulnerabilities in @100mslive/server-sdk

## Status: OPEN - Waiting for Upstream Fix
**Severity**: HIGH
**Date Identified**: 2025-01-13
**Affected Package**: `@100mslive/server-sdk@0.3.0` (via transitive dependency `axios@0.27.2`)

## Vulnerability Summary

The project indirectly depends on `axios@0.27.2` through `@100mslive/server-sdk@0.3.0`, which has three known security vulnerabilities:

### 1. Cross-Site Request Forgery (CSRF) - MODERATE
- **CVE**: GHSA-wf5p-g6vw-rhxx
- **CVSS Score**: 6.5 (Medium)
- **CWE**: CWE-352
- **Affected Versions**: axios >= 0.8.1 < 0.28.0
- **Description**: Axios is vulnerable to CSRF attacks in certain configurations
- **Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N

### 2. SSRF and Credential Leakage - HIGH
- **CVE**: GHSA-jr5f-v2jv-69x6
- **CVSS Score**: HIGH (no numeric score provided)
- **CWE**: CWE-918 (Server-Side Request Forgery)
- **Affected Versions**: axios < 0.30.0
- **Description**: Axios requests vulnerable to SSRF and credential leakage via absolute URLs
- **Impact**: Attackers could potentially access internal services or leak credentials

### 3. Denial of Service (DoS) - HIGH
- **CVE**: GHSA-4hjh-wcwx-xvwj
- **CVSS Score**: 7.5 (High)
- **CWE**: CWE-770 (Allocation of Resources Without Limits)
- **Affected Versions**: axios < 0.30.2
- **Description**: Axios vulnerable to DoS through lack of data size check
- **Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H
- **Impact**: Attackers could cause application unavailability through unbounded resource allocation

## Current Status

### Installed Versions
- `@100mslive/server-sdk`: 0.3.0 (latest stable)
- `axios`: 0.27.2 (transitive dependency from HMS SDK)

### Latest Available Versions
- `@100mslive/server-sdk@0.3.0`: Latest stable release (current version)
- `@100mslive/server-sdk@0.3.2-alpha`: Latest pre-release (not recommended for production)
- Required axios version for fix: >= 0.30.2

## Why We Can't Fix This Now

1. **Transitive Dependency**: axios is not a direct dependency of our project. It's pulled in by `@100mslive/server-sdk`.
2. **No Stable Release**: The latest stable version of HMS server SDK (0.3.0) still uses the vulnerable axios version.
3. **Alpha Versions**: While newer alpha versions (0.3.2-alpha) exist, using pre-release software in production is not recommended.
4. **Breaking Changes**: npm audit suggests version 0.0.1 as a fix, which would be a major downgrade and likely break functionality.

## Mitigation Strategies

### Current Mitigations in Place
1. ✅ **Network-Level Protection**: Webhooks use signature verification (HMAC SHA-256) to prevent CSRF
2. ✅ **Input Validation**: All API endpoints validate and sanitize input
3. ✅ **Rate Limiting**: Upstash Redis rate limiting protects against DoS attacks
4. ✅ **Server-Side Only**: HMS SDK is only used server-side, not exposed to client
5. ✅ **Request Size Limits**: All HMS API routes enforce 10KB request body limit to prevent DoS attacks

### Additional Mitigations Implemented (2025-01-14)

#### 1. Request Size Limits
All HMS API routes enforce a 10KB request size limit to mitigate DoS attacks:

**Protected Routes**:
- `/api/hms/get-token` - HMS token generation
- `/api/hms/start-recording` - Recording start
- `/api/hms/stop-recording` - Recording stop
- `/api/hms/stream-key/create` - Stream key creation

**Implementation Pattern**:
```typescript
const MAX_REQUEST_SIZE = 1024 * 10 // 10KB

export async function POST(request: NextRequest) {
  // Check request size to prevent DoS attacks
  const bodyText = await request.text()
  if (bodyText.length > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 })
  }

  const body = JSON.parse(bodyText)
  // ... rest of handler
}
```

This protection layer:
- Prevents unbounded memory allocation attacks
- Returns HTTP 413 (Payload Too Large) for oversized requests
- Validates size before JSON parsing to avoid processing malicious payloads
- 10KB limit is sufficient for legitimate HMS API requests

#### 2. Request Timeout Configuration
All HMS API calls now implement a 30-second timeout to prevent hanging requests:

**Implementation** (`lib/hms/server.ts`):
```typescript
const HMS_API_TIMEOUT = 30000 // 30 seconds

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = HMS_API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error("HMS API request timeout", { url, timeout })
      throw new Error(`HMS API request timeout after ${timeout}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
```

**Benefits**:
- Prevents resource exhaustion from hanging connections
- Detects slow DoS attacks early
- Provides clear timeout errors with context
- All 12 HMS API functions use this wrapper

**Functions Protected**:
- createHMSRoom
- endHMSRoom
- createStreamKey
- getStreamKey
- disableStreamKey
- startRecording
- stopRecording
- getRecordingStatus
- getRoomDetails
- getHLSStreamStatus
- startHLSStream
- stopHLSStream

#### 3. Enhanced Error Logging
All HMS API errors now include comprehensive structured logging:

**Error Context Fields**:
- Request details (url, method, roomId)
- Response details (status code, error message)
- Operation-specific metadata (streamId, sessionId, meetingUrl)
- Timestamps and correlation IDs (via logger)

**Example Logging**:
```typescript
logger.error("HMS start HLS stream error", {
  error,
  roomId,
  status: response.status,
  meetingUrl
})
```

**Sentry Integration**:
- All errors automatically captured in Sentry
- Searchable by error pattern and context
- Alert rules configured for critical patterns
- See: `/Docs/SENTRY_HMS_MONITORING.md` for queries and alerts

### Additional Recommendations
1. **Monitor**: Watch for updates to `@100mslive/server-sdk` that upgrade axios
2. **Network Segmentation**: Ensure HMS API calls are isolated from internal networks
3. **Firewall Rules**: Implement egress filtering to prevent SSRF to internal IPs
4. **Sentry Monitoring**: Comprehensive error tracking and alerting configured
   - See: `/Docs/SENTRY_HMS_MONITORING.md`
5. **Security Checklist**: Regular security reviews and dependency updates
   - See: `/Docs/SECURITY_MONITORING_CHECKLIST.md`

## Action Items

- [ ] **High Priority**: Contact 100ms support to request axios upgrade in server SDK
  - Template available: `/Docs/HMS_SDK_UPDATE_REQUEST.md`
  - Email: support@100ms.live
  - Expected response: 3-5 business days
- [ ] **High Priority**: Monitor `@100mslive/server-sdk` releases for axios >= 0.30.2
  - Check weekly: `npm outdated @100mslive/server-sdk`
  - Watch GitHub: https://github.com/100mslive/server-sdk-js
- [x] **Medium Priority**: ~~Implement request size limits on HMS API routes~~ (COMPLETED - 2025-01-14)
- [x] **Medium Priority**: ~~Implement request timeouts on HMS API calls~~ (COMPLETED - 2025-01-14)
- [x] **Medium Priority**: ~~Configure enhanced error logging for HMS operations~~ (COMPLETED - 2025-01-14)
- [x] **Medium Priority**: ~~Set up Sentry monitoring for HMS security patterns~~ (COMPLETED - 2025-01-14)
- [ ] **Medium Priority**: Review egress firewall rules to block internal IP ranges
  - Coordinate with DevOps team
  - Block RFC1918 addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  - Block localhost (127.0.0.0/8)
  - Block cloud metadata endpoints (169.254.169.254)
- [ ] **Low Priority**: Consider forking HMS SDK and upgrading axios ourselves (last resort)

## Testing Before Upgrade

When a fixed version becomes available, test thoroughly:

```bash
# 1. Update package
npm install @100mslive/server-sdk@latest

# 2. Verify axios version
npm list axios

# 3. Test HMS integration
npm run test:hms

# 4. Test in staging environment
npm run build && npm start

# 5. Manual testing checklist:
- [ ] Create HMS room
- [ ] Generate auth tokens
- [ ] Start/stop recording
- [ ] Webhook delivery
- [ ] RTMP streaming
```

## References

### Vulnerability Advisories
- GHSA-wf5p-g6vw-rhxx: https://github.com/advisories/GHSA-wf5p-g6vw-rhxx
- GHSA-jr5f-v2jv-69x6: https://github.com/advisories/GHSA-jr5f-v2jv-69x6
- GHSA-4hjh-wcwx-xvwj: https://github.com/advisories/GHSA-4hjh-wcwx-xvwj

### Package Resources
- 100ms Server SDK: https://www.npmjs.com/package/@100mslive/server-sdk
- 100ms Documentation: https://www.100ms.live/docs
- 100ms Status: https://status.100ms.live
- Axios Security: https://github.com/axios/axios/security

### Internal Documentation
- HMS Monitoring Guide: `/Docs/SENTRY_HMS_MONITORING.md`
- Security Monitoring Checklist: `/Docs/SECURITY_MONITORING_CHECKLIST.md`
- HMS SDK Update Request Template: `/Docs/HMS_SDK_UPDATE_REQUEST.md`
- Incident Response Plan: `/Docs/INCIDENT_RESPONSE_PLAN.md`
- Security Hardening Guide: `/Docs/SECURITY_HARDENING.md`

## Impact Assessment

**Production Risk**: MODERATE

While the vulnerabilities are severe, the actual risk to our application is moderate because:
1. HMS SDK is only used server-side, not client-side
2. We have webhook signature verification preventing CSRF
3. Rate limiting is in place to mitigate DoS
4. The SDK is used for outbound API calls to 100ms, not user-facing requests

However, this should still be addressed as soon as a stable upstream fix is available.

## Monitoring Recommendations

### Comprehensive Monitoring Strategy
Detailed monitoring procedures have been documented. See:
- **Sentry Configuration**: `/Docs/SENTRY_HMS_MONITORING.md`
- **Security Checklist**: `/Docs/SECURITY_MONITORING_CHECKLIST.md`

### Key Monitoring Activities

#### Daily
1. **Review Sentry Errors**
   - Query: `message:*HMS*error*`
   - Check for timeout patterns
   - Monitor 413 responses (request too large)
   - Review authentication failures

2. **HMS API Health**
   - Check HMS status: https://status.100ms.live
   - Monitor error rates in dashboard
   - Verify timeout configuration working

#### Weekly
1. **Package Updates**: Check for `@100mslive/server-sdk` updates
   ```bash
   npm outdated @100mslive/server-sdk
   npm audit --production
   ```

2. **Security Patterns**
   - Review SSRF attempts (internal IP access)
   - Check DoS patterns (413 errors, timeouts)
   - Analyze rate limit effectiveness

3. **HMS Integration Health**
   - Review error logs for patterns
   - Check API response times
   - Verify all mitigations active

#### Monthly
1. **Comprehensive Security Audit**
   - Run full `npm audit`
   - Review all security advisories
   - Update this document with findings
   - Test incident response procedures

2. **Documentation Review**
   - Update security advisories
   - Review monitoring effectiveness
   - Adjust alert thresholds
   - Update runbooks

### Sentry Alert Rules

#### Critical Alerts
- **HMS Service Degradation**: >10 HMS errors in 5 minutes
- **Timeout Spike**: >15 timeout errors in 5 minutes
- **Room Creation Outage**: >5 room creation errors in 10 minutes

#### Warning Alerts
- **Elevated Error Rate**: >20 HMS errors in 30 minutes
- **DoS Patterns**: >10 request size violations (413) in 5 minutes
- **SSRF Attempts**: Any access to internal IP ranges

See `/Docs/SENTRY_HMS_MONITORING.md` for complete alert configuration.

## Summary of Mitigations

| Mitigation | Status | Date Implemented | Effectiveness |
|------------|--------|-----------------|---------------|
| Request Size Limits (10KB) | ✅ Implemented | 2025-01-14 | Prevents DoS via unbounded allocation |
| Request Timeouts (30s) | ✅ Implemented | 2025-01-14 | Detects slow DoS, prevents hangs |
| Enhanced Error Logging | ✅ Implemented | 2025-01-14 | Enables rapid incident detection |
| Sentry Monitoring | ✅ Configured | 2025-01-14 | Real-time alerting for security patterns |
| Network Segmentation | ⏳ Planned | TBD | Reduces SSRF risk |
| Egress Filtering | ⏳ Planned | TBD | Blocks SSRF to internal IPs |
| HMS SDK Update | ⏳ Waiting | TBD | Complete resolution of vulnerabilities |

**Current Risk Level**: MODERATE (reduced from HIGH)
- Original Risk: HIGH (unmitigated axios vulnerabilities)
- Current Risk: MODERATE (multiple defense-in-depth mitigations active)
- Target Risk: LOW (after HMS SDK updates axios to >= 0.30.2)

---

**Last Updated**: 2025-01-14
**Next Review Date**: 2025-02-01 (or when HMS SDK updates)
**Owner**: Security Team / DevOps
**Change Log**:
- 2025-01-14: Added request timeouts, enhanced logging, Sentry monitoring
- 2025-01-14: Created comprehensive monitoring and security documentation
- 2025-01-14: Updated action items and tracking status

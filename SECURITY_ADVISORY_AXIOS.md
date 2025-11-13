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

### Additional Recommendations
1. **Monitor**: Watch for updates to `@100mslive/server-sdk` that upgrade axios
2. **Network Segmentation**: Ensure HMS API calls are isolated from internal networks
3. **Request Size Limits**: Configure Next.js body parser limits:
   ```typescript
   export const config = {
     api: {
       bodyParser: {
         sizeLimit: '1mb', // Limit request body size
       },
     },
   }
   ```
4. **Firewall Rules**: Implement egress filtering to prevent SSRF to internal IPs

## Action Items

- [ ] **High Priority**: Contact 100ms support to request axios upgrade in server SDK
- [ ] **High Priority**: Monitor `@100mslive/server-sdk` releases for axios >= 0.30.2
- [ ] **Medium Priority**: Implement request size limits on HMS API routes
- [ ] **Medium Priority**: Review egress firewall rules to block internal IP ranges
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

- GHSA-wf5p-g6vw-rhxx: https://github.com/advisories/GHSA-wf5p-g6vw-rhxx
- GHSA-jr5f-v2jv-69x6: https://github.com/advisories/GHSA-jr5f-v2jv-69x6
- GHSA-4hjh-wcwx-xvwj: https://github.com/advisories/GHSA-4hjh-wcwx-xvwj
- 100ms Server SDK: https://www.npmjs.com/package/@100mslive/server-sdk
- Axios Security: https://github.com/axios/axios/security

## Impact Assessment

**Production Risk**: MODERATE

While the vulnerabilities are severe, the actual risk to our application is moderate because:
1. HMS SDK is only used server-side, not client-side
2. We have webhook signature verification preventing CSRF
3. Rate limiting is in place to mitigate DoS
4. The SDK is used for outbound API calls to 100ms, not user-facing requests

However, this should still be addressed as soon as a stable upstream fix is available.

---

**Last Updated**: 2025-01-13
**Next Review Date**: 2025-02-01 (or when HMS SDK updates)
**Owner**: Security Team / DevOps

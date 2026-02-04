# HMS SDK Update Request Template

## Contact Information

**To**: support@100ms.live
**Subject**: Urgent: Axios Security Vulnerability in @100mslive/server-sdk
**Priority**: High
**Category**: Security / SDK

---

## Request Summary

We are requesting an urgent update to the `@100mslive/server-sdk` package to address critical security vulnerabilities in its transitive dependency `axios@0.27.2`. These vulnerabilities pose security risks to our production application and require immediate attention.

## Vulnerability Details

### Current State
- **SDK Version**: @100mslive/server-sdk@0.3.0
- **Axios Version**: 0.27.2 (transitive dependency)
- **Environment**: Production (Node.js/Next.js application)

### Security Vulnerabilities

#### 1. Cross-Site Request Forgery (CSRF)
- **CVE**: GHSA-wf5p-g6vw-rhxx
- **CVSS Score**: 6.5 (Medium-High)
- **CWE**: CWE-352
- **Affected Versions**: axios >= 0.8.1 < 0.28.0
- **Advisory**: https://github.com/advisories/GHSA-wf5p-g6vw-rhxx

#### 2. SSRF and Credential Leakage
- **CVE**: GHSA-jr5f-v2jv-69x6
- **CVSS Score**: HIGH (no numeric score)
- **CWE**: CWE-918 (Server-Side Request Forgery)
- **Affected Versions**: axios < 0.30.0
- **Advisory**: https://github.com/advisories/GHSA-jr5f-v2jv-69x6
- **Impact**: Potential for internal service access and credential exposure

#### 3. Denial of Service (DoS)
- **CVE**: GHSA-4hjh-wcwx-xvwj
- **CVSS Score**: 7.5 (High)
- **CWE**: CWE-770 (Allocation of Resources Without Limits)
- **Affected Versions**: axios < 0.30.2
- **Advisory**: https://github.com/advisories/GHSA-4hjh-wcwx-xvwj
- **Impact**: Service disruption through unbounded memory allocation

## Required Action

**Update axios to version >= 0.30.2** in @100mslive/server-sdk to address all three vulnerabilities.

```json
// Recommended package.json change
{
  "dependencies": {
    "axios": "^0.30.2"  // or later
  }
}
```

## Impact on Our Application

### Current Risk Assessment
- **Production Exposure**: Moderate-High
- **Services Affected**: Video session management, recording, HLS streaming
- **Request Volume**: ~500-1000 HMS API calls/day in production

### Business Impact
- Security vulnerabilities flagged in compliance audits
- Cannot deploy to certain enterprise customers due to security requirements
- Risk of service disruption from DoS vulnerability
- Potential for credential leakage through SSRF

## Mitigations We've Implemented

While awaiting the SDK update, we have implemented the following mitigations:

1. **Request Size Limits**: All HMS API routes enforce 10KB request body limit to prevent DoS
2. **Request Timeouts**: 30-second timeout on all HMS API calls with proper error handling
3. **Network Segmentation**: HMS API calls isolated from internal networks
4. **Enhanced Monitoring**: Sentry alerts for suspicious patterns (SSRF, DoS attempts)
5. **Rate Limiting**: Upstash Redis rate limiting on all API endpoints

However, these are defense-in-depth measures and do not fully mitigate the underlying vulnerabilities.

## Timeline Requirements

We urgently need this update due to:

1. **Security Audit**: Scheduled security review in 2 weeks
2. **Enterprise Customer**: Security requirements for new contract
3. **Compliance**: Internal security policy requires addressing HIGH vulnerabilities within 30 days

**Requested Timeline**:
- **Ideal**: Patch release within 7 days
- **Acceptable**: Beta/RC release within 14 days for testing
- **Maximum**: Stable release within 30 days

## Questions

1. **Is this issue already being tracked?** If so, can you share the issue/PR link?
2. **Timeline for fix?** When can we expect a patch release?
3. **Workaround available?** Any recommended temporary solutions?
4. **Breaking changes?** Will the axios upgrade introduce breaking changes to the SDK API?
5. **Alpha/Beta versions?** Should we consider testing with 0.3.2-alpha or similar pre-release versions?

## Our Environment

```json
{
  "runtime": "Node.js 20.x",
  "framework": "Next.js 14.x",
  "package-manager": "npm",
  "deployment": "Vercel (serverless functions)",
  "sdk-usage": [
    "Room management",
    "Recording control",
    "HLS streaming",
    "RTMP stream keys",
    "Token generation"
  ]
}
```

## SDK Usage Patterns

We use the following HMS SDK functionality:
- Room creation and management
- Recording start/stop
- HLS stream control
- RTMP stream key management
- Server-side token generation (custom implementation using JWT)

**Note**: We implement token generation directly using `jsonwebtoken` rather than using the SDK's token generation, so updates to that functionality won't affect us.

## Testing Commitment

We commit to:
- Testing beta/RC releases within 24 hours of availability
- Providing feedback on any issues found
- Validating the fix resolves the security vulnerabilities
- Sharing test results with your team

## Alternative Solutions Considered

1. **Fork and patch**: We could fork the SDK and upgrade axios ourselves, but prefer official support
2. **Downgrade to 0.0.1**: npm audit suggests this but it would break functionality
3. **Replace SDK**: Last resort - implement HMS API calls directly

We prefer to continue using the official SDK with proper security updates.

## Contact Information

**Primary Contact**:
- Name: [Your Name]
- Email: [Your Email]
- Company: Kulti
- Timezone: [Your Timezone]

**Technical Contact**:
- Name: [DevOps Lead]
- Email: [DevOps Email]
- GitHub: [GitHub Username]

## Additional Resources

- **npm audit output**: Available upon request
- **Security advisory documentation**: We maintain detailed documentation of the issue
- **Test environment**: Staging environment available for testing pre-release versions

## Proposed Follow-up

After receiving your response, we propose:
1. Weekly sync call if needed for testing coordination
2. Dedicated Slack channel for real-time updates
3. Early access to beta/RC versions for validation
4. Joint announcement of security fix (optional)

## Appreciation

We appreciate the 100ms team's work on the platform and understand that security updates require careful testing. We're happy to collaborate on testing and validation to expedite the release.

Thank you for your prompt attention to this security matter.

---

## Internal Notes (Do Not Send)

### Before Sending
- [ ] Update contact information
- [ ] Verify all CVE links are correct
- [ ] Check current SDK version
- [ ] Review timeline requirements with team
- [ ] Get approval from security lead

### After Sending
- [ ] Create internal tracking ticket
- [ ] Set follow-up reminder for 3 days
- [ ] Monitor GitHub repo for related issues
- [ ] Check npm registry weekly for updates
- [ ] Update SECURITY_ADVISORY_AXIOS.md with status

### Follow-up Schedule
- Day 3: Send follow-up email if no response
- Day 7: Escalate to sales contact
- Day 14: Consider alternative solutions
- Day 30: Implement fork/patch if no update available

---

**Template Version**: 1.0
**Created**: 2025-01-14
**Last Updated**: 2025-01-14
**Owner**: Security Team / DevOps

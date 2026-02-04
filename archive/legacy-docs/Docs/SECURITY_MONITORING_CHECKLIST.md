# Security Monitoring Checklist

## Overview

This document provides a comprehensive security monitoring checklist for the Kulti platform, covering daily, weekly, and monthly security tasks to maintain a robust security posture.

## Daily Security Checks

### Application Security
- [ ] **Review Sentry Error Logs**
  - Check for security-related errors (auth failures, injection attempts)
  - Review any 403/401 errors for patterns
  - Verify no sensitive data in logs
  - Query: `level:error is:unresolved`

- [ ] **Monitor Authentication Failures**
  - Check Supabase auth logs for brute force attempts
  - Review failed login attempts (>5 from same IP)
  - Verify rate limiting is working
  - Command: Check Supabase Dashboard > Authentication > Logs

- [ ] **Check Rate Limiting Effectiveness**
  - Review Upstash Redis rate limit hits
  - Identify any IPs hitting limits repeatedly
  - Verify rate limits are appropriate for traffic
  - Query Sentry: `message:"Rate limit exceeded"`

- [ ] **HMS API Security**
  - Check for HMS authentication errors
  - Review request size limit violations (413 errors)
  - Monitor timeout errors for DoS patterns
  - Query: `message:*HMS*error* status:[400 TO 499]`

### Infrastructure Security
- [ ] **Vercel Deployment Logs**
  - Check for unauthorized deployment attempts
  - Review deployment source (should be from GitHub)
  - Verify environment variables unchanged
  - Location: Vercel Dashboard > Deployments

- [ ] **Supabase Access Logs**
  - Review database access patterns
  - Check for unusual query patterns
  - Verify RLS policies are enforced
  - Location: Supabase Dashboard > Database > Logs

- [ ] **API Endpoint Monitoring**
  - Check for unusual traffic patterns
  - Review geographic distribution of requests
  - Monitor for scanner/bot traffic
  - Tool: Vercel Analytics

### Incident Detection
- [ ] **Check for Active Security Incidents**
  - Review Sentry alerts in #ops-critical
  - Check PagerDuty for security incidents
  - Verify no active breaches reported
  - Review status page for security notices

- [ ] **Review Recent Alerts**
  - Verify all critical alerts were addressed
  - Check for recurring security warnings
  - Escalate unresolved security issues
  - Location: Sentry Dashboard > Alerts

## Weekly Security Scans

### Dependency Scanning
- [ ] **Run npm Audit**
  ```bash
  cd /Users/galenoakes/Development/kulti
  npm audit --production
  npm audit --audit-level=moderate
  ```
  - Review new vulnerabilities
  - Prioritize HIGH/CRITICAL issues
  - Create tickets for remediation
  - Update SECURITY_ADVISORY_AXIOS.md if needed

- [ ] **Check for Package Updates**
  ```bash
  npm outdated
  npm outdated @100mslive/server-sdk
  npm outdated @supabase/supabase-js
  ```
  - Identify security updates
  - Review changelogs for security fixes
  - Plan update schedule

- [ ] **Review Axios Vulnerability Status**
  - Check @100mslive/server-sdk version
  - Verify request size limits still in place
  - Review timeout configuration
  - Check for HMS SDK updates
  - Reference: `/Users/galenoakes/Development/kulti/SECURITY_ADVISORY_AXIOS.md`

### Access Control Review
- [ ] **Review Supabase Access Logs**
  - Audit database access patterns
  - Check for privilege escalation attempts
  - Verify RLS policies are effective
  - Review service role key usage

- [ ] **Review API Key Usage**
  - Check HMS API key usage patterns
  - Verify Upstash Redis key security
  - Review Resend API key access
  - Monitor for leaked keys (GitHub, logs)

- [ ] **Verify Environment Variables**
  ```bash
  # Check Vercel environment variables
  vercel env ls
  ```
  - Ensure no secrets in git history
  - Verify production secrets are separate
  - Check for expired credentials

### Application Security
- [ ] **Review Authentication Logs**
  - Check for suspicious login patterns
  - Review password reset requests
  - Verify MFA usage (when implemented)
  - Monitor session durations

- [ ] **Check Authorization Patterns**
  - Review RLS policy violations
  - Check for unauthorized resource access
  - Verify role-based access working
  - Query Sentry: `message:*unauthorized* OR message:*forbidden*`

- [ ] **Review Input Validation**
  - Check for injection attempts (SQL, XSS)
  - Review sanitization errors
  - Verify file upload restrictions
  - Query Sentry: `message:*injection* OR message:*XSS*`

### Network Security
- [ ] **Review Firewall Rules**
  - Verify egress filtering (SSRF protection)
  - Check for internal IP access attempts
  - Review blocked request patterns
  - Monitor for port scanning

- [ ] **Check SSL/TLS Configuration**
  - Verify SSL certificates valid
  - Check for mixed content warnings
  - Review HSTS headers
  - Tool: https://www.ssllabs.com/ssltest/

- [ ] **Monitor DDoS Patterns**
  - Review traffic spikes
  - Check rate limiting effectiveness
  - Verify Vercel DDoS protection active
  - Check for unusual request patterns

## Monthly Security Reviews

### Comprehensive Security Audit
- [ ] **Run Full Security Scan**
  ```bash
  # Full dependency audit
  npm audit
  npm audit --json > security-audit-$(date +%Y-%m-%d).json

  # Check for known vulnerabilities
  npx snyk test
  ```

- [ ] **Review All Security Advisories**
  - Check SECURITY_ADVISORY_AXIOS.md status
  - Review new CVEs affecting dependencies
  - Update security documentation
  - Create remediation plan for new issues

- [ ] **Code Security Review**
  - Review recent code changes for security issues
  - Check for hardcoded secrets
  - Verify input validation on new endpoints
  - Review new third-party integrations

### Dependency Management
- [ ] **Update Security-Critical Dependencies**
  - Update packages with security fixes
  - Test updates in staging environment
  - Document breaking changes
  - Deploy to production

- [ ] **Review Dependency Tree**
  ```bash
  npm list --depth=2
  npm list axios
  npm list @100mslive/server-sdk
  ```
  - Identify unused dependencies
  - Remove deprecated packages
  - Check for supply chain risks

- [ ] **Check for Abandoned Packages**
  - Review last update dates
  - Check for maintainer activity
  - Plan migrations for abandoned packages
  - Tool: npx depcheck

### Access and Secrets Management
- [ ] **Rotate API Keys**
  - HMS API keys (if supported)
  - Supabase service role keys (quarterly)
  - Upstash Redis keys
  - Resend API keys
  - Document rotation in runbook

- [ ] **Review User Access**
  - Audit team member access levels
  - Remove access for departed team members
  - Verify principle of least privilege
  - Review service account permissions

- [ ] **Audit Secrets Management**
  - Verify all secrets in Vercel environment
  - Check for secrets in git history
  - Review secrets rotation schedule
  - Ensure no secrets in client bundles

### Compliance and Documentation
- [ ] **Update Security Documentation**
  - Update SECURITY_ADVISORY_AXIOS.md
  - Review SENTRY_HMS_MONITORING.md
  - Update this checklist based on learnings
  - Document new security procedures

- [ ] **Review Security Incidents**
  - Analyze all security incidents from past month
  - Document lessons learned
  - Update incident response plan
  - Implement preventive measures

- [ ] **Security Training**
  - Review OWASP Top 10 with team
  - Share security best practices
  - Conduct security awareness training
  - Review secure coding guidelines

### Monitoring and Alerting
- [ ] **Review Sentry Alert Rules**
  - Verify alerts are firing correctly
  - Adjust thresholds based on baseline
  - Remove noisy alerts
  - Add alerts for new patterns
  - Reference: `/Users/galenoakes/Development/kulti/Docs/SENTRY_HMS_MONITORING.md`

- [ ] **Test Incident Response**
  - Simulate security incident
  - Verify alert delivery
  - Test escalation procedures
  - Review response time
  - Reference: `/Users/galenoakes/Development/kulti/Docs/INCIDENT_RESPONSE_PLAN.md`

- [ ] **Review Logging Configuration**
  - Verify all security events logged
  - Check log retention policies
  - Ensure no sensitive data in logs
  - Review log aggregation

### Infrastructure Security
- [ ] **Review Cloud Provider Security**
  - Check Vercel security settings
  - Review Supabase security policies
  - Verify Upstash Redis encryption
  - Review CDN security (if applicable)

- [ ] **Database Security Audit**
  - Review RLS policies
  - Check for SQL injection vulnerabilities
  - Verify database encryption
  - Review backup security
  - Reference: `/Users/galenoakes/Development/kulti/Docs/DATABASE_BACKUP_RECOVERY.md`

- [ ] **API Security Review**
  - Review API authentication mechanisms
  - Check rate limiting configuration
  - Verify CORS policies
  - Review API input validation

## Incident Response Procedures

### When Security Issue Detected

#### Severity Assessment
1. **Critical** - Active breach, data exposure, service disruption
2. **High** - Vulnerability exploitation possible, limited exposure
3. **Medium** - Vulnerability exists, exploitation unlikely
4. **Low** - Minor security concern, no immediate risk

#### Immediate Actions
- [ ] Alert security team via #ops-critical Slack channel
- [ ] Create incident ticket in tracking system
- [ ] Assess blast radius and potential impact
- [ ] Begin incident timeline documentation

#### Containment
- [ ] Isolate affected systems/services
- [ ] Revoke compromised credentials
- [ ] Enable additional monitoring/logging
- [ ] Consider temporary service shutdown if critical

#### Investigation
- [ ] Collect logs and evidence
- [ ] Identify root cause
- [ ] Determine scope of compromise
- [ ] Check for indicators of compromise (IOCs)

#### Remediation
- [ ] Apply security patches
- [ ] Update configurations
- [ ] Rotate affected credentials
- [ ] Deploy fixes to production

#### Communication
- [ ] Notify stakeholders (internal)
- [ ] Update status page (if user-facing)
- [ ] Prepare customer communication (if needed)
- [ ] File breach notification (if required by law)

#### Post-Incident
- [ ] Conduct post-mortem
- [ ] Document lessons learned
- [ ] Update security procedures
- [ ] Implement preventive measures
- [ ] Update this checklist

## Security Monitoring Tools

### Required Tools
- **Sentry** - Application error monitoring
  - URL: https://sentry.io/organizations/kulti/
  - Monitors: Errors, performance, security events

- **Supabase Dashboard** - Database security
  - URL: https://supabase.com/dashboard
  - Monitors: Auth logs, database access, RLS policies

- **Vercel Dashboard** - Deployment security
  - URL: https://vercel.com/dashboard
  - Monitors: Deployments, environment variables, analytics

- **npm audit** - Dependency vulnerabilities
  - Command: `npm audit`
  - Frequency: Weekly

### Optional/Future Tools
- **Snyk** - Advanced dependency scanning
- **GitHub Dependabot** - Automated dependency updates
- **OWASP ZAP** - Penetration testing
- **Cloudflare** - DDoS protection and WAF

## Security Metrics to Track

### Key Performance Indicators (KPIs)
- Time to detect security issues (target: <1 hour)
- Time to resolve critical vulnerabilities (target: <24 hours)
- Number of security incidents per month (target: 0)
- Percentage of dependencies up-to-date (target: >90%)
- Mean time to remediate vulnerabilities (target: <7 days)

### Tracking
```markdown
| Month | Incidents | Critical Vulns | Time to Resolve | Dependencies Up-to-Date |
|-------|-----------|----------------|-----------------|------------------------|
| Jan   | 0         | 2              | 5 days          | 87%                    |
| Feb   | 0         | 1              | 3 days          | 92%                    |
| Mar   | 1         | 0              | N/A             | 95%                    |
```

## Escalation Contacts

### Security Team
- **Security Lead**: [Name] - security@kulti.com
- **DevOps Lead**: [Name] - devops@kulti.com
- **On-Call Engineer**: PagerDuty rotation

### External Contacts
- **HMS Support**: support@100ms.live
- **Supabase Support**: support@supabase.com
- **Vercel Support**: support@vercel.com

### Emergency Procedures
1. For active security breach: Page security lead immediately
2. For data exposure: Notify legal and compliance teams
3. For service disruption: Activate incident response plan

## References

- Security Advisory: `/Users/galenoakes/Development/kulti/SECURITY_ADVISORY_AXIOS.md`
- HMS Monitoring: `/Users/galenoakes/Development/kulti/Docs/SENTRY_HMS_MONITORING.md`
- Incident Response: `/Users/galenoakes/Development/kulti/Docs/INCIDENT_RESPONSE_PLAN.md`
- Security Hardening: `/Users/galenoakes/Development/kulti/Docs/SECURITY_HARDENING.md`

---

**Last Updated**: 2025-01-14
**Owner**: Security Team / DevOps
**Review Frequency**: Monthly (or after security incidents)

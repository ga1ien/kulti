# Sentry HMS Monitoring Configuration

## Overview

This document outlines the monitoring strategy for 100ms (HMS) API integration using Sentry for error tracking, performance monitoring, and incident response.

## HMS-Specific Error Tracking

### Error Patterns to Monitor

#### 1. API Timeout Errors
**Pattern**: "HMS API request timeout"
**Severity**: HIGH
**Description**: Indicates HMS API requests exceeding 30-second timeout threshold

**Sentry Query**:
```
message:"HMS API request timeout"
```

**Alert Threshold**:
- Warning: >5 occurrences in 5 minutes
- Critical: >10 occurrences in 5 minutes

**Action Items**:
- Check HMS status page: https://status.100ms.live
- Review network connectivity
- Verify HMS API endpoint availability
- Consider increasing timeout if legitimate delays exist

#### 2. Room Creation Failures
**Pattern**: "HMS create room error" or "Error creating HMS room"
**Severity**: CRITICAL
**Description**: Failed to create HMS room, blocking new sessions

**Sentry Query**:
```
message:("HMS create room error" OR "Error creating HMS room")
```

**Alert Threshold**:
- Warning: >2 occurrences in 10 minutes
- Critical: >5 occurrences in 10 minutes

**Action Items**:
- Verify HMS credentials (HMS_APP_ACCESS_KEY, HMS_APP_SECRET)
- Check HMS account limits/quotas
- Review error response from HMS API
- Contact HMS support if persistent

#### 3. Recording Failures
**Pattern**: "HMS start recording error" or "HMS stop recording error"
**Severity**: HIGH
**Description**: Recording operations failing

**Sentry Query**:
```
message:("HMS start recording error" OR "HMS stop recording error")
```

**Alert Threshold**:
- Warning: >3 occurrences in 15 minutes
- Critical: >7 occurrences in 15 minutes

**Action Items**:
- Verify recording is enabled in HMS room settings
- Check storage configuration in HMS dashboard
- Review room state (active/inactive)
- Ensure meeting_url is accessible

#### 4. HLS Stream Failures
**Pattern**: "HMS start HLS stream error" or "HMS stop HLS stream error"
**Severity**: HIGH
**Description**: HLS streaming operations failing

**Sentry Query**:
```
message:("HMS start HLS stream error" OR "HMS stop HLS stream error")
```

**Alert Threshold**:
- Warning: >3 occurrences in 15 minutes
- Critical: >8 occurrences in 15 minutes

**Action Items**:
- Verify HLS is enabled in HMS template
- Check room peer count (HLS has minimum requirements)
- Review HLS configuration in HMS dashboard
- Monitor HLS bandwidth usage

#### 5. Stream Key Issues
**Pattern**: "HMS create stream key error" or "HMS get stream key error"
**Severity**: MEDIUM
**Description**: RTMP stream key operations failing

**Sentry Query**:
```
message:("stream key error")
```

**Alert Threshold**:
- Warning: >5 occurrences in 20 minutes
- Critical: >10 occurrences in 20 minutes

**Action Items**:
- Verify RTMP streaming is enabled
- Check stream key quota limits
- Review room configuration

#### 6. Room Details/Status Failures
**Pattern**: "HMS get room details error" or "HMS get HLS stream status error"
**Severity**: MEDIUM
**Description**: Failed to fetch room metadata

**Sentry Query**:
```
message:("get room details error" OR "get HLS stream status error")
```

**Alert Threshold**:
- Warning: >10 occurrences in 10 minutes
- Critical: >20 occurrences in 10 minutes

**Action Items**:
- May indicate room doesn't exist (404)
- Check room ID validity
- Verify room hasn't been deleted

### Error Context Fields

All HMS errors are logged with context. Monitor these fields:

**Common Fields**:
- `roomId` - HMS room identifier
- `error` - Error object/message
- `status` - HTTP status code (when available)

**Function-Specific Fields**:
- `name` - Room name (createHMSRoom)
- `streamKeyId` - Stream key ID (disableStreamKey)
- `meetingUrl` - Meeting URL (startRecording, startHLSStream)
- `streamId` - HLS stream ID (HLS operations)
- `sessionId` - HMS session ID (HLS operations)

## Dashboard Setup

### HMS Overview Dashboard

Create a Sentry dashboard with the following widgets:

#### 1. HMS Error Rate (Time Series)
**Type**: Line Chart
**Query**: `message:*HMS*error*`
**Group By**: `message`
**Time Range**: Last 24 hours
**Purpose**: Visualize HMS error trends over time

#### 2. HMS Error Distribution (Pie Chart)
**Type**: Pie Chart
**Query**: `message:*HMS*error*`
**Group By**: `message`
**Top**: 10
**Purpose**: Identify most common HMS error types

#### 3. HMS Timeout Events (Counter)
**Type**: Big Number
**Query**: `message:"HMS API request timeout"`
**Time Range**: Last 1 hour
**Purpose**: Quick visibility into timeout issues

#### 4. HMS Room Operations (Bar Chart)
**Type**: Bar Chart
**Query**: `message:*room*`
**Group By**: `message`
**Purpose**: Monitor room lifecycle operations

#### 5. HMS Recording Status (Table)
**Type**: Table
**Query**: `message:*recording*`
**Columns**: timestamp, roomId, message, status
**Purpose**: Track recording operations and failures

#### 6. HMS API Response Times (Line Chart)
**Type**: Performance Chart
**Transaction**: `hms.*`
**Metric**: `p50`, `p75`, `p95`
**Purpose**: Monitor HMS API latency

### Filter Configurations

#### Environment Filters
Create environment-specific views:
- Production: `environment:production AND message:*HMS*`
- Staging: `environment:staging AND message:*HMS*`
- Development: `environment:development AND message:*HMS*`

#### Severity Filters
- Critical: `message:*HMS*error* AND (message:*create*room* OR message:*timeout*)`
- High: `message:*HMS*error* AND (message:*recording* OR message:*HLS*)`
- Medium: `message:*HMS*error* AND message:*stream*key*`

## Alert Rules

### Critical Alerts (PagerDuty/Slack)

#### 1. HMS Service Degradation
**Condition**: More than 10 HMS errors in 5 minutes
**Query**: `message:*HMS*error*`
**Action**:
- Send to #ops-critical Slack channel
- Page on-call engineer
- Create PagerDuty incident

#### 2. Room Creation Outage
**Condition**: More than 5 room creation errors in 10 minutes
**Query**: `message:"Error creating HMS room"`
**Action**:
- Send to #ops-critical Slack channel
- Page on-call engineer
- Update status page

#### 3. Persistent Timeouts
**Condition**: More than 15 timeout errors in 5 minutes
**Query**: `message:"HMS API request timeout"`
**Action**:
- Send to #ops-critical Slack channel
- Check HMS status page automatically
- Alert DevOps team

### Warning Alerts (Slack Only)

#### 4. Recording Failures
**Condition**: More than 3 recording errors in 15 minutes
**Query**: `message:*recording*error*`
**Action**: Send to #ops-warnings Slack channel

#### 5. HLS Stream Issues
**Condition**: More than 5 HLS errors in 20 minutes
**Query**: `message:*HLS*error*`
**Action**: Send to #ops-warnings Slack channel

#### 6. Elevated Error Rate
**Condition**: More than 20 HMS errors in 30 minutes
**Query**: `message:*HMS*error*`
**Action**: Send to #ops-warnings Slack channel

## Sample Sentry Queries

### Find All HMS Errors in Last Hour
```
message:*HMS*error* is:unresolved timesSeen:>1
```

### Find Timeout Errors by Room
```
message:"HMS API request timeout" roomId:*
```

### Find Recording Failures by Status Code
```
message:"recording error" status:[400 TO 599]
```

### Find HLS Stream Errors for Specific Room
```
message:"HLS stream error" roomId:"specific-room-id"
```

### Track HMS API Call Success Rate
```
(message:*HMS* AND level:info) OR (message:*HMS*error*)
```

### Monitor Request Size Limit Violations
```
message:"Request too large" path:*hms*
```

## Performance Monitoring

### Transaction Names
Monitor these HMS-related transactions:
- `POST /api/hms/get-token`
- `POST /api/hms/start-recording`
- `POST /api/hms/stop-recording`
- `POST /api/hms/stream-key/create`
- `GET /api/hms/stream-key/[roomId]`

### Performance Thresholds

| Transaction | P50 Target | P95 Target | P99 Target |
|------------|-----------|-----------|-----------|
| Get Token | <200ms | <500ms | <1000ms |
| Start Recording | <2000ms | <5000ms | <10000ms |
| Stop Recording | <2000ms | <5000ms | <10000ms |
| Create Stream Key | <1000ms | <3000ms | <5000ms |
| Get Stream Key | <500ms | <1000ms | <2000ms |

**Alert if**:
- P95 exceeds target by 2x for >10 minutes
- P99 exceeds target by 3x for >5 minutes

## Incident Response

### When HMS Errors Spike

#### Step 1: Check HMS Status
1. Visit https://status.100ms.live
2. Check for ongoing incidents
3. Subscribe to status updates

#### Step 2: Review Sentry Events
1. Open Sentry HMS Overview Dashboard
2. Filter by last 15 minutes
3. Identify error pattern
4. Check error context (roomId, status codes)

#### Step 3: Diagnose HMS API Issues

**If timeout errors**:
- Run: `curl -w "@curl-format.txt" -o /dev/null -s https://api.100ms.live/v2/rooms`
- Check response time
- Check network connectivity to HMS
- Review Vercel logs for network issues

**If authentication errors (401/403)**:
- Verify HMS_APP_ACCESS_KEY and HMS_APP_SECRET
- Check if credentials rotated in HMS dashboard
- Verify environment variables in Vercel

**If rate limit errors (429)**:
- Check HMS dashboard for quota limits
- Review request volume in Sentry
- Implement exponential backoff if needed
- Contact HMS to increase limits

**If room creation failures**:
- Check HMS account status
- Review billing/payment status
- Check room count limits
- Contact HMS support

#### Step 4: Rollback Procedures

**If HMS integration is completely broken**:
1. Deploy previous working version:
   ```bash
   vercel rollback <deployment-url>
   ```

2. Update status page with incident details

3. Disable HMS-dependent features temporarily:
   - Disable recording start/stop in UI
   - Show maintenance message for video sessions
   - Queue operations for retry when service recovers

4. Enable manual workaround mode:
   - Allow sessions without recording
   - Use WebRTC without HMS backend
   - Log all operations for later processing

#### Step 5: Communication

**Internal**:
- Post in #ops-incidents Slack channel
- Update stakeholders every 15 minutes
- Document timeline of events

**External** (if user-facing):
- Update status page: https://status.kulti.com
- Tweet status update if >30 min outage
- Email affected customers if data loss

## Debugging HMS Integration

### Enable Debug Logging

Temporarily increase logging verbosity:
```typescript
// In lib/hms/server.ts
logger.debug("HMS API request", { url, method, headers, body })
logger.debug("HMS API response", { status, data })
```

### Common Debugging Queries

#### Find All Operations for Specific Room
```
roomId:"<room-id>"
```

#### Track Session Lifecycle
```
(message:"creating HMS room" OR message:"started successfully" OR message:"stopped successfully")
AND roomId:"<room-id>"
```

#### Find Correlation ID for Request Chain
```
correlationId:"<correlation-id>"
```

### Test HMS API Directly

```bash
# Test room creation
curl -X POST https://api.100ms.live/v2/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}" \
  -d '{"name":"test-room","description":"Test"}'

# Test room details
curl -X GET https://api.100ms.live/v2/rooms/<room-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}"
```

## Axios Vulnerability Monitoring

### Specific Queries for Axios CVEs

#### CSRF Vulnerability (GHSA-wf5p-g6vw-rhxx)
Monitor for suspicious cross-origin requests:
```
message:*CSRF* OR message:*cross-site*
```

#### SSRF Vulnerability (GHSA-jr5f-v2jv-69x6)
Monitor for internal IP access attempts:
```
message:*SSRF* OR url:*192.168.* OR url:*10.0.* OR url:*127.0.0.1*
```

#### DoS Vulnerability (GHSA-4hjh-wcwx-xvwj)
Monitor request size limit violations:
```
message:"Request too large" status:413
```

### Alert if:
- Any SSRF pattern detected (immediate escalation)
- >10 request size violations in 5 minutes
- Unusual spike in 413 responses

## Maintenance Tasks

### Daily
- [ ] Review HMS error count (should be <10/day in production)
- [ ] Check for new timeout errors
- [ ] Verify recording success rate >95%

### Weekly
- [ ] Review HMS performance metrics
- [ ] Check for HMS SDK updates: `npm outdated @100mslive/server-sdk`
- [ ] Analyze error patterns and trends
- [ ] Update alert thresholds based on baseline

### Monthly
- [ ] Review and optimize Sentry alert rules
- [ ] Audit HMS integration logs for anomalies
- [ ] Update this documentation with new patterns
- [ ] Test incident response procedures
- [ ] Review HMS account usage and limits

## Resources

- **HMS Status Page**: https://status.100ms.live
- **HMS Documentation**: https://www.100ms.live/docs
- **HMS Support**: support@100ms.live
- **Sentry Dashboard**: https://sentry.io/organizations/kulti/
- **Axios Security Advisories**: /Users/galenoakes/Development/kulti/SECURITY_ADVISORY_AXIOS.md

---

**Last Updated**: 2025-01-14
**Owner**: DevOps / SRE Team
**Review Frequency**: Monthly

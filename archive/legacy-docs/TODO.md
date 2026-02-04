# TODO List - Kulti Platform

This document tracks feature work and technical debt that needs to be addressed.

## High Priority

### HMS HLS Streaming Integration
**Location:** `/app/api/hms/get-token/route.ts` (line 129)
**Description:** Implement automatic HLS switching for viewers when participant count is high
**Status:** Code framework exists but disabled
**Requirements:**
- Implement `getRoomDetails()` function to check participant count
- Implement `getHLSStreamStatus()` function
- Implement `startHLSStream()` function
- Add HLS_THRESHOLD environment variable
- Test with high participant sessions

**Related Files:**
- `/app/api/sessions/[sessionId]/viewer-count/route.ts` (line 33)
- `/lib/hms/server.ts` (needs new functions)

### HMS Room Details API
**Location:** `/app/api/sessions/[sessionId]/viewer-count/route.ts` (line 33)
**Description:** Implement HMS API integration for accurate viewer counts
**Status:** Placeholder code exists
**Requirements:**
- Add HMS API endpoint calls to get room details
- Add HMS API endpoint calls to get HLS viewer counts
- Combine WebRTC + HLS viewer counts
- Handle API errors gracefully

## Medium Priority

### Testing Infrastructure
**Status:** Not yet implemented
**Requirements:**
- Add Jest configuration
- Add React Testing Library
- Add test utilities for Supabase mocking
- Add test utilities for HMS mocking
- Create example tests

### Performance Monitoring
**Status:** Partial implementation
**Requirements:**
- Add more comprehensive performance metrics
- Add error tracking improvements
- Add user analytics tracking
- Add session quality metrics

## Low Priority

### Documentation
**Status:** Needs expansion
**Requirements:**
- API documentation
- Component documentation
- Setup guide improvements
- Contributing guidelines

## Completed

### Phone Authentication System
**Completed:** 2025-01-11
**Description:** Added SMS-based phone authentication with OTP

### Credit System Refactoring
**Completed:** 2025-01-12
**Description:** Consolidated credit calculation logic and improved transaction handling

### Shared Utilities Creation
**Completed:** 2025-01-16
**Description:** Created shared utilities for API calls, formatting, and validation

# Video Infrastructure Deep Research: 100ms vs Agora vs Alternatives
**For: Kulti - Live Streaming Platform for Vibe Coders**
**Date: January 2025**
**Priority: Strategic Decision - Willing to Rebuild if Necessary**

---

## Context: What is Kulti?

Kulti is a live streaming platform for vibe coders and creative builders that enables multi-person collaborative sessions with **turn-based screen sharing**. Think Google Meet meets Twitch, built for the AI coding generation.

### Core Differentiator
Multi-person screen sharing where participants pass control back and forth, creating collaborative working sessions rather than broadcast performances.

### Current Tech Stack
- **Frontend:** Next.js 14, React 18, TailwindCSS
- **Backend:** Next.js API Routes, Supabase (PostgreSQL, Auth, Realtime)
- **Video:** 100ms (currently integrated)
- **Hosting:** Vercel, Supabase Cloud

### Current Implementation
- Fully integrated 100ms SDK
- Session room with video grid, controls, screen sharing
- Recording capability (start/stop recording via 100ms)
- Token generation, room management
- Chat via Supabase Realtime

---

## Scale & Vision: Where We're Heading

### Phase 1 (Current - First Month)
- 50+ approved users
- 100+ sessions created
- 20+ daily active sessions
- 2-6 participants per session

### Phase 2 (Months 2-6)
- 500+ active users
- 50+ concurrent sessions at peak
- AI features, recordings, clips

### Phase 3 (Year 1+)
- **Thousands of concurrent users**
- **Hundreds of simultaneous sessions**
- Mobile apps (React Native)
- Monetization (tips, subscriptions)
- Analytics for hosts
- Global edge distribution

### Long-Term Vision (3-5 Years)
- **Tens of thousands of daily active users**
- **Primary platform for vibe coding community**
- Enterprise features for teams
- Education platform integration
- API for third-party integrations

---

## Research Objectives

### Primary Question
**Which video infrastructure platform (100ms, Agora, or alternative) is the optimal choice for Kulti's long-term success, considering we're willing to rebuild if necessary?**

### Decision Criteria (Ranked by Importance)

1. **Scalability at Target Scale (1000s of concurrent users, 100s of simultaneous sessions)**
2. **Cost Efficiency at Scale** (predictable, sustainable economics)
3. **Core Feature Support** (specifically for our use case)
4. **Reliability & Performance** (uptime, latency, quality)
5. **Developer Experience** (API quality, documentation, iteration speed)
6. **Global Infrastructure** (edge network, regional coverage)
7. **Advanced Features** (AI, analytics, recording, streaming)
8. **Long-Term Viability** (company stability, roadmap alignment)
9. **Migration Complexity** (if switching from 100ms)
10. **Lock-in Risk** (ability to switch later if needed)

---

## Platforms to Evaluate

### Primary Candidates
1. **100ms** (current platform)
2. **Agora.io** (leading alternative)

### Additional Candidates to Consider
3. **Twilio Video** (enterprise proven)
4. **Daily.co** (developer-first approach)
5. **LiveKit** (open source, self-hostable)
6. **Zoom Video SDK** (brand trust, infrastructure)
7. **AWS Chime SDK** (AWS ecosystem integration)
8. **Dyte** (modern competitor)
9. **Stream Video** (by GetStream)
10. **Vonage Video API** (formerly TokBox/OpenTok)

---

## Comprehensive Evaluation Framework

For each platform, research and compare:

### 1. Scalability Analysis

**Concurrent Users:**
- Maximum users per session/room
- Maximum number of simultaneous sessions/rooms
- Publishing (screen share + audio) limits
- Viewing (HLS streaming) capabilities
- Documented real-world scale examples

**Performance Under Load:**
- Latency at scale (ms)
- Quality degradation patterns
- Auto-scaling capabilities
- CDN/edge network coverage
- Load balancing mechanisms

**Kulti-Specific Requirements:**
- Can handle 2-6 active publishers (screen share + camera + audio)?
- Can handle 100s of viewers per session?
- Can run 100+ rooms simultaneously?
- Performance with frequent publisher switching (turn-based control)?

### 2. Cost Analysis (Critical for Long-Term)

**Pricing Model:**
- Base pricing structure (per minute, per user, tiered, etc.)
- HD vs SD pricing differences
- Screen share specific costs
- Recording costs
- Storage costs
- Bandwidth/egress costs
- Hidden fees (analytics, support, SLA, etc.)

**Cost Projections:**

**Current Scale (Month 1):**
- 50 users, 20 daily sessions, 30 min avg duration
- Monthly cost estimate: $_____

**Medium Scale (Month 6):**
- 500 users, 50 concurrent sessions peak, 45 min avg duration
- Monthly cost estimate: $_____

**Target Scale (Year 1):**
- 5,000 users, 200 concurrent sessions peak, 1 hour avg duration
- Monthly cost estimate: $_____

**Aggressive Scale (Year 3):**
- 50,000 users, 1,000 concurrent sessions peak
- Monthly cost estimate: $_____

**Cost Comparison Table:**
```
Platform | Month 1 | Month 6 | Year 1 | Year 3 | Notes
---------|---------|---------|--------|--------|-------
100ms    | $___    | $___    | $___   | $___   | ___
Agora    | $___    | $___    | $___   | $___   | ___
[others] | $___    | $___    | $___   | $___   | ___
```

**Cost Optimization Options:**
- Volume discounts available?
- Commitment discounts (annual prepay)?
- Startup/early-stage credits?
- Free tier limits and sustainability?

### 3. Core Feature Comparison

**Must-Have Features:**
- [ ] WebRTC video/audio streaming
- [ ] Screen sharing with audio
- [ ] Multi-person screen sharing (turn-based control)
- [ ] Role-based permissions (host/presenter/viewer)
- [ ] Recording (cloud + local options)
- [ ] HLS/RTMP streaming for viewers
- [ ] Network quality indicators
- [ ] Adaptive bitrate
- [ ] Virtual backgrounds/blur
- [ ] Picture-in-picture support
- [ ] Mobile SDK (React Native/Flutter)

**Advanced Features:**
- [ ] AI noise cancellation
- [ ] Transcriptions/closed captions
- [ ] Clip generation from recordings
- [ ] Analytics/insights dashboard
- [ ] Webhooks for events
- [ ] Custom layouts/UI controls
- [ ] Breakout rooms
- [ ] Waiting rooms
- [ ] Hand raise/reactions
- [ ] Chat (or need separate solution?)

**Kulti-Specific Evaluation:**
- How well does each platform handle **turn-based screen sharing**?
- Does the SDK provide **granular control** over who can publish?
- Can we implement **seamless presenter switching** without reconnection?
- Quality of **screen share** (resolution, frame rate, latency)?

### 4. Developer Experience Assessment

**API & SDK Quality:**
- Documentation quality (examples, guides, references)
- SDK maturity (JavaScript/TypeScript, React, React Native)
- API design (RESTful, GraphQL, WebSocket)
- Error handling and debugging tools
- TypeScript support quality

**Integration Complexity:**
- Time to implement basic session (lines of code)
- Time to implement advanced features
- Learning curve steepness
- Community support (Discord, forums, Stack Overflow)
- Sample projects and templates available

**Development Workflow:**
- Local development experience
- Testing tools (simulators, mocks)
- Staging/production environment separation
- CI/CD integration
- Monitoring and observability tools

**Migration Effort (from 100ms):**
- Estimated developer hours to migrate
- Breaking changes to user experience
- Data migration requirements
- Backward compatibility options

### 5. Reliability & Performance

**Uptime & SLA:**
- Documented uptime percentage
- SLA guarantees (if any)
- Historical outage data
- Status page transparency
- Incident response time

**Quality Metrics:**
- Average latency (by region)
- Packet loss rates
- Jitter performance
- Connection success rates
- Time to first frame

**Global Infrastructure:**
- Number of edge locations
- Regional coverage (especially US, Europe, Asia)
- Automatic region selection
- Manual region override options
- Redundancy and failover mechanisms

**Real-World Performance:**
- User reviews mentioning performance
- Known issues or limitations
- Browser compatibility
- Network condition handling (poor wifi, mobile)

### 6. Advanced Capabilities

**Recording & Streaming:**
- Cloud recording (individual vs composite)
- Local recording options
- Recording storage (included or separate cost?)
- Live streaming to RTMP endpoints
- HLS playback for viewers
- Recording format and quality options

**AI & Intelligence:**
- AI noise suppression quality
- Background blur/replacement
- Transcription accuracy
- Auto-highlights or key moments
- Speech-to-text quality

**Analytics & Insights:**
- Session analytics dashboard
- User engagement metrics
- Quality of experience metrics
- Custom event tracking
- Data export options
- Real-time vs historical data

**Customization:**
- UI customization depth
- White-labeling options
- Custom branding
- Server-side rendering support
- Custom video layouts

### 7. Business & Strategic Considerations

**Company Stability:**
- Company age and funding history
- Revenue and profitability status
- Customer base size and growth
- Leadership team experience
- Recent pivots or changes

**Product Roadmap:**
- Public roadmap availability
- Alignment with Kulti's needs
- Innovation velocity
- Response to customer feedback
- Beta/preview program access

**Support & Success:**
- Support tiers (email, chat, phone)
- Response time commitments
- Technical account manager availability
- Onboarding assistance
- Success team for scaling customers

**Lock-in & Portability:**
- Ease of data export
- Ability to self-host (if open source)
- Standardization (WebRTC standards compliance)
- Migration tools to/from other platforms
- Contract flexibility (monthly vs annual)

**Community & Ecosystem:**
- Open source components
- Third-party integrations
- Community plugins/extensions
- Developer community size
- Conference/event presence

### 8. Security & Compliance

**Security Features:**
- End-to-end encryption options
- Data encryption at rest
- Access control mechanisms
- Token security and expiration
- DDoS protection

**Compliance:**
- GDPR compliance
- HIPAA compliance (if applicable)
- SOC 2 certification
- Data residency options
- Privacy policy transparency

**Moderation:**
- Built-in moderation tools
- Content filtering options
- Recording retention policies
- DMCA compliance tools

---

## Use Case Validation

### Test Scenario 1: Small Collaborative Session
**Setup:** 3 users, 30-minute session, all sharing screen in turns
**Metrics:** Latency, quality, ease of switching, cost

### Test Scenario 2: Large Viewing Session
**Setup:** 1 host, 100 viewers, 1-hour session, screen share + audio
**Metrics:** Viewer experience, cost, stability

### Test Scenario 3: Multiple Concurrent Sessions
**Setup:** 50 simultaneous rooms, 2-4 users each, mixed activities
**Metrics:** Cross-session isolation, performance, cost

### Test Scenario 4: Poor Network Conditions
**Setup:** Simulate poor WiFi, mobile 4G, packet loss
**Metrics:** Degradation handling, reconnection, user experience

### Test Scenario 5: Extended Recording
**Setup:** 2-hour session recorded, multiple speakers
**Metrics:** Recording quality, cost, storage, accessibility

---

## Final Deliverables

### 1. Comparison Matrix
Detailed spreadsheet comparing all platforms across all criteria

### 2. Cost Projection Model
Interactive calculator showing costs at different scales

### 3. Top 3 Recommendations
With pros/cons for each based on Kulti's specific needs

### 4. Migration Plan (if switching)
Detailed technical plan with timeline and risks

### 5. Decision Framework
Clear decision tree for final selection

### 6. Risk Mitigation Plan
For chosen platform, what risks exist and how to address them

---

## Key Questions to Answer

1. **Which platform offers the best cost-performance ratio at 1000+ concurrent users?**

2. **Which platform has the most robust support for turn-based screen sharing with 2-6 active publishers?**

3. **If we scale to 50,000 users, which platform remains economically viable?**

4. **What is the true total cost of ownership (TCO) including hidden costs like recording, analytics, support?**

5. **Which platform has the best developer experience for rapid iteration?**

6. **Is open-source (LiveKit) a viable option for more control and cost savings?**

7. **What vendor lock-in risks exist, and how portable is our implementation?**

8. **Which platform has the most aligned roadmap with Kulti's vision?**

9. **What are the realistic migration costs and timeline if switching from 100ms?**

10. **Which platform gives us the best chance of being the dominant platform in the vibe coding space?**

---

## Research Approach Recommendations

1. **Official Documentation Review**
   - Deep dive into each platform's docs
   - Focus on scale limits and pricing

2. **Community Research**
   - Reddit, HackerNews, Discord discussions
   - User testimonials and complaints
   - Real-world war stories

3. **Competitive Case Studies**
   - Find similar platforms and what they use
   - Scale journey stories
   - Migration stories (platform switches)

4. **Direct Outreach**
   - Contact sales teams for custom quotes
   - Request technical architecture discussions
   - Ask about scaling paths and support

5. **POC Testing (if time permits)**
   - Build minimal test app on top candidates
   - Run load tests
   - Measure actual performance and costs

6. **Financial Modeling**
   - Build detailed cost model at multiple scales
   - Include all cost variables
   - Stress test assumptions

---

## Success Criteria for Research

This research should enable us to:
- [ ] Confidently choose the optimal platform for 3-5 year horizon
- [ ] Understand exact costs at target scale
- [ ] Know migration effort and risks (if switching)
- [ ] Have backup options if primary choice fails
- [ ] Identify specific features/limitations of each platform
- [ ] Build business case for investment decision
- [ ] Set realistic technical and cost expectations

---

## Timeline

**Deep Research Phase:** 1-2 weeks
**POC Testing (if needed):** 1 week
**Final Decision:** 1 week
**Migration (if switching):** 2-4 weeks

Total time investment: 5-8 weeks for thorough evaluation

---

## Notes

- We're currently using 100ms and it's working well for MVP scale
- We're willing to rebuild if a significantly better option exists
- Cost efficiency at scale is critical but not at the expense of quality
- Developer experience matters because we're moving fast
- We need a platform that can grow with us for 3-5 years
- We value transparency, documentation, and community

---

**Remember:** The goal is not just to find the "best" platform in isolation, but the **optimal platform for Kulti's specific needs, scale trajectory, and long-term vision**.

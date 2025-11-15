# Production Deployment Checklist

**Last Updated**: November 14, 2025
**Current Status**: 92/100 Production Readiness (CONDITIONAL GO)
**See**: `/Docs/LAUNCH_READINESS_REPORT_v2.md` for detailed status

## Pre-Launch Complete Checklist

Use this comprehensive checklist to ensure all systems are configured and tested before launching Kulti to production.

### Recent Improvements (November 14, 2025)

**✅ COMPLETED**:
- TypeScript build errors fixed (51 errors → 0)
- Unit test suite fixed (7 failures → 0, now 204/204 passing)
- ESLint violations reduced (296 → 224, 24% improvement)
- E2E test environment configured (.env.test created)
- Security vulnerabilities mitigated (axios risk: HIGH → MODERATE)
- Request timeout protection implemented (30s on all HMS calls)
- Comprehensive monitoring documentation created (4 new guides)

**⚠️ KNOWN LIMITATIONS**:
- E2E tests require production credentials to run (infrastructure ready)
- Accessibility compliance at 66% automated pass rate (63/95 tests)
- 224 ESLint violations remain (non-blocking, mostly test files)
- Axios vulnerability awaiting upstream fix (mitigated with timeouts)

---

## Phase 1: Infrastructure Setup (Weeks 1-2)

### Vercel Configuration
- [ ] **Vercel account created**
  - Verify: Log in to vercel.com
  - Sign up if needed

- [ ] **GitHub repository connected to Vercel**
  - Verify: Vercel Dashboard shows repository
  - Verify: Auto-deployments enabled for main branch

- [ ] **Vercel project created**
  - Project name: `kulti` or preferred name
  - Framework: Next.js selected
  - Verify: Project visible in Vercel Dashboard

- [ ] **Build settings configured**
  - Build command: `npm run build`
  - Output directory: `.next`
  - Install command: `npm install`
  - Node.js version: 20.x
  - Verify: Local build successful with `npm run build`

- [ ] **Production domain configured**
  - Domain added in Vercel
  - DNS records propagated (wait 24-48 hours)
  - Verify: `nslookup your-domain.com`
  - SSL certificate issued by Let's Encrypt
  - Verify: HTTPS works without certificate warnings

- [ ] **vercel.json configuration file created**
  - File located at project root
  - Build and dev commands configured
  - Security headers configured
  - Verify: No Vercel warnings in dashboard

### Supabase Configuration
- [ ] **Supabase account created**
  - Verify: Organization dashboard accessible
  - Billing information updated

- [ ] **Supabase production project created**
  - Project name: `kulti-prod` or similar
  - Region: Closest to target users
  - Plan: Pro ($50/mo) or higher
  - Verify: Project shows "Active" status

- [ ] **Database password secured**
  - Strong password created (12+ chars, mixed)
  - Password stored in secure password manager
  - Verify: Cannot find password in git history

- [ ] **All migrations applied to production**
  ```bash
  npx supabase link --project-ref <production-ref>
  npx supabase db push
  ```
  - Verify: All migration files applied successfully
  - Verify: Expected tables exist in production

- [ ] **Database structure verified**
  - All tables present
  - All indexes created
  - All constraints in place
  - Verify: Run `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';`

- [ ] **RLS policies enabled and tested**
  - RLS enabled on all tables
  - All policies active
  - Policies tested with different user roles
  - Verify: Test user can only see own data

- [ ] **Auth configuration completed**
  - Email provider configured (SMTP or Supabase default)
  - Phone auth enabled (optional)
  - Auth redirect URLs configured
  - JWT settings reviewed
  - Rate limiting configured
  - Verify: Test signup and login flows

- [ ] **Backups configured**
  - Automated daily backups enabled
  - Backup retention: 7+ days
  - Manual backup created before first deployment
  - Verify: Backup appears in Settings → Backups

- [ ] **Connection pooling configured (if needed)**
  - Pool mode: `transaction`
  - Max pool size: 20
  - Verify: Pooling connection string obtained

---

## Phase 2: Environment Configuration (Week 1)

### Required Environment Variables Set
- [ ] **Supabase credentials**
  - `NEXT_PUBLIC_SUPABASE_URL`: ✓ Set in Vercel and .env.local
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: ✓ Set in Vercel and .env.local
  - `SUPABASE_SERVICE_ROLE_KEY`: ✓ Set in Vercel ONLY (never local or git)
  - Verify: All values are correct format (URLs and long JWT strings)

- [ ] **100ms HMS credentials**
  - `NEXT_PUBLIC_HMS_APP_ID`: ✓ Set in Vercel and .env.local
  - `HMS_APP_ACCESS_KEY`: ✓ Set in Vercel ONLY
  - `HMS_APP_SECRET`: ✓ Set in Vercel ONLY
  - `HMS_TEMPLATE_ID`: ✓ Set in Vercel and .env.local
  - Verify: All values obtained from 100ms Dashboard

- [ ] **Anthropic API key**
  - `ANTHROPIC_API_KEY`: ✓ Set in Vercel ONLY
  - Verify: Key format is `sk-ant-...`
  - Verify: Key not expired

- [ ] **Application configuration**
  - `NEXT_PUBLIC_APP_URL`: ✓ Set to production domain (HTTPS)
  - `NODE_ENV`: ✓ Set to `production` in Vercel
  - Verify: App URL matches Supabase redirect URLs

### Optional but Recommended Variables
- [ ] **Upstash Redis (rate limiting)**
  - `UPSTASH_REDIS_REST_URL`: ✓ Set in Vercel
  - `UPSTASH_REDIS_REST_TOKEN`: ✓ Set in Vercel
  - Verify: Redis connection works

- [ ] **Sentry (error tracking)**
  - `NEXT_PUBLIC_SENTRY_DSN`: ✓ Set in Vercel and .env.local
  - Verify: Sentry project created
  - Verify: DSN is correct format

- [ ] **.env.local configured for local development**
  - All required variables present
  - File added to .gitignore
  - Verify: `npm run dev` starts successfully

### Verify Environment Configuration
- [ ] All variables use Production environment in Vercel
- [ ] No secrets exposed in git history
  - Run: `git log -p | grep -i "secret"` (should return nothing)
- [ ] .env.local not committed to git
  - Verify: File listed in .gitignore
- [ ] Sensitive files excluded from deployment
  - Verify: vercel.json has proper ignore settings

---

## Phase 3: Code Quality & Testing (Week 1)

### Code Quality Checks
- [ ] **All code committed to main branch**
  - Verify: `git status` shows clean working directory
  - Verify: No uncommitted changes
  - Verify: Latest changes on main branch

- [ ] **ESLint passes without errors**
  ```bash
  npm run lint
  ```
  - Verify: 0 errors (warnings are acceptable)

- [ ] **TypeScript compiles without critical errors**
  ```bash
  npm run type-check
  ```
  - Verify: 0 critical 'any' types in production code
  - Minor warnings are acceptable

- [ ] **Production build succeeds**
  ```bash
  npm run build
  ```
  - Verify: Build completes without errors
  - Verify: .next directory created

### Testing
- [ ] **Unit tests pass**
  ```bash
  npm run test
  ```
  - Verify: All tests passing
  - Coverage: ≥70%
  - Critical paths: 100% coverage

- [ ] **E2E tests pass**
  ```bash
  npm run test:e2e
  ```
  - Verify: All end-to-end tests passing
  - Test against production-like environment

- [ ] **Test coverage acceptable**
  ```bash
  npm run test:coverage
  ```
  - Overall coverage: ≥70%
  - Critical paths: ≥90%

### Local Production Build Testing
- [ ] **Production build runs locally**
  ```bash
  npm run build
  npm run start  # Starts on localhost:3001
  ```
  - Verify: No errors during startup
  - Verify: Server responds to requests

- [ ] **Core features tested in local prod build**
  - [ ] Landing page loads
  - [ ] Signup works (use test phone number)
  - [ ] Login works
  - [ ] Dashboard displays
  - [ ] Create session works
  - [ ] Join session works
  - [ ] Video connection works
  - [ ] Chat works
  - [ ] Screen sharing works
  - [ ] Navigation works

- [ ] **Error handling works**
  - [ ] 404 page displays for bad routes
  - [ ] Error boundary catches component errors
  - [ ] Network errors handled gracefully
  - [ ] API errors show user-friendly messages

---

## Phase 4: First Vercel Deployment (Week 2)

### Pre-Deployment
- [ ] **All environment variables set in Vercel**
  - Go to Settings → Environment Variables
  - All variables in "Production" environment
  - Verify: No variables in "Development" or "Preview"

- [ ] **GitHub branch protection enabled** (optional but recommended)
  - Require status checks before merge
  - Require code review approval
  - Dismiss stale PR approvals

### Deploy to Production
- [ ] **First deployment successful**
  - Push code to main branch: `git push origin main`
  - Verify: Vercel dashboard shows deployment in progress
  - Verify: Deployment completes with "Ready" status
  - Check deployment logs for any warnings

- [ ] **Deployment logs reviewed**
  - No errors in build logs
  - No critical warnings
  - Build time acceptable (< 5 minutes)

- [ ] **Production site accessible**
  - Navigate to https://your-domain.com
  - Page loads without errors
  - No certificate warnings
  - Verify: Domain in browser matches production

---

## Phase 5: Production Verification (Day 1)

### Functionality Testing
- [ ] **Landing page works**
  - All content loads
  - All links work
  - Images display correctly
  - Mobile responsive

- [ ] **Authentication flow works**
  - [ ] Signup successful (test account)
  - [ ] Verify phone number works
  - [ ] Login works with new account
  - [ ] Password reset works
  - [ ] Logout works
  - [ ] Session persists on refresh

- [ ] **Dashboard functional**
  - [ ] Dashboard loads
  - [ ] User profile visible
  - [ ] Credit balance displays
  - [ ] All navigation links work
  - [ ] Mobile navigation works

- [ ] **Session creation and joining**
  - [ ] Create new session works
  - [ ] Session appears in list
  - [ ] Join session works
  - [ ] Video conference loads
  - [ ] Participant list shows correctly

- [ ] **Video and Audio**
  - [ ] Microphone access requested
  - [ ] Camera access requested
  - [ ] Video feed displays
  - [ ] Audio works both directions
  - [ ] Volume controls work
  - [ ] Mute/unmute works

- [ ] **Chat functionality**
  - [ ] Send message works
  - [ ] Messages appear in real-time
  - [ ] Message history displays
  - [ ] Emoji picker works (if available)

- [ ] **Screen sharing**
  - [ ] Screen share button present
  - [ ] Screen share starts
  - [ ] Shared screen visible to others
  - [ ] Screen sharing stops cleanly
  - [ ] Quality acceptable

- [ ] **Recording**
  - [ ] Recording starts when session begins
  - [ ] Recording quality acceptable
  - [ ] Recording stops cleanly
  - [ ] Recording accessible in playback

### Performance Testing
- [ ] **Page load speed acceptable**
  - Home page: < 3 seconds
  - Dashboard: < 2 seconds
  - Session page: < 3 seconds
  - Use Chrome DevTools to measure

- [ ] **No console errors**
  - Open browser DevTools (F12)
  - Check Console tab
  - Verify: No JavaScript errors
  - Minor warnings acceptable

- [ ] **No network errors**
  - Check Network tab in DevTools
  - All API requests return 2xx/3xx status
  - No failed requests

- [ ] **Mobile responsive**
  - Test on mobile device or DevTools mobile view
  - All features accessible
  - Touch interactions work
  - No layout issues

### Error Tracking
- [ ] **Sentry error tracking working**
  - Go to Sentry dashboard
  - Verify: Project shows activity
  - Verify: Test error appears in Sentry
  - Note: May take 5-10 minutes to appear

- [ ] **Error logs accessible**
  - Vercel Deployments → Click deployment → Logs
  - Supabase: SQL Editor and logs accessible
  - 100ms: Dashboard accessible

---

## Phase 6: Database Setup (Week 2)

### Initial Data
- [ ] **Admin user created**
  - Use signup flow to create admin account
  - Promote to admin via SQL:
    ```sql
    UPDATE users SET role = 'admin' WHERE email = 'admin@kulti.club';
    ```
  - Verify: Admin can access admin dashboard

- [ ] **Invite codes created**
  - [ ] Beta invite code: `BETA2025`
  - [ ] Founder invite code (if applicable)
  - [ ] Team invite codes created
  - Verify: Invite codes work (test signup with code)

- [ ] **Initial credits seeded**
  - Admin users have 1000+ credits
  - Test users have credits for testing
  - Verify: Credit display works in UI

- [ ] **Sample topics/communities created** (optional)
  - Create 5-10 initial topics
  - Create sample rooms
  - Verify: Topics visible in UI

- [ ] **Feature flags configured**
  - Feature flags created and activated as needed
  - Rollout percentages set appropriately
  - Verify: Flag system working

### Backup Verification
- [ ] **Automated backups enabled**
  - Supabase Settings → Backups
  - Backup frequency: Daily
  - Retention: 7+ days
  - Verify: First backup has completed

- [ ] **Manual backup created**
  - Before any major operations
  - Named: `before-launch-[date]`
  - Verify: Backup appears in backup list

- [ ] **Backup restoration tested** (staging only)
  - Create test project
  - Restore from backup
  - Verify: Data integrity
  - Delete test project

---

## Phase 7: Monitoring & Alerting Setup (Week 2)

### Error Tracking
- [ ] **Sentry project configured**
  - Project created in Sentry
  - DSN obtained and set in Vercel
  - Alerts configured for critical errors
  - Verify: Test error captured in Sentry

- [ ] **Error alert rules created**
  - Alert on first exception in release
  - Alert on error spike (>10% increase)
  - Slack integration configured (if available)

- [ ] **Performance monitoring enabled**
  - Transaction tracking enabled
  - Slow transaction alerts configured
  - Performance degradation alerts enabled

### Application Monitoring
- [ ] **Vercel Analytics enabled**
  - Vercel Dashboard → Analytics
  - Web Vitals tracking enabled
  - Verify: Metrics appearing

- [ ] **Database monitoring enabled**
  - Supabase Monitoring dashboard accessible
  - Database size tracked
  - Query performance monitored
  - Connection count monitored

- [ ] **Uptime monitoring configured** (optional)
  - UptimeRobot or similar service configured
  - Alerts set up for downtime
  - Status page created (if applicable)

### Logging
- [ ] **Application logs accessible**
  - Vercel Function logs working
  - Supabase logs accessible
  - 100ms logs accessible
  - Centralized logging configured (if desired)

- [ ] **Log retention configured**
  - Logs retained for 30+ days
  - Log rotation enabled
  - Archive strategy defined

---

## Phase 8: Security Verification (Week 2)

### Secrets & Keys
- [ ] **No secrets in git history**
  ```bash
  git log -p | grep -i "secret\|password\|key"
  ```
  - Verify: No sensitive data found

- [ ] **Environment variables secured**
  - Production variables set in Vercel only
  - No variables in code
  - Service role key never in frontend code

- [ ] **API keys rotated**
  - Create backup of current keys
  - Verify: Rotation procedure documented
  - Rotation schedule established (every 90 days)

- [ ] **Credentials stored securely**
  - Database password in password manager
  - API keys in password manager
  - Not shared via email or Slack
  - Access controlled to team members only

### Database Security
- [ ] **RLS policies enabled**
  - RLS enabled on all tables
  - Users can only access own data
  - Public data accessible by all
  - Admin users have proper access
  - Verify: Test with different user roles

- [ ] **No overly permissive policies**
  - Review all RLS policies
  - Ensure least-privilege access
  - No policies granting full access to authenticated users

- [ ] **Sensitive columns have constraints**
  - Email verified before use
  - Phone verified before use
  - Passwords hashed (automatic with Supabase Auth)
  - Personal data minimized

### API Security
- [ ] **Rate limiting enabled**
  - Upstash Redis configured
  - Rate limit middleware active
  - Verify: Can't make 100 requests/second

- [ ] **Input validation working**
  - Zod schemas enforced on all inputs
  - Invalid data rejected with error
  - Verify: Test with invalid input

- [ ] **Request size limits enforced**
  - Large requests rejected
  - File upload limits configured
  - Verify: Test with large payload

- [ ] **CORS properly configured**
  - Only your domain allowed
  - Not overly permissive
  - Verify: Check CORS headers

### HTTPS & Certificates
- [ ] **SSL certificate valid**
  ```bash
  openssl s_client -connect your-domain.com:443
  ```
  - Certificate valid and not expired
  - Certificate from trusted CA (Let's Encrypt)
  - No certificate warnings in browser

- [ ] **HSTS enabled**
  - Check response headers for HSTS
  - Header should include max-age and includeSubDomains
  - Verify: Run security check at securityheaders.com

- [ ] **Security headers configured**
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
  - X-XSS-Protection enabled
  - CSP (Content Security Policy) configured
  - Verify: Check via securityheaders.com

---

## Phase 9: Team Access & Documentation (Week 2)

### Team Setup
- [ ] **Team members added to Vercel**
  - Vercel team settings
  - Appropriate roles assigned
  - Verify: Team members can access dashboard

- [ ] **Team members added to Supabase**
  - Supabase organization members
  - Appropriate roles assigned
  - Verify: Team members can access database

- [ ] **Team members added to Sentry** (if applicable)
  - Sentry project members
  - Alert notifications configured
  - Verify: Team can see errors

### Documentation
- [ ] **Deployment guide documented**
  - Location: `/Docs/VERCEL_PRODUCTION_SETUP.md`
  - Includes step-by-step instructions
  - Troubleshooting section included

- [ ] **Supabase setup documented**
  - Location: `/Docs/SUPABASE_PRODUCTION_SETUP.md`
  - Migration instructions included
  - RLS policy documentation included

- [ ] **Runbook documented**
  - Location: `/Docs/PRODUCTION_RUNBOOK.md`
  - Daily operations documented
  - Common issues and solutions
  - Escalation procedures

- [ ] **Emergency procedures documented**
  - Rollback procedure
  - Database recovery procedure
  - Contact information for critical issues
  - Escalation chain documented

---

## Phase 10: Launch Readiness (Day of Launch)

### Final Checks
- [ ] **All team members briefed**
  - Deployment plan reviewed
  - Roles and responsibilities assigned
  - Communication plan established
  - Rollback plan reviewed

- [ ] **Monitoring dashboards set up**
  - Sentry dashboard open
  - Vercel analytics visible
  - Supabase monitoring visible
  - Status page ready

- [ ] **Communications channels ready**
  - Slack channel for incidents (if applicable)
  - Email for critical alerts
  - On-call rotation established

- [ ] **Backup plans confirmed**
  - Latest backup verified
  - Restore procedure tested
  - Team knows how to execute

### Launch
- [ ] **DNS propagated**
  - Verify: `nslookup your-domain.com` shows Vercel IPs
  - Wait 24-48 hours if needed

- [ ] **First users onboarded**
  - Admin account verified working
  - Test users created
  - Invite codes distributed
  - First beta users invited

- [ ] **Production traffic monitored**
  - Watch Vercel analytics
  - Monitor Sentry for errors
  - Check database performance
  - Monitor 100ms dashboard

- [ ] **Support system ready**
  - Support email monitored
  - Status page ready for updates
  - Team available for issues

---

## Phase 11: Post-Launch (First Week)

### Daily Monitoring
- [ ] **Daily health checks** (First 7 days)
  - Check error rates in Sentry
  - Check performance metrics
  - Check database size and performance
  - Check user feedback

- [ ] **Critical bug monitoring**
  - P1 bugs fixed immediately
  - P2 bugs fixed within 24 hours
  - P3 bugs tracked for backlog

### Weekly Review (End of Week 1)
- [ ] **Performance review**
  - Check if performance is acceptable
  - Identify optimization opportunities
  - Plan improvements for next week

- [ ] **Error analysis**
  - Review all errors from week
  - Identify patterns
  - Fix common issues

- [ ] **User feedback review**
  - Collect feedback from beta users
  - Identify common complaints
  - Plan fixes

- [ ] **Database maintenance**
  - Check database size growth
  - Review slow queries
  - Optimize as needed

### Ongoing
- [ ] **Weekly standup**
  - Status of all systems
  - Any issues or alerts
  - Planned improvements

- [ ] **Bi-weekly retrospective**
  - What went well?
  - What needs improvement?
  - Action items for next sprint

- [ ] **Monthly security review**
  - Review access logs
  - Check for suspicious activity
  - Verify backups working
  - Plan key rotation

---

## Deployment Day Timeline

### T-0 Days (Preparation)
- All checks above completed
- Team briefed and ready
- Rollback plan reviewed

### T-0 (Launch Day)

**Morning (Preparation)**
- 09:00 - Final team sync
- 09:15 - Verify all systems operational
- 09:30 - Monitoring dashboards open
- 10:00 - Ready for launch

**Launch**
- 10:00 - Enable auto-deploy from main
- 10:05 - Verify site accessible
- 10:10 - Check for errors in Sentry
- 10:15 - First users testing signup
- 10:30 - Distribute initial invite codes
- 11:00 - Monitor dashboard

**First Hour**
- Monitor for critical errors
- Ready to rollback if needed
- Document any issues

### T+1 Days (First 24 Hours)
- Continue monitoring
- Fix any critical bugs
- Collect early user feedback
- Document lessons learned

### T+7 Days (First Week)
- Analyze metrics
- Fix discovered issues
- Plan for scaling
- Celebrate launch!

---

## Success Criteria

Launch is successful if:
- [ ] Zero critical errors in first 24 hours
- [ ] All core features working (auth, video, chat)
- [ ] Average page load time < 3 seconds
- [ ] 99%+ uptime in first week
- [ ] Positive user feedback
- [ ] Team confident in system stability
- [ ] Monitoring and alerting working
- [ ] Rollback not needed

---

## Checklist Summary

Total Items: **200+**

- Phase 1 (Infrastructure): 15 items
- Phase 2 (Environment): 20 items
- Phase 3 (Quality): 15 items
- Phase 4 (First Deploy): 10 items
- Phase 5 (Verification): 40 items
- Phase 6 (Database): 15 items
- Phase 7 (Monitoring): 20 items
- Phase 8 (Security): 30 items
- Phase 9 (Team): 10 items
- Phase 10 (Launch): 10 items
- Phase 11 (Post-Launch): 15 items

---

## Next Steps After Launch

1. Monitor first week closely
2. Gather user feedback
3. Fix any critical issues
4. Plan next features
5. Gradually increase user base
6. Scale infrastructure as needed
7. Celebrate! 🚀

---

## Document References

- Vercel Setup: `/Docs/VERCEL_PRODUCTION_SETUP.md`
- Supabase Setup: `/Docs/SUPABASE_PRODUCTION_SETUP.md`
- Environment Variables: `/Docs/ENV_VARIABLES_CHECKLIST.md`
- Database Seeding: `/Docs/DATABASE_SEEDING.md`
- Security: `/Docs/SECURITY_HARDENING.md`
- Monitoring: `/Docs/MONITORING_SETUP.md`
- Production Runbook: `/Docs/PRODUCTION_RUNBOOK.md`
- Database Backup: `/Docs/DATABASE_BACKUP_RECOVERY.md`

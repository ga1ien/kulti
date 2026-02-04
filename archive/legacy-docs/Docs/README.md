# Kulti Documentation Index

Welcome to the Kulti documentation! This index helps you navigate all available documentation.

---

## Quick Start

**New to the project?**
1. Read [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md) for overview
2. Review [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for deployment steps
3. Set up [MONITORING_SETUP.md](./MONITORING_SETUP.md) for error tracking

**Deploying to production?**
1. [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Complete deployment guide
2. [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md) - Pre-deployment checklist

**Running production?**
1. [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md) - Day-to-day operations
2. [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Dashboard access and alerts

---

## Documentation by Category

### Production & Deployment

**[PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md)**
- Executive summary of all production readiness work
- Complete task breakdown
- Production readiness scorecard
- Risk assessment
- Deployment timeline
- **Start here for overview**

**[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)**
- Pre-deployment checklist
- Step-by-step deployment instructions
- Environment setup (Supabase, HMS, Sentry, Redis)
- Custom domain configuration
- Post-deployment verification
- Rollback procedures
- Cost monitoring
- **Use this to deploy**

**[PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md)**
- Daily/weekly/monthly checklists
- Incident response matrix (P0-P3)
- 8 detailed scenario playbooks
- Useful SQL queries
- Emergency contacts
- Monitoring dashboards
- **Use this for operations**

---

### Monitoring & Observability

**[MONITORING_SETUP.md](./MONITORING_SETUP.md)**
- Sentry setup and configuration
- Dashboard access instructions
- Alert configuration
- Key metrics to monitor
- Debugging with Sentry
- Performance monitoring
- Cost optimization
- **Essential for production monitoring**

---

### Security

**[SECURITY_HARDENING.md](./SECURITY_HARDENING.md)**
- Security headers explained
- Environment variable security
- Input validation and sanitization
- Rate limiting
- Authentication security
- Database security (RLS)
- API security
- CORS configuration
- Production checklist
- Incident response
- **Complete security reference**

---

### Features

**[RECORDING_SYSTEM.md](./RECORDING_SYSTEM.md)**
- Recording architecture
- Database schema
- API endpoints
- Webhook handling
- Frontend integration
- HMS configuration
- Storage options
- Cost estimation
- Security considerations
- Troubleshooting
- **Complete recording system guide**

---

### Operations

**[DATABASE_BACKUP_RECOVERY.md](./DATABASE_BACKUP_RECOVERY.md)**
- Backup strategy
- Backup scripts usage
- Environment setup
- Recovery procedures
- Disaster recovery (RTO/RPO)
- Backup schedule
- Storage recommendations
- Testing procedures
- Security considerations
- Compliance & retention
- **Essential for data protection**

---

## Documentation by Role

### For Developers

**Getting Started:**
1. Clone repository
2. Set up `.env.local` (see `.env.example`)
3. Run `npm install`
4. Run `npm run dev`

**Key Documents:**
- [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) - Input validation
- [RECORDING_SYSTEM.md](./RECORDING_SYSTEM.md) - Recording API
- [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Error tracking

---

### For DevOps

**Key Documents:**
1. [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Deployment
2. [DATABASE_BACKUP_RECOVERY.md](./DATABASE_BACKUP_RECOVERY.md) - Backups
3. [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md) - Operations
4. [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Monitoring

**Daily Tasks:**
- Check [PRODUCTION_RUNBOOK.md - Daily Checklist](./PRODUCTION_RUNBOOK.md#daily-operations)
- Review Sentry dashboard
- Monitor database health
- Verify backups completed

---

### For Product/Leadership

**Key Documents:**
1. [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md) - Overview
2. [PRODUCTION_DEPLOYMENT.md - Cost Monitoring](./PRODUCTION_DEPLOYMENT.md#cost-monitoring)
3. [PRODUCTION_RUNBOOK.md - Emergency Contacts](./PRODUCTION_RUNBOOK.md#emergency-contacts)

**Key Metrics:**
- Uptime (target: 99%+)
- Error rate (target: < 1%)
- Response time (target: < 2s)
- Monthly costs (estimate: $120-360)

---

## Scripts Reference

### Database Scripts

```bash
# Create backup
npm run db:backup

# Restore backup
npm run db:restore backups/file.sql.gz

# Verify backup
npm run db:verify backups/file.sql.gz
```

**Location:** `/scripts/*.sh`
**Documentation:** [DATABASE_BACKUP_RECOVERY.md](./DATABASE_BACKUP_RECOVERY.md)

---

### Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

---

## Environment Variables

See [`.env.example`](../.env.example) for complete list.

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_HMS_APP_ID`
- `HMS_APP_ACCESS_KEY`
- `HMS_APP_SECRET`
- `HMS_TEMPLATE_ID`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_URL`

**Optional (Recommended for Production):**
- `NEXT_PUBLIC_SENTRY_DSN` - Error tracking
- `UPSTASH_REDIS_REST_URL` - Rate limiting
- `UPSTASH_REDIS_REST_TOKEN` - Rate limiting

**Details:** [PRODUCTION_DEPLOYMENT.md - Environment Variables](./PRODUCTION_DEPLOYMENT.md#22-configure-environment-variables)

---

## Architecture Overview

```
Kulti Architecture

Frontend (Next.js 16)
  ├── Authentication (Supabase Auth)
  ├── Video (100ms HMS)
  ├── AI Chat (Anthropic)
  └── UI (React + Tailwind)

Backend (Next.js API Routes)
  ├── Session Management
  ├── Credit System
  ├── Recording Management
  └── Webhooks (HMS)

Database (Supabase PostgreSQL)
  ├── Users
  ├── Sessions
  ├── Credits
  ├── Recordings
  └── RLS Policies

Infrastructure
  ├── Hosting: Vercel
  ├── Database: Supabase
  ├── Video: 100ms HMS
  ├── Monitoring: Sentry
  ├── Rate Limiting: Upstash Redis
  └── AI: Anthropic Claude
```

---

## Common Tasks

### Deploy to Production
See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

### Restore Database
See [DATABASE_BACKUP_RECOVERY.md - Recovery Procedures](./DATABASE_BACKUP_RECOVERY.md#recovery-procedures)

### Handle Incident
See [PRODUCTION_RUNBOOK.md - Common Scenarios](./PRODUCTION_RUNBOOK.md#common-scenarios)

### Add Monitoring Alert
See [MONITORING_SETUP.md - Setting Up Alerts](./MONITORING_SETUP.md#setting-up-alerts)

### Implement Security Fix
See [SECURITY_HARDENING.md](./SECURITY_HARDENING.md)

---

## Support & Resources

### Internal
- On-Call Engineer: See [PRODUCTION_RUNBOOK.md - Emergency Contacts](./PRODUCTION_RUNBOOK.md#emergency-contacts)
- DevOps Lead: See [PRODUCTION_RUNBOOK.md - Emergency Contacts](./PRODUCTION_RUNBOOK.md#emergency-contacts)

### External Services
- **Supabase:** support@supabase.io | [docs](https://supabase.com/docs)
- **100ms:** support@100ms.live | [docs](https://docs.100ms.live)
- **Vercel:** vercel.com/support | [docs](https://vercel.com/docs)
- **Sentry:** support@sentry.io | [docs](https://docs.sentry.io)

### Status Pages
- Supabase: status.supabase.com
- Vercel: status.vercel.com
- 100ms: status.100ms.live
- Anthropic: status.anthropic.com

---

## Contributing to Documentation

### Guidelines

1. **Use Markdown** - All docs in Markdown format
2. **Be comprehensive** - Include examples and context
3. **Keep updated** - Update docs when code changes
4. **Clear structure** - Use headers, lists, code blocks
5. **Link related docs** - Cross-reference other documents

### Documentation Structure

```
/Docs/
├── README.md (this file)
├── PRODUCTION_READINESS_REPORT.md
├── PRODUCTION_DEPLOYMENT.md
├── PRODUCTION_RUNBOOK.md
├── MONITORING_SETUP.md
├── SECURITY_HARDENING.md
├── RECORDING_SYSTEM.md
└── DATABASE_BACKUP_RECOVERY.md
```

---

## Document Versions

All documentation last updated: **2025-01-16**

| Document | Version | Last Updated |
|----------|---------|--------------|
| PRODUCTION_READINESS_REPORT.md | 1.0 | 2025-01-16 |
| PRODUCTION_DEPLOYMENT.md | 1.0 | 2025-01-16 |
| PRODUCTION_RUNBOOK.md | 1.0 | 2025-01-16 |
| MONITORING_SETUP.md | 1.0 | 2025-01-16 |
| SECURITY_HARDENING.md | 1.0 | 2025-01-16 |
| RECORDING_SYSTEM.md | 1.0 | 2025-01-16 |
| DATABASE_BACKUP_RECOVERY.md | 1.0 | 2025-01-16 |

---

## Questions?

Can't find what you're looking for?

1. Search across all docs (use `grep -r "search term" Docs/`)
2. Check related docs (see cross-references)
3. Review code comments in `/lib`, `/app`, `/components`
4. Contact team (see Emergency Contacts)

---

Last Updated: 2025-01-16

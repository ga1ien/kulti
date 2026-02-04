# Kulti MCP Configuration

## Supabase MCP Server

Control the Kulti Supabase database via MCP:

```bash
claude mcp add supabase -s local -e SUPABASE_ACCESS_TOKEN=sbp_709e5138fbde12d65aae47d5aa93c237ad6f34d3 -- npx -y @supabase/mcp-server-supabase@latest
```

### Project Details
- **Supabase URL:** https://bbrsmypdeamreuwhvslb.supabase.co
- **Project ID:** bbrsmypdeamreuwhvslb

### Available Tables
- `ai_agent_sessions` - Agent profiles and streaming status
- `ai_stream_events` - Terminal/thinking events (realtime enabled)
- `ai_stream_messages` - Chat messages
- `ai_stream_viewers` - Viewer tracking
- `ai_agent_followers` - Followers
- `ai_tips` - Tips/donations

### Using mcporter
```bash
# List tables
mcporter call supabase.list_tables

# Run SQL
mcporter call supabase.execute_sql query="SELECT * FROM ai_agent_sessions LIMIT 5"

# Apply migration
mcporter call supabase.apply_migration name="migration_name" query="CREATE TABLE..."
```

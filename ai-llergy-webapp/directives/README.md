# AI-llergy Webapp Directives

## Overview

This directory contains DOE (Directive-Orchestration-Execution) framework documentation for the AI-llergy webapp. These directives guide AI agents and developers working on the codebase.

## Directive Index

### UI & Design

| Directive | Description |
|-----------|-------------|
| [design-system.md](./design-system.md) | Color tokens, typography, spacing, shadows, button/badge systems |
| [dashboard-ui-components.md](./dashboard-ui-components.md) | Dashboard component patterns, files, common modifications |
| [icon-system.md](./icon-system.md) | Lucide React icons usage, sizing conventions, migration from emojis |

### Backend & Database

| Directive | Description |
|-----------|-------------|
| [api-endpoints.md](./api-endpoints.md) | Next.js API routes, authentication patterns, role-based access |
| [supabase-rls-policies.md](./supabase-rls-policies.md) | Row Level Security patterns, common issues |
| [supabase-rpc-typing.md](./supabase-rpc-typing.md) | TypeScript typing workarounds for Supabase RPC calls |
| [venue-creation.md](./venue-creation.md) | RPC-based venue creation pattern, trigger handling |

### Project History

| Directive | Description |
|-----------|-------------|
| [changelog.md](./changelog.md) | Significant changes, fixes, migration notes |

## Quick Reference

### When working on dashboard UI:
1. Read `design-system.md` for styling conventions
2. Check `dashboard-ui-components.md` for component patterns
3. Use `icon-system.md` for icon usage

### When adding API endpoints:
1. Follow patterns in `api-endpoints.md`
2. Check `supabase-rls-policies.md` for database access
3. Use `supabase-rpc-typing.md` if calling RPC functions

### When something breaks:
1. Check `changelog.md` for recent changes
2. Look for related issues in directive files
3. Update directives with learnings (self-annealing)

## File Structure

```
ai-llergy-webapp/
├── directives/           # This directory
│   ├── README.md         # This file
│   ├── design-system.md
│   ├── dashboard-ui-components.md
│   ├── icon-system.md
│   ├── api-endpoints.md
│   ├── supabase-rls-policies.md
│   ├── supabase-rpc-typing.md
│   ├── venue-creation.md
│   └── changelog.md
├── src/
│   ├── app/              # Next.js pages and API routes
│   ├── components/       # React components
│   └── lib/              # Utilities, Supabase client
└── supabase/             # Database schema and migrations
```

## DOE Framework Reminder

1. **Directive (Layer 1)**: These markdown files - instructions for what to do
2. **Orchestration (Layer 2)**: AI agent decision-making using these directives
3. **Execution (Layer 3)**: Python scripts in `execution/` for deterministic tasks

When you discover new patterns, gotchas, or fixes - update the relevant directive. Directives are living documents that improve over time.

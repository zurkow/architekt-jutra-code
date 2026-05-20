# Synthesis

## Core Problem

The `plugins/koszyk/` plugin was migrated from Vite to Next.js and gained BAML AI integration. The project's `.gitignore` configuration was not updated to cover:
1. New generated artifacts (`.next/`, `baml_client/`, `next-env.d.ts`)
2. `.env.local` secrets files (all plugins + litellm)
3. User-local Claude Code settings

## Required Gitignore Changes

### 1. Create `plugins/koszyk/.gitignore`
Pattern: mirror `plugins/ai-description/.gitignore` and add `.env.local`

```
node_modules/
.next/
baml_client/
next-env.d.ts
.env
.env.local
```

### 2. Update `plugins/ai-description/.gitignore`
Add `.env.local` (currently missing — ai-description's `.env.local` with ANTHROPIC_API_KEY is unprotected)

### 3. Update root `.gitignore`
Add:
```
### Env secrets ###
**/.env.local

### Claude Code ###
.claude/settings.local.json
```

The `**/.env.local` glob covers all plugins and litellm subdirectory in one rule.

## Confidence Level: HIGH

All findings are based on direct examination of git status and existing gitignore files. No ambiguity.

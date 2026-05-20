# Research Report: Files to Commit and Gitignore Configuration

## Research Question
Which files from the current git status should be committed vs gitignored? How should `.gitignore` be configured?

## Summary

The project has three `.gitignore` gaps that expose secrets and generate noise:
1. **`.env.local` files are not ignored** — all three (koszyk, ai-description, litellm) contain live API keys
2. **`plugins/koszyk/` has no `.gitignore`** — Next.js build output and BAML generated code would be committed
3. **`.claude/settings.local.json`** is not ignored — contains user-local permission overrides

---

## Files to Commit

### Stage modified/deleted tracked files
All modified source files represent the Vite→Next.js migration and AI recommendation feature:

- `plugins/koszyk/src/domain.ts`
- `plugins/koszyk/src/pages/CartPage.tsx`
- `plugins/koszyk/src/test/CartPage.test.tsx`
- `plugins/koszyk/src/test/scaffold.test.ts`
- `plugins/koszyk/src/test/setup.ts`
- `plugins/koszyk/package.json`
- `plugins/koszyk/package-lock.json`
- `plugins/koszyk/tsconfig.json`
- `plugins/koszyk/src/main.tsx` (deleted — stage with `git rm`)
- `plugins/koszyk/vite.config.ts` (deleted — stage with `git rm`)

### Add untracked source/config files
New files from the Next.js migration + AI recommendation feature:

- `plugins/koszyk/jest.config.js`
- `plugins/koszyk/next.config.js`
- `plugins/koszyk/src/pages/_document.tsx`
- `plugins/koszyk/src/pages/api/` (all files)
- `plugins/koszyk/src/pages/index.tsx`
- `plugins/koszyk/src/test/migration-guard.test.ts`
- `plugins/koszyk/src/test/migration-smoke.test.ts`
- `plugins/koszyk/src/test/recommend.test.ts`
- `plugins/koszyk/baml_src/` (BAML source definitions — human-written, not generated)
- `plugins/koszyk/.env.example` (safe: no secrets, just documents required vars)
- `.maister/tasks/development/2026-05-19-cart-recommend-button/`
- `.maister/tasks/research/2026-05-20-commit-files-gitignore/`

---

## Gitignore Fixes Required

### Fix 1: Create `plugins/koszyk/.gitignore`
```
node_modules/
.next/
baml_client/
next-env.d.ts
.env
.env.local
```

### Fix 2: Update `plugins/ai-description/.gitignore`
Add `.env.local` — currently the ai-description plugin's `.env.local` (with ANTHROPIC_API_KEY) is NOT ignored.

### Fix 3: Update root `.gitignore`
Add two sections:
```
### Env secrets ###
**/.env.local

### Claude Code ###
.claude/settings.local.json
```

Note: The `**/.env.local` rule in root `.gitignore` covers all subdirectories (plugins, litellm, etc.) and makes the per-plugin rules redundant — but adding them to plugin-level `.gitignore` files too is good practice for clarity.

---

## Confidence: HIGH

All findings directly from git status and existing .gitignore file content.

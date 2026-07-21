# Session Resume — 2026-07-20

## Active Context
- **Project**: discover-rapanui (bjofrea-ctrl/discover-rapanui)
- **Branch**: main (up to date with origin)
- **Last commit**: `ffa9013` — fix wrangler deploy + `fa2e7a9` — admin role fix + migrate cleanup

## What Was Done

### 1. Cloudflare Deploy Fixed
- Root cause: `CLOUDFLARE_API_TOKEN` GitHub secret had trailing newline/special char
- Workflow: migrated from `wrangler-action@v3` to wrangler direct with env var
- Token replaced via `wrangler login` OAuth, set as GitHub secret
- **Status**: ✅ Run #7 success — https://ca726c4a.discover-rapanui.pages.dev

### 2. Admin Role Fixed
- Root cause: `profiles.role = 'client'` (trigger default), RLS checks `profiles.role`
- Migrations:
  - `0007_fix_admin_profile_role.sql` — remote version (OpenCode, for new email)
  - `0008_ensure_admin_profile.sql` — INSERT ON CONFLICT DO UPDATE
- Removed: `0006_admin_email.sql` (wrote to `user_roles`, unused by RLS)
- **Status**: ✅ profiles shows `role: admin`

### 3. Working Tree
- Clean — nothing unstaged
- `.wrangler/` added to `.gitignore`

## Next Steps (from docs/PLAN.md — Auditoría round 2)
1. Verify site visually at pages.dev URL
2. `frontend-preview/` improvements not applied to real site
3. `backend/supabase/` duplicate cleanup
4. Real WhatsApp number
5. Supabase Pro upgrade

## Files Modified This Session
- `.github/workflows/deploy.yml` — wrangler direct + env var (pushed via SSH due to token scope)
- `supabase/migrations/0008_ensure_admin_profile.sql` — new migration
- `supabase/migrations/0006_admin_email.sql` — deleted
- `.gitignore` — added `.wrangler/`

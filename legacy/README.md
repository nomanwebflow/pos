# Legacy Files

⚠️ **WARNING: These files are from the old system architecture and are NOT currently used by the application.**

## Why These Files Are Here

This folder contains files from the previous system architecture before migrating to Supabase. The application has been migrated from:
- **Old Stack**: SQLite + Prisma + NextAuth
- **New Stack**: Supabase (PostgreSQL + Supabase Auth)

These files are kept as reference/backup but are **NOT** part of the active codebase.

---

## Files in This Folder

### `auth.ts`
- **Purpose**: NextAuth.js configuration file
- **Status**: Replaced by Supabase Auth
- **Used**: Was used for authentication with credentials provider
- **Now**: Application uses Supabase Auth (`lib/supabase/`)

### `lib/db.ts`
- **Purpose**: better-sqlite3 database connection and initialization
- **Status**: Replaced by Supabase PostgreSQL
- **Used**: Local SQLite database (`dev.db`)
- **Now**: Application uses Supabase client (`lib/supabase/client.ts`)

### `lib/db-queries.ts`
- **Purpose**: Database query interface for SQLite
- **Status**: Replaced by Supabase queries
- **Used**: Query functions for users, products, customers, sales
- **Now**: Direct Supabase queries in API routes

### `lib/auth-utils.ts`
- **Purpose**: Auth utility functions (getCurrentUser, requireAuth, hasRole)
- **Status**: Replaced by Supabase auth utilities
- **Used**: Server-side auth checks
- **Now**: Uses `lib/supabase/server.ts` and `components/rbac.tsx`

### `scripts/seed-admin.ts`
- **Purpose**: Seed script to create admin user in SQLite
- **Status**: Replaced by Supabase seed
- **Used**: Create initial admin user in local DB
- **Now**: Uses `supabase/seed.sql` for seeding

### `prisma/seed.ts`
- **Purpose**: Prisma seed script
- **Status**: Not used (alternative approach)
- **Used**: Seed database via Prisma
- **Now**: Uses Supabase migrations and seed.sql

---

## Can These Files Be Deleted?

**Yes, eventually.** These files are kept temporarily as:
1. **Reference**: In case you need to look up old logic
2. **Backup**: Safety net during migration period
3. **Documentation**: Shows how the old system worked

### Safe to delete when:
- ✅ Application has been running successfully with Supabase for a while
- ✅ No plans to revert to SQLite/Prisma
- ✅ All functionality has been verified to work with Supabase
- ✅ You no longer need the old implementation as reference

---

## Migration Notes

The migration from SQLite to Supabase involved:

1. **Authentication**: NextAuth → Supabase Auth
2. **Database**: SQLite (better-sqlite3) → PostgreSQL (Supabase)
3. **Queries**: Direct SQL/Prisma → Supabase client
4. **Sessions**: NextAuth sessions → Supabase sessions
5. **RLS**: Manual checks → Row Level Security policies

All new development should use the Supabase stack in:
- `lib/supabase/` - Supabase client utilities
- `supabase/` - Migrations and seeds
- API routes using Supabase client

---

**Last Updated**: December 2025
**Migration Status**: Complete ✅

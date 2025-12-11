This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# POS System with Supabase Authentication & RBAC

A modern Point of Sale system built with Next.js 15, Supabase, and role-based access control.

## Features

- **Supabase Authentication** - Secure user authentication with email/password
- **Role-Based Access Control (RBAC)** - Three roles with different permissions:
  - **Super Admin** - Full system access (reports, user management, data export)
  - **Cashier** - Limited to checkout and customer management
  - **Stock Manager** - Limited to product and inventory management
- **Row Level Security (RLS)** - Database-level permission enforcement
- **Automatic Route Protection** - Middleware-based access control
- **Test Accounts** - Pre-configured accounts for each role

## Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop (for local Supabase)
- Supabase CLI (`brew install supabase/tap/supabase`)

### Setup

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Start Supabase (Automated)**
   ```bash
   ./scripts/setup-supabase.sh
   ```

   This will:
   - Start Supabase locally with Docker
   - Run database migrations
   - Seed test accounts
   - Display credentials

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Login**
   Open [http://localhost:3000](http://localhost:3000) and login with:
   - Super Admin: `admin@posystem.local` / `admin123`
   - Cashier: `cashier@posystem.local` / `cashier123`
   - Stock Manager: `stock@posystem.local` / `stock123`

## Manual Setup

If the automated script doesn't work, follow these steps:

1. Start Docker Desktop
2. Run `supabase start`
3. Copy `.env.local.example` to `.env.local`
4. Update `.env.local` with local Supabase URLs
5. Run `npm run dev`

See [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) for detailed instructions.

## Self-Hosted Supabase (Production)

For full control over your data and infrastructure, deploy a self-hosted Supabase instance:

### Quick Start

1. **Generate Secrets**
   ```bash
   ./scripts/generate-secrets.sh
   ```

2. **Configure Environment**
   - Copy secrets to `.env.production`
   - Generate JWT keys (ANON_KEY and SERVICE_ROLE_KEY)
   - Update domain URLs

3. **Start Services**
   ```bash
   ./scripts/start-self-hosted.sh
   ```

4. **Access Studio**
   - Open http://localhost:3001
   - Login with credentials from `.env.production`

### What You Get

- **Full Control**: Own your data and infrastructure
- **No Limits**: Unlimited users, storage, and API calls
- **Cost Effective**: ~$25-100/month vs cloud pricing
- **Privacy**: Data stays on your servers
- **Customizable**: Modify any component

### Services Included

- PostgreSQL (database)
- PostgREST (REST API)
- GoTrue (authentication)
- Kong (API gateway)
- Realtime (WebSockets)
- Storage API (file storage)
- Studio (web UI)
- Analytics (logging)

See [SELF_HOSTED_SUPABASE_GUIDE.md](./SELF_HOSTED_SUPABASE_GUIDE.md) for complete deployment guide.

## Documentation

- **[SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md)** - Complete setup guide for local and cloud
- **[SELF_HOSTED_SUPABASE_GUIDE.md](./SELF_HOSTED_SUPABASE_GUIDE.md)** - Self-hosting deployment guide
- **[TEST_ACCOUNTS.md](./TEST_ACCOUNTS.md)** - Test account credentials and testing guide
- **[RBAC_IMPLEMENTATION_SUMMARY.md](./RBAC_IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[POS_SYSTEM_GUIDE.md](./POS_SYSTEM_GUIDE.md)** - User guide for the POS system

## Role Permissions

| Feature | Super Admin | Cashier | Stock Manager |
|---------|-------------|---------|---------------|
| Reports & Analytics | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Export Data | ✅ | ❌ | ❌ |
| Manage Products | ✅ | Read Only | ✅ |
| Manage Customers | ✅ | ✅ | ❌ |
| Process Checkout | ✅ | ✅ | ❌ |
| View Transactions | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript

## Project Structure

```
pos/
├── app/               # Next.js app directory
├── components/        # React components
├── lib/
│   ├── supabase/     # Supabase client utilities
│   └── rbac.ts       # Role-based access control
├── hooks/            # Custom React hooks
├── supabase/
│   ├── migrations/   # Database migrations
│   └── seed.sql      # Test data
└── scripts/          # Setup scripts
```

## Development

### Access Supabase Studio
```bash
open http://localhost:54323
```

### Stop Supabase
```bash
supabase stop
```

### Reset Database
```bash
supabase db reset
```

### Create New Migration
```bash
supabase migration new migration_name
```

## Deployment

### Deploy to Google Cloud Run
```bash
gcloud run deploy pos-system \
  --source . \
  --region=asia-south1 \
  --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co,NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key"
```

### Deploy to Vercel
```bash
vercel deploy
```

Make sure to add environment variables in your deployment platform.

## Security

- All passwords in test accounts are for **DEVELOPMENT ONLY**
- Change passwords before production deployment
- Row Level Security (RLS) enforces permissions at database level
- Middleware protects routes before rendering
- Service role key should never be exposed to client

## Troubleshooting

See the troubleshooting sections in:
- [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md)
- [TEST_ACCOUNTS.md](./TEST_ACCOUNTS.md)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## License

MIT

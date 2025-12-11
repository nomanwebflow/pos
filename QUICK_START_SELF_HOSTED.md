# Quick Start - Self-Hosted Supabase

## Current Status

✅ **All secrets generated and configured**
✅ **Docker Compose is downloading images** (in progress)
✅ **Database migrations ready**
✅ **Next.js configuration created**

## Next Steps (5-10 minutes)

### Step 1: Wait for Docker Download (Currently Running)

Docker is downloading ~2-3GB of images. To monitor progress:

```bash
# Check download progress (Ctrl+C to exit monitoring)
watch -n 5 'docker-compose ps'
```

Or just wait for the docker-compose command to finish.

### Step 2: Verify Services Started

Once download completes, check if all services are running:

```bash
docker-compose ps
```

You should see 11 services:
- supabase-db
- supabase-auth
- supabase-rest
- supabase-kong
- supabase-realtime
- supabase-storage
- supabase-studio
- supabase-meta
- supabase-imgproxy
- supabase-analytics
- supabase-vector

All should show status "Up" or "Up (healthy)"

### Step 3: Wait for Healthchecks (2-3 minutes)

Services need time to become healthy after starting:

```bash
# Monitor health status
watch -n 5 'docker-compose ps'
```

Wait until you see "(healthy)" next to the services.

### Step 4: Access Supabase Studio

Once services are healthy:

```bash
# Open Studio in browser
open http://localhost:3001
```

**Login credentials:**
- Username: `supabase`
- Password: `7rdCItKDpOakOiL4`

### Step 5: Verify Database Setup

In Studio:
1. Go to "Table Editor" (left sidebar)
2. You should see these tables:
   - user_profiles
   - products
   - customers
   - transactions
   - transaction_items
   - audit_logs

3. Go to "Authentication" → "Users"
4. You should see 3 users:
   - admin@posystem.local
   - cashier@posystem.local
   - stock@posystem.local

### Step 6: Start Your Next.js App

```bash
# Start the development server
npm run dev
```

### Step 7: Test the Application

Open http://localhost:3000

You'll be redirected to the login page. Try logging in with each role:

**Super Admin:**
- Email: `admin@posystem.local`
- Password: `admin123`
- Should redirect to `/reports`

**Cashier:**
- Email: `cashier@posystem.local`
- Password: `cashier123`
- Should redirect to `/checkout`

**Stock Manager:**
- Email: `stock@posystem.local`
- Password: `stock123`
- Should redirect to `/products`

## Access URLs

- **Your App**: http://localhost:3000
- **Supabase API**: http://localhost:8000
- **Supabase Studio**: http://localhost:3001
- **Database**: localhost:5432
- **Analytics**: http://localhost:4000

## Your Credentials

### Supabase Studio
- URL: http://localhost:3001
- Username: `supabase`
- Password: `7rdCItKDpOakOiL4`

### Database Direct Access
- Host: localhost
- Port: 5432
- Database: postgres
- Username: supabase_admin
- Password: `2ZgLK7x2YMEUEH4RZGle6xPNqbp7TpCM`

### Test User Accounts
All passwords: see above

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs -f

# Restart all services
docker-compose restart

# Or start fresh
docker-compose down
docker-compose up -d
```

### Database Won't Initialize

```bash
# Check database logs
docker-compose logs db

# If needed, reset database (WARNING: Deletes all data!)
docker-compose down -v
docker-compose up -d
```

### Can't Access Studio

```bash
# Check Studio logs
docker-compose logs studio

# Restart Studio
docker-compose restart studio
```

### Services Are Slow

First startup can be slow (5-10 minutes). Be patient!

Check if your Docker has enough resources:
- Docker Desktop → Settings → Resources
- Recommended: 4GB RAM, 2 CPUs

## Useful Commands

```bash
# See all services status
docker-compose ps

# See logs from all services
docker-compose logs -f

# See logs from specific service
docker-compose logs -f db

# Restart a service
docker-compose restart auth

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Reset everything (deletes data!)
docker-compose down -v
docker-compose up -d
```

## What Happens on First Start

1. **Database initializes** (30 seconds)
   - Creates roles and extensions
   - Runs RBAC migration
   - Seeds test accounts and sample data

2. **Auth server starts** (10 seconds)
   - Connects to database
   - Configures JWT

3. **Other services start** (30 seconds)
   - Kong gateway
   - REST API
   - Realtime
   - Storage
   - Studio

4. **Healthchecks complete** (2-3 minutes)
   - All services report healthy

**Total time: 5-10 minutes**

## Success Indicators

✅ All 11 containers showing "Up (healthy)"
✅ Can access Studio at http://localhost:3001
✅ See 6 tables in Table Editor
✅ See 3 users in Authentication
✅ Can login to your app at http://localhost:3000
✅ Redirected to correct page based on role

## Next Steps After Setup

1. **Explore Studio** - Manage database, users, storage
2. **Test Each Role** - Login with all 3 accounts
3. **Add Your Data** - Create your own products/customers
4. **Customize** - Modify routes, add features
5. **Deploy** - Follow SELF_HOSTED_SUPABASE_GUIDE.md for production

## Production Deployment

When ready for production:
1. Get a VPS (Digital Ocean, Linode, etc.)
2. Install Docker on VPS
3. Copy your files to VPS
4. Update `.env` with your domain
5. Setup SSL with Let's Encrypt
6. Run `docker-compose up -d`

See `SELF_HOSTED_SUPABASE_GUIDE.md` for complete production guide.

## Need Help?

- Check logs: `docker-compose logs -f`
- Read guide: `SELF_HOSTED_SUPABASE_GUIDE.md`
- Check Supabase docs: https://supabase.com/docs/guides/self-hosting

---

**Current status**: Docker is downloading images. Check back in 5-10 minutes and continue from Step 2 above!

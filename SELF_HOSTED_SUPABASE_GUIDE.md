# Self-Hosted Supabase Deployment Guide

This guide will help you deploy a self-hosted Supabase instance for your POS system.

## Why Self-Host Supabase?

- **Full Control**: Complete ownership of your data and infrastructure
- **Cost Savings**: No usage limits or per-user pricing
- **Data Privacy**: Data stays on your infrastructure
- **Customization**: Full access to modify any component
- **Compliance**: Meet specific regulatory requirements

## Architecture Overview

The self-hosted Supabase stack includes:

- **PostgreSQL** - Database with pgvector extension
- **PostgREST** - RESTful API for PostgreSQL
- **GoTrue** - User authentication and management
- **Kong** - API gateway and reverse proxy
- **Realtime** - WebSocket server for real-time features
- **Storage API** - Object storage (S3-compatible)
- **Studio** - Web-based database management UI
- **Analytics** - Log collection and analytics
- **Vector** - Log aggregation
- **imgproxy** - Image transformation

## Prerequisites

### Required Software

1. **Docker & Docker Compose**
   ```bash
   # Install Docker Desktop (includes Docker Compose)
   # macOS: https://docs.docker.com/desktop/install/mac-install/
   # Linux: https://docs.docker.com/engine/install/
   # Windows: https://docs.docker.com/desktop/install/windows-install/
   ```

2. **Git** (for version control)
   ```bash
   git --version
   ```

### System Requirements

**Minimum (Development)**:
- CPU: 2 cores
- RAM: 4GB
- Storage: 10GB

**Recommended (Production)**:
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- Network: Static IP or domain name

## Quick Start (Local Development)

### 1. Generate Secrets

Before starting, you need to generate secure secrets. Use these commands:

```bash
# Generate JWT Secret (at least 32 characters)
openssl rand -base64 32

# Generate strong password for PostgreSQL
openssl rand -base64 32

# Generate Logflare API key
openssl rand -base64 32
```

### 2. Configure Environment Variables

Edit `.env.production` file and update these critical values:

```bash
# IMPORTANT: Change these before running!
POSTGRES_PASSWORD=your-generated-postgres-password
JWT_SECRET=your-generated-jwt-secret
LOGFLARE_API_KEY=your-generated-logflare-key
DASHBOARD_PASSWORD=your-dashboard-password

# Update these for your domain
API_EXTERNAL_URL=http://localhost:8000  # Change to your domain in production
SITE_URL=http://localhost:3000          # Your Next.js app URL
```

### 3. Generate JWT Keys

You need to generate proper ANON_KEY and SERVICE_ROLE_KEY using your JWT_SECRET:

**Option 1: Use Online Generator**
Visit https://supabase.com/docs/guides/self-hosting/docker#api-keys

**Option 2: Use JWT.io**
1. Go to https://jwt.io
2. Set algorithm to HS256
3. Payload:
   ```json
   {
     "iss": "supabase",
     "role": "anon",
     "iat": 1641000000,
     "exp": 2000000000
   }
   ```
4. Use your JWT_SECRET in the signature section
5. Copy the generated token to ANON_KEY

Repeat for SERVICE_ROLE_KEY with `"role": "service_role"`

### 4. Start Supabase

```bash
# Load environment variables
source .env.production

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Wait for Services to Initialize

First startup takes 2-5 minutes. Check if all services are healthy:

```bash
# Check all containers are running
docker-compose ps

# All should show "healthy" status
```

### 6. Access Services

Once all services are healthy:

- **API Gateway**: http://localhost:8000
- **Studio (Dashboard)**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Analytics**: http://localhost:4000

### 7. Login to Studio

1. Open http://localhost:3001
2. Login with credentials from `.env.production`:
   - Username: Value of `DASHBOARD_USERNAME`
   - Password: Value of `DASHBOARD_PASSWORD`

### 8. Verify Database Setup

In Studio:
1. Go to "Table Editor"
2. You should see these tables:
   - `user_profiles`
   - `products`
   - `customers`
   - `transactions`
   - `transaction_items`
   - `audit_logs`

3. Go to "Authentication" > "Users"
4. You should see 3 test users:
   - admin@posystem.local
   - cashier@posystem.local
   - stock@posystem.local

### 9. Update Next.js Configuration

Update your Next.js `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-env-production
```

### 10. Start Your Application

```bash
npm run dev
```

Visit http://localhost:3000 and login with test accounts!

## Production Deployment

### Option 1: Single Server Deployment

For small to medium workloads, deploy on a single VPS:

#### Recommended Providers:
- **DigitalOcean** - $24/month (4GB RAM, 2 vCPU)
- **Linode** - $24/month (4GB RAM, 2 vCPU)
- **Hetzner** - €9.50/month (4GB RAM, 2 vCPU)
- **AWS EC2** - t3.medium instance
- **Google Cloud** - e2-medium instance

#### Deployment Steps:

1. **Setup Server**
   ```bash
   # SSH into your server
   ssh root@your-server-ip

   # Update system
   apt update && apt upgrade -y

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh

   # Install Docker Compose
   apt install docker-compose-plugin -y
   ```

2. **Deploy Application**
   ```bash
   # Clone your repository
   git clone https://github.com/your-username/pos-system.git
   cd pos-system

   # Copy and edit production environment
   cp .env.production .env
   nano .env  # Update with your production values

   # Start services
   docker-compose up -d
   ```

3. **Setup Domain & SSL**
   ```bash
   # Install Nginx
   apt install nginx certbot python3-certbot-nginx -y

   # Create Nginx config
   nano /etc/nginx/sites-available/pos-api

   # Add this configuration:
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }

   # Enable site
   ln -s /etc/nginx/sites-available/pos-api /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx

   # Get SSL certificate
   certbot --nginx -d api.yourdomain.com
   ```

4. **Update Environment Variables**
   ```bash
   # Update .env with your domain
   API_EXTERNAL_URL=https://api.yourdomain.com
   SITE_URL=https://yourdomain.com

   # Restart services
   docker-compose down
   docker-compose up -d
   ```

### Option 2: Google Cloud Run Deployment

Deploy each service separately using Cloud Run:

```bash
# Build and deploy Auth service
gcloud run deploy supabase-auth \
  --source ./volumes/auth \
  --region=asia-south1 \
  --allow-unauthenticated

# Repeat for other services...
```

See [Google Cloud Run guide](https://cloud.google.com/run/docs/quickstarts/build-and-deploy) for details.

### Option 3: Kubernetes Deployment

For large scale deployments, use Kubernetes:

```bash
# Use official Supabase Helm charts
helm repo add supabase https://supabase.github.io/helm-charts
helm install supabase supabase/supabase
```

## Configuration

### Email Setup (SMTP)

For production, configure a real SMTP server:

```bash
# Using Gmail (requires App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SENDER_NAME=POS System

# Using SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# Using Mailgun
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

### Database Backups

#### Automated Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-supabase.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/supabase"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
docker exec supabase-db pg_dump -U supabase_admin postgres | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup storage
tar -czf "$BACKUP_DIR/storage_$DATE.tar.gz" ./volumes/storage/

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/backup-supabase.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-supabase.sh" | crontab -
```

#### Manual Backup

```bash
# Database backup
docker exec supabase-db pg_dump -U supabase_admin postgres > backup.sql

# Restore from backup
cat backup.sql | docker exec -i supabase-db psql -U supabase_admin postgres
```

### Monitoring

#### Health Checks

```bash
# Check all services
curl http://localhost:8000/rest/v1/

# Check specific services
docker-compose ps
docker-compose logs -f [service-name]
```

#### Resource Monitoring

```bash
# Monitor container resources
docker stats

# Check disk usage
docker system df
```

### Scaling

#### Vertical Scaling (Single Server)

Increase resources on your server:
```bash
# Update Docker resource limits in docker-compose.yml
services:
  db:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

#### Horizontal Scaling (Multiple Servers)

For high availability:
1. Setup PostgreSQL replication
2. Deploy multiple instances of services
3. Use load balancer (HAProxy, Nginx)
4. Setup shared storage (S3, NFS)

## Maintenance

### Updating Supabase

```bash
# Backup first!
./backup-supabase.sh

# Pull new images
docker-compose pull

# Restart services
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Database Migrations

To apply new migrations:

```bash
# Add migration SQL to volumes/db/init/
# Then restart database
docker-compose restart db
```

Or use Studio SQL editor to run migrations manually.

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated unique JWT_SECRET
- [ ] Set strong POSTGRES_PASSWORD
- [ ] Updated ANON_KEY and SERVICE_ROLE_KEY
- [ ] Enabled SSL/TLS (use Certbot)
- [ ] Setup firewall rules
- [ ] Configured automated backups
- [ ] Setup monitoring/alerting
- [ ] Restricted Studio access (use VPN or IP whitelist)
- [ ] Enabled audit logging
- [ ] Regular security updates

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check memory
free -h

# Restart specific service
docker-compose restart [service-name]
```

### Database Connection Errors

```bash
# Check if database is ready
docker exec supabase-db pg_isready -U postgres

# Reset database
docker-compose down -v  # WARNING: Deletes all data!
docker-compose up -d
```

### Authentication Not Working

```bash
# Verify JWT_SECRET matches
echo $JWT_SECRET

# Check ANON_KEY is correct
# Decode at https://jwt.io to verify secret

# Restart auth service
docker-compose restart auth
```

### Can't Access Studio

```bash
# Check Studio is running
docker-compose ps studio

# Check credentials
echo $DASHBOARD_USERNAME
echo $DASHBOARD_PASSWORD

# Restart Studio
docker-compose restart studio
```

## Performance Tuning

### PostgreSQL Optimization

Edit `volumes/db/postgresql.conf`:

```conf
# For 8GB RAM server
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10485kB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
```

### Connection Pooling

For high traffic, add PgBouncer:

```yaml
# Add to docker-compose.yml
pgbouncer:
  image: pgbouncer/pgbouncer
  environment:
    DATABASES_HOST: db
    DATABASES_PORT: 5432
    DATABASES_DBNAME: postgres
    PGBOUNCER_AUTH_TYPE: md5
  ports:
    - "6432:6432"
```

## Cost Estimation

**Monthly costs for self-hosting**:

| Component | Development | Production |
|-----------|-------------|------------|
| Server | $0 (local) | $24-100 |
| Domain | $0 (localhost) | $12/year |
| SSL | $0 (self-signed) | $0 (Let's Encrypt) |
| Backups | $0 (local) | $5-20 |
| Monitoring | $0 (Docker stats) | $0-50 |
| **Total/month** | **$0** | **$26-150** |

Compare to Supabase Cloud:
- Free tier: $0 (limited)
- Pro: $25/month + usage
- Team: $599/month
- Enterprise: Custom pricing

## Support & Resources

- **Official Docs**: https://supabase.com/docs/guides/self-hosting
- **GitHub**: https://github.com/supabase/supabase
- **Discord**: https://discord.supabase.com
- **Docker Hub**: https://hub.docker.com/u/supabase

## Next Steps

1. ✅ Complete this setup guide
2. ✅ Test all features locally
3. ✅ Setup monitoring
4. ✅ Configure backups
5. ✅ Deploy to production
6. ✅ Setup domain and SSL
7. ✅ Configure email (SMTP)
8. ✅ Load test your setup
9. ✅ Document your specific configuration
10. ✅ Train your team

---

**Need Help?** Check the troubleshooting section or consult the official Supabase self-hosting documentation.

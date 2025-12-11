#!/bin/bash

# Self-Hosted Supabase Startup Script for POS System
set -e

echo "================================"
echo "POS System - Self-Hosted Supabase"
echo "================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi
echo "✅ Docker is running"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed"
    echo "Install it with: sudo apt install docker-compose-plugin"
    exit 1
fi
echo "✅ docker-compose is available"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo ""
    echo "⚠️  Warning: .env.production not found"
    echo "Please create it from .env.production and configure your secrets"
    echo ""
    echo "Required steps:"
    echo "1. Generate secrets:"
    echo "   openssl rand -base64 32  # For JWT_SECRET"
    echo "   openssl rand -base64 32  # For POSTGRES_PASSWORD"
    echo "   openssl rand -base64 32  # For LOGFLARE_API_KEY"
    echo ""
    echo "2. Generate JWT tokens at https://supabase.com/docs/guides/self-hosting/docker#api-keys"
    echo ""
    echo "3. Update .env.production with generated values"
    exit 1
fi
echo "✅ .env.production exists"

# Source environment variables
set -a
source .env.production
set +a

echo ""
echo "🚀 Starting self-hosted Supabase..."
echo ""

# Create necessary directories
mkdir -p volumes/db/data
mkdir -p volumes/storage
mkdir -p volumes/api
mkdir -p volumes/logs
mkdir -p volumes/db/init

echo "📁 Created volume directories"
echo ""

# Check if this is first run
if [ ! -d "volumes/db/data/base" ]; then
    echo "📋 First time setup detected"
    echo "This will:"
    echo "  - Initialize PostgreSQL database"
    echo "  - Setup authentication system"
    echo "  - Create user roles and permissions"
    echo "  - Seed test accounts"
    echo "  - Start all Supabase services"
    echo ""
    echo "This may take 5-10 minutes..."
    echo ""
fi

# Start all services
docker-compose up -d

echo ""
echo "⏳ Waiting for services to become healthy..."
echo "This may take a few minutes on first start..."
echo ""

# Wait for services to be healthy
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
    # Check if key services are healthy
    db_healthy=$(docker inspect --format='{{.State.Health.Status}}' supabase-db 2>/dev/null || echo "starting")
    auth_healthy=$(docker inspect --format='{{.State.Health.Status}}' supabase-auth 2>/dev/null || echo "starting")

    if [ "$db_healthy" = "healthy" ] && [ "$auth_healthy" = "healthy" ]; then
        echo "✅ Services are healthy!"
        break
    fi

    attempt=$((attempt + 1))
    echo "⏳ Waiting... ($attempt/$max_attempts) DB: $db_healthy, Auth: $auth_healthy"
    sleep 5
done

if [ $attempt -eq $max_attempts ]; then
    echo ""
    echo "⚠️  Services took longer than expected to start"
    echo "Check logs with: docker-compose logs"
    echo ""
fi

echo ""
echo "================================"
echo "✅ Self-Hosted Supabase is Running!"
echo "================================"
echo ""
echo "📋 Service URLs:"
echo "  - API Gateway: ${API_EXTERNAL_URL}"
echo "  - Studio UI: http://localhost:3001"
echo "  - PostgreSQL: localhost:5432"
echo "  - Analytics: http://localhost:4000"
echo ""
echo "🔐 Studio Credentials:"
echo "  Username: ${DASHBOARD_USERNAME}"
echo "  Password: ${DASHBOARD_PASSWORD}"
echo ""
echo "🔑 Test Accounts:"
echo ""
echo "  Super Admin:"
echo "    Email: admin@posystem.local"
echo "    Password: admin123"
echo ""
echo "  Cashier:"
echo "    Email: cashier@posystem.local"
echo "    Password: cashier123"
echo ""
echo "  Stock Manager:"
echo "    Email: stock@posystem.local"
echo "    Password: stock123"
echo ""
echo "================================"
echo "📖 Next Steps:"
echo "================================"
echo ""
echo "1. Access Studio UI:"
echo "   open http://localhost:3001"
echo ""
echo "2. Update your Next.js .env.local:"
echo "   NEXT_PUBLIC_SUPABASE_URL=${API_EXTERNAL_URL}"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}"
echo ""
echo "3. Start your Next.js app:"
echo "   npm run dev"
echo ""
echo "4. Open your app:"
echo "   open http://localhost:3000"
echo ""
echo "5. View service logs:"
echo "   docker-compose logs -f"
echo ""
echo "6. Stop services:"
echo "   docker-compose down"
echo ""
echo "7. View service status:"
echo "   docker-compose ps"
echo ""
echo "📚 Documentation:"
echo "  - SELF_HOSTED_SUPABASE_GUIDE.md"
echo "  - TEST_ACCOUNTS.md"
echo ""
echo "⚠️  IMPORTANT FOR PRODUCTION:"
echo "  - Change all default passwords"
echo "  - Setup SSL/TLS certificates"
echo "  - Configure automated backups"
echo "  - Setup monitoring"
echo "  - Update API_EXTERNAL_URL to your domain"
echo ""

#!/bin/bash

# Supabase Setup Script for POS System
# This script helps automate the Supabase setup process

set -e  # Exit on error

echo "================================"
echo "POS System - Supabase Setup"
echo "================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi
echo "✅ Docker is running"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi
echo "✅ Supabase CLI is installed"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo ""
    echo "📝 Creating .env.local from template..."
    cp .env.local.example .env.local
    echo "✅ Created .env.local"
    echo ""
    echo "⚠️  Note: Using local development URLs by default"
fi

# Start Supabase
echo ""
echo "🚀 Starting Supabase local development environment..."
echo "This will:"
echo "  - Start PostgreSQL database"
echo "  - Start Auth server"
echo "  - Start Realtime server"
echo "  - Start Storage server"
echo "  - Run database migrations"
echo "  - Seed test data"
echo ""

supabase start

if [ $? -eq 0 ]; then
    echo ""
    echo "================================"
    echo "✅ Supabase is running!"
    echo "================================"
    echo ""
    echo "📋 Access URLs:"
    echo "  - API URL: http://127.0.0.1:54321"
    echo "  - Studio: http://localhost:54323"
    echo "  - Inbucket (emails): http://localhost:54324"
    echo ""
    echo "🔑 Test Accounts:"
    echo ""
    echo "  Super Admin:"
    echo "    Email: admin@posystem.local"
    echo "    Password: admin123"
    echo "    Default Page: /reports"
    echo ""
    echo "  Cashier:"
    echo "    Email: cashier@posystem.local"
    echo "    Password: cashier123"
    echo "    Default Page: /checkout"
    echo ""
    echo "  Stock Manager:"
    echo "    Email: stock@posystem.local"
    echo "    Password: stock123"
    echo "    Default Page: /products"
    echo ""
    echo "================================"
    echo "📖 Next Steps:"
    echo "================================"
    echo ""
    echo "1. Start your Next.js dev server:"
    echo "   npm run dev"
    echo ""
    echo "2. Open http://localhost:3000"
    echo ""
    echo "3. Login with one of the test accounts above"
    echo ""
    echo "4. To stop Supabase:"
    echo "   supabase stop"
    echo ""
    echo "5. To view Supabase Studio:"
    echo "   open http://localhost:54323"
    echo ""
    echo "📚 For more details, see:"
    echo "  - SUPABASE_AUTH_SETUP.md"
    echo "  - TEST_ACCOUNTS.md"
    echo "  - RBAC_IMPLEMENTATION_SUMMARY.md"
    echo ""
else
    echo ""
    echo "❌ Failed to start Supabase"
    echo "Check the error messages above and try again"
    exit 1
fi

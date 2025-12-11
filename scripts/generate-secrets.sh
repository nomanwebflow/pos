#!/bin/bash

# Generate Secrets for Self-Hosted Supabase
echo "================================"
echo "Supabase Secret Generator"
echo "================================"
echo ""
echo "This script will generate secure secrets for your self-hosted Supabase instance."
echo ""

# Generate secrets
echo "🔐 Generating secrets..."
echo ""

POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
LOGFLARE_API_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
DASHBOARD_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

echo "✅ Secrets generated!"
echo ""
echo "================================"
echo "Copy these to your .env.production file:"
echo "================================"
echo ""
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo "JWT_SECRET=$JWT_SECRET"
echo "LOGFLARE_API_KEY=$LOGFLARE_API_KEY"
echo "DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD"
echo ""
echo "================================"
echo "⚠️  IMPORTANT - JWT Keys"
echo "================================"
echo ""
echo "You also need to generate ANON_KEY and SERVICE_ROLE_KEY."
echo ""
echo "Method 1 - Using Node.js (if installed):"
echo ""
echo "Run this command with your JWT_SECRET:"
echo ""
cat << 'EOF'
node -e "
const jwt = require('jsonwebtoken');
const secret = 'YOUR_JWT_SECRET';

const anonToken = jwt.sign(
  { iss: 'supabase', role: 'anon', iat: 1641000000, exp: 2000000000 },
  secret
);

const serviceToken = jwt.sign(
  { iss: 'supabase', role: 'service_role', iat: 1641000000, exp: 2000000000 },
  secret
);

console.log('ANON_KEY=' + anonToken);
console.log('SERVICE_ROLE_KEY=' + serviceToken);
"
EOF
echo ""
echo "Replace 'YOUR_JWT_SECRET' with: $JWT_SECRET"
echo ""
echo "Method 2 - Using Online Tool:"
echo ""
echo "1. Visit https://jwt.io"
echo "2. Select algorithm: HS256"
echo "3. For ANON_KEY, use this payload:"
echo '   {"iss":"supabase","role":"anon","iat":1641000000,"exp":2000000000}'
echo ""
echo "4. In the signature section, paste your JWT_SECRET: $JWT_SECRET"
echo "5. Copy the generated token as ANON_KEY"
echo ""
echo "6. Repeat for SERVICE_ROLE_KEY with payload:"
echo '   {"iss":"supabase","role":"service_role","iat":1641000000,"exp":2000000000}'
echo ""
echo "================================"
echo "📝 Next Steps:"
echo "================================"
echo ""
echo "1. Copy the secrets above to .env.production"
echo "2. Generate and add ANON_KEY and SERVICE_ROLE_KEY"
echo "3. Update API_EXTERNAL_URL and SITE_URL if needed"
echo "4. Run: ./scripts/start-self-hosted.sh"
echo ""
echo "⚠️  Keep these secrets secure! Do not commit them to git."
echo ""

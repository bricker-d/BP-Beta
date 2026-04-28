#!/bin/bash
# Run once to set Vercel env vars for BioPrecision
# Usage: VERCEL_TOKEN=your_token bash scripts/setup-vercel-env.sh
# Get token at: https://vercel.com/account/tokens

VERCEL_TOKEN=${VERCEL_TOKEN:-""}
if [ -z "$VERCEL_TOKEN" ]; then
  echo "Set VERCEL_TOKEN first: export VERCEL_TOKEN=xxxx"
  exit 1
fi

set_env() {
  curl -s -X POST "https://api.vercel.com/v10/projects/bp-beta/env?teamId=dan-brickers-projects" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$1\",\"value\":\"$2\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\"]}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if 'id' in d else 'ERR', '$1')"
}

set_env "NEXT_PUBLIC_SUPABASE_URL" "https://lrblvcixijbbfxiutgnp.supabase.co"
set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYmx2Y2l4aWpiYmZ4aXV0Z25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTU0OTUsImV4cCI6MjA5Mjk3MTQ5NX0.WgBIwYNy16GF4_6pGP1lCURrV1AYAtvJasQlFL-r5IY"
# Get your Anthropic API key from https://console.anthropic.com
set_env "ANTHROPIC_API_KEY" "${ANTHROPIC_API_KEY_VALUE:-YOUR_ANTHROPIC_KEY_HERE}"

echo "Done. Redeploy at: https://vercel.com/dan-brickers-projects/bp-beta/deployments"

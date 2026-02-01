#!/usr/bin/env bash
# Generates .env.local from the running local Supabase stack.
# Requires: supabase CLI, jq, and a running `supabase start` instance.

set -euo pipefail

if ! command -v supabase &> /dev/null; then
  echo "Error: supabase CLI not found. Install with: bun add -g supabase" >&2
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "Error: jq not found. Install with: brew install jq (macOS) or apt-get install jq (Linux)" >&2
  exit 1
fi

STATUS=$(supabase status --output json 2>/dev/null) || {
  echo "Error: Could not get supabase status. Is the local stack running? Run: supabase start" >&2
  exit 1
}

API_URL=$(echo "$STATUS" | jq -r '.API_URL // .api_url')
ANON_KEY=$(echo "$STATUS" | jq -r '.ANON_KEY // .anon_key')

if [ -z "$API_URL" ] || [ "$API_URL" = "null" ]; then
  echo "Error: Could not parse API_URL from supabase status" >&2
  exit 1
fi

ENV_FILE="$(dirname "$0")/../.env.local"

cat > "$ENV_FILE" <<EOF
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
EOF

echo "Wrote $ENV_FILE"

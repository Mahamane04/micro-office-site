#!/bin/bash
# Test webhook revalidation locally or on staging

# Configuration
WEBHOOK_URL="${1:-http://localhost:8888/.netlify/functions/revalidate}"
WEBHOOK_SECRET="${NETLIFY_ISR_SECRET:-dev-secret}"
TABLE="${2:-Produits}"
ACTION="${3:-updated}"
SLUG="${4:-test-product}"

echo "Testing webhook revalidation..."
echo "URL: $WEBHOOK_URL"
echo "Secret: $WEBHOOK_SECRET"
echo "Table: $TABLE"

# Send webhook payload
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $WEBHOOK_SECRET" \
  -d "{
    \"table\": \"$TABLE\",
    \"action\": \"$ACTION\",
    \"record\": {
      \"id\": \"rec123456\",
      \"slug\": \"$SLUG\",
      \"nom\": \"Test Product\"
    },
    \"timestamp\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\"
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Webhook test completed!"

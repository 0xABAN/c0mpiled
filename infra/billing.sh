#!/usr/bin/env bash
# Add only the four billing operations this app uses. The beta requires Resource:*;
# it does not yet authorize app ARNs. Live checkout is limited to operator-prepared products.
# Usage: infra/billing.sh <env-file> [compute-role-name]
# Does not change application env vars or trigger a deployment.
set -euo pipefail

env_file="${1:?Usage: infra/billing.sh <env-file> [compute-role-name]}"
role="${2:-roster-dev-amplify-compute}"
node --env-file="$env_file" -e '
  const arn = process.env.MONETIZATION_APP_ID;
  if (!/^arn:aws:appmonetization:[a-z0-9-]+:[0-9]{12}:apps\/[a-zA-Z0-9_-]+(\/sandbox)?$/.test(arn ?? "")) {
    throw new Error("MONETIZATION_APP_ID must be the dedicated app ARN (live or sandbox).");
  }
'

aws iam put-role-policy --role-name "$role" --policy-name roster-sandbox-billing --policy-document "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Effect\": \"Allow\",
    \"Action\": [
      \"appmonetization:CreateMetric\",
      \"appmonetization:CreateOneTimePayment\",
      \"appmonetization:CreateOneTimeCheckoutSession\",
      \"appmonetization:GetEntitlementDecision\"
    ],
    \"Resource\": \"*\"
  }]
}"
echo "Four beta billing permissions attached to ${role} across monetization resources; no deployment started."

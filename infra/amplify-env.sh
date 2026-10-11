#!/usr/bin/env bash
#
# Replaces the Amplify app's environment variables with the runtime ones in an env file, then
# redeploys `main` so the new values are built in (amplify.yml writes them to .env.production).
#
# Usage:
#
#   infra/amplify-env.sh <app-id> <env-file>      # e.g. infra/amplify-env.sh d2sgexxgcmts1q .env.local

set -euo pipefail

app_id="${1:?Usage: infra/amplify-env.sh <app-id> <env-file>}"
env_file="${2:?Usage: infra/amplify-env.sh <app-id> <env-file>}"
region="${APP_REGION:-us-east-1}"

env_json=$(node "$(dirname "$0")/lib/app-env.mjs" "$env_file")

aws amplify update-app --region "$region" --app-id "$app_id" --environment-variables "$env_json" >/dev/null
aws amplify start-job --region "$region" --app-id "$app_id" --branch-name main --job-type RELEASE \
  --query 'jobSummary.jobId' --output text | sed 's/^/Started deploy job /'

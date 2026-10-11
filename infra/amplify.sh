#!/usr/bin/env bash
#
# Creates the Amplify Hosting app that builds Roster from GitHub and serves it with SSR, plus
# the IAM role its server code runs as.
#
# Usage:
#
#   infra/amplify.sh <env-file> [stage]      # e.g. infra/amplify.sh .env.local; stage defaults to "dev"
#
# - The runtime env vars in <env-file> (DATABASE_URL, APP_REGION, RESUME_BUCKET, BEDROCK_MODEL_ID,
#   NEXT_PUBLIC_*) become the app's environment; amplify.yml writes them into .env.production.
# - The compute role can read, write, and delete objects in the resume bucket, and call Anthropic
#   models on Bedrock (for parsing). Nothing else.
# - Amplify reads the repo with your `gh` login's token and adds a webhook, so every push to `main`
#   deploys.
#
# Prints the app id and URL. Refuses to run if the app or role already exists.

set -euo pipefail

env_file="${1:?Usage: infra/amplify.sh <env-file> [stage]}"
stage="${2:-dev}"
region="${APP_REGION:-us-east-1}"
repo="https://github.com/0xABAN/c0mpiled"
branch="main"
app_name="roster-${stage}"
role_name="roster-${stage}-amplify-compute"

# The runtime env vars the app needs, as JSON.
env_json=$(node "$(dirname "$0")/lib/app-env.mjs" "$env_file")
bucket=$(node -e 'console.log(JSON.parse(process.argv[1]).RESUME_BUCKET)' "$env_json")
account_id=$(aws sts get-caller-identity --query Account --output text)

if [[ -n $(aws amplify list-apps --region "$region" --query "apps[?name=='${app_name}'].appId" --output text) ]]; then
  echo "Amplify app ${app_name} already exists." >&2
  exit 1
fi

role_arn=$(aws iam create-role --role-name "$role_name" \
  --description "Runtime role for the ${app_name} Amplify app's server code" \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{ "Effect": "Allow", "Principal": { "Service": "amplify.amazonaws.com" }, "Action": "sts:AssumeRole" }]
  }' \
  --query 'Role.Arn' --output text)

aws iam put-role-policy --role-name "$role_name" --policy-name roster-runtime --policy-document "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {
      \"Sid\": \"ResumeFiles\",
      \"Effect\": \"Allow\",
      \"Action\": [\"s3:GetObject\", \"s3:PutObject\", \"s3:DeleteObject\"],
      \"Resource\": \"arn:aws:s3:::${bucket}/*\"
    },
    {
      \"Sid\": \"ParseResumes\",
      \"Effect\": \"Allow\",
      \"Action\": \"bedrock:InvokeModel\",
      \"Resource\": [
        \"arn:aws:bedrock:*::foundation-model/anthropic.*\",
        \"arn:aws:bedrock:*:${account_id}:inference-profile/us.anthropic.*\"
      ]
    }
  ]
}"

# A new role takes a few seconds to become usable by other AWS services.
sleep 10

app_id=$(aws amplify create-app --region "$region" \
  --name "$app_name" \
  --repository "$repo" \
  --access-token "$(gh auth token)" \
  --platform WEB_COMPUTE \
  --compute-role-arn "$role_arn" \
  --environment-variables "$env_json" \
  --query 'app.appId' --output text)

aws amplify create-branch --region "$region" \
  --app-id "$app_id" \
  --branch-name "$branch" \
  --stage PRODUCTION \
  --framework "Next.js - SSR" \
  --enable-auto-build >/dev/null

echo "AMPLIFY_APP_ID=${app_id}"
echo "APP_URL=https://${branch}.${app_id}.amplifyapp.com"

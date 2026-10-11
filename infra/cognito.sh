#!/usr/bin/env bash
#
# Creates the Cognito user pool and web client that Roster signs users in with.
#
# Usage (prints env lines for .env.local; the IDs aren't secret):
#
#   infra/cognito.sh [stage] >> .env.local      # stage defaults to "dev"
#
# Pool settings:
#   - Users sign in with their email; Cognito emails a code to verify it.
#   - Lite tier: enough for email + password, the cheapest per active user.
#   - Default Cognito email sender: capped at 50 emails a day per AWS account.
#     Switch to SES before real launch (see AGENTS.md).
#   - The web client has no secret, because the browser (Amplify <Authenticator>) uses it.
#
# The script refuses to run if a pool with the same name already exists.

set -euo pipefail

stage="${1:-dev}"
pool_name="roster-${stage}"
region="${APP_REGION:-us-east-1}"

existing=$(aws cognito-idp list-user-pools --region "$region" --max-results 60 \
  --query "UserPools[?Name=='${pool_name}'].Id" --output text)
if [[ -n "$existing" ]]; then
  echo "User pool ${pool_name} already exists (${existing})." >&2
  exit 1
fi

pool_id=$(aws cognito-idp create-user-pool --region "$region" \
  --pool-name "$pool_name" \
  --user-pool-tier LITE \
  --deletion-protection ACTIVE \
  --username-attributes email \
  --auto-verified-attributes email \
  --username-configuration CaseSensitive=false \
  --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=false,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}' \
  --account-recovery-setting 'RecoveryMechanisms=[{Priority=1,Name=verified_email}]' \
  --admin-create-user-config AllowAdminCreateUserOnly=false \
  --email-configuration EmailSendingAccount=COGNITO_DEFAULT \
  --verification-message-template 'DefaultEmailOption=CONFIRM_WITH_CODE,EmailSubject="Your Roster code",EmailMessage="Your Roster verification code is {####}"' \
  --query 'UserPool.Id' --output text)

client_id=$(aws cognito-idp create-user-pool-client --region "$region" \
  --user-pool-id "$pool_id" \
  --client-name "roster-web" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --prevent-user-existence-errors ENABLED \
  --query 'UserPoolClient.ClientId' --output text)

echo "APP_REGION=${region}"
echo "NEXT_PUBLIC_COGNITO_USER_POOL_ID=${pool_id}"
echo "NEXT_PUBLIC_COGNITO_CLIENT_ID=${client_id}"

#!/usr/bin/env bash
#
# Creates the private S3 bucket that stores resume PDFs.
#
# Usage (prints an env line for .env.local):
#
#   infra/s3.sh [stage] >> .env.local      # stage defaults to "dev"
#
# The bucket is private: all public access is blocked, objects are encrypted at rest (SSE-S3),
# and only the server reads or writes it. Recruiters download through short-lived presigned
# URLs. Bucket names are global, so the AWS account id is part of the name.
#
# The script refuses to run if the bucket already exists.

set -euo pipefail

stage="${1:-dev}"
region="${APP_REGION:-us-east-1}"
account_id=$(aws sts get-caller-identity --query Account --output text)
bucket="roster-resumes-${stage}-${account_id}"

if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
  echo "Bucket ${bucket} already exists." >&2
  exit 1
fi

# us-east-1 is the one region that rejects an explicit LocationConstraint.
if [[ "$region" == "us-east-1" ]]; then
  aws s3api create-bucket --bucket "$bucket" --region "$region" >/dev/null
else
  aws s3api create-bucket --bucket "$bucket" --region "$region" \
    --create-bucket-configuration "LocationConstraint=${region}" >/dev/null
fi

aws s3api put-public-access-block --bucket "$bucket" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-encryption --bucket "$bucket" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'

echo "RESUME_BUCKET=${bucket}"

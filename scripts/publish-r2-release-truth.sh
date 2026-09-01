#!/usr/bin/env bash
set -euo pipefail

channel=${1:-}
asset_dir=${2:-release-assets}

case "$channel" in
  predev|dev|test|prod) ;;
  *)
    echo "Unsupported release channel: $channel" >&2
    exit 1
    ;;
esac

for name in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY R2_ACCOUNT_ID R2_BUCKET; do
  if [ -z "${!name:-}" ]; then
    echo "Required R2 environment variable is missing: $name" >&2
    exit 1
  fi
done

apk="$asset_dir/uichat-mira-mobile-release.apk"
checksum="$asset_dir/uichat-mira-mobile-release.apk.sha256"
manifest="$asset_dir/latest.json"

for file in "$apk" "$checksum" "$manifest"; do
  if [ ! -s "$file" ]; then
    echo "Required release truth file is missing or empty: $file" >&2
    exit 1
  fi
done

(
  cd "$asset_dir"
  sha256sum -c uichat-mira-mobile-release.apk.sha256
)

version=$(node -e "const m=require('./${manifest}'); process.stdout.write(m.version)")
manifest_channel=$(node -e "const m=require('./${manifest}'); process.stdout.write(m.channel)")
if [ "$manifest_channel" != "$channel" ]; then
  echo "Manifest channel mismatch: expected=$channel actual=$manifest_channel" >&2
  exit 1
fi

endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
channel_root="mira/mobile/${channel}"
release_prefix="${channel_root}/releases/${version}"
latest_prefix="${channel_root}/latest"

object_size() {
  aws s3api head-object \
    --bucket "$R2_BUCKET" \
    --key "$1" \
    --endpoint-url "$endpoint" \
    --query ContentLength \
    --output text
}

verify_object_size() {
  local file=$1
  local key=$2
  local local_size
  local remote_size
  local_size=$(stat -c '%s' "$file")
  remote_size=$(object_size "$key")
  if [ "$local_size" != "$remote_size" ]; then
    echo "R2 verification failed for $key: local=$local_size remote=$remote_size" >&2
    return 1
  fi
}

upload_assets() {
  aws s3 cp "$apk" "s3://${R2_BUCKET}/${release_prefix}/uichat-mira-mobile-release.apk" \
    --endpoint-url "$endpoint" \
    --cache-control 'public, max-age=31536000, immutable' \
    --only-show-errors
  aws s3 cp "$checksum" "s3://${R2_BUCKET}/${release_prefix}/uichat-mira-mobile-release.apk.sha256" \
    --endpoint-url "$endpoint" \
    --cache-control 'public, max-age=31536000, immutable' \
    --only-show-errors

  # Preserve the existing human/tester-friendly fixed latest mirrors. The
  # client manifest does not point at these mutable objects.
  aws s3 cp "$apk" "s3://${R2_BUCKET}/${latest_prefix}/uichat-mira-mobile-release.apk" \
    --endpoint-url "$endpoint" \
    --cache-control 'public, max-age=300, must-revalidate' \
    --only-show-errors
  aws s3 cp "$checksum" "s3://${R2_BUCKET}/${latest_prefix}/uichat-mira-mobile-release.apk.sha256" \
    --endpoint-url "$endpoint" \
    --cache-control 'public, max-age=300, must-revalidate' \
    --only-show-errors
}

verify_assets() {
  verify_object_size "$apk" "${release_prefix}/uichat-mira-mobile-release.apk"
  verify_object_size "$checksum" "${release_prefix}/uichat-mira-mobile-release.apk.sha256"
  verify_object_size "$apk" "${latest_prefix}/uichat-mira-mobile-release.apk"
  verify_object_size "$checksum" "${latest_prefix}/uichat-mira-mobile-release.apk.sha256"
}

published=false
for attempt in 1 2 3; do
  if upload_assets && verify_assets; then
    published=true
    break
  fi
  echo "R2 asset publication attempt ${attempt} failed." >&2
  if [ "$attempt" -lt 3 ]; then
    sleep $((attempt * 10))
  fi
done

if [ "$published" != true ]; then
  echo 'R2 release assets failed after 3 attempts; latest.json was not changed.' >&2
  exit 1
fi

# Atomic client pointer: publish only after the immutable versioned APK and its
# checksum have been uploaded and verified.
manifest_key="${latest_prefix}/latest.json"
aws s3 cp "$manifest" "s3://${R2_BUCKET}/${manifest_key}" \
  --endpoint-url "$endpoint" \
  --cache-control 'public, max-age=60, must-revalidate' \
  --only-show-errors
verify_object_size "$manifest" "$manifest_key"

echo "Published R2 release truth: ${channel}/${version}"

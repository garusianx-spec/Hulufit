#!/usr/bin/env bash
# HelloFit — Android TWA build.
#
#   ./twa/build.sh init      one-off: generate the Android project + keystore
#   ./twa/build.sh build     produce a release APK and AAB
#   ./twa/build.sh fingerprint  print the SHA-256 for assetlinks.json
#   ./twa/build.sh verify    check the deployed asset links
#
# Requires: Node 20+, JDK 17, Android SDK (Bubblewrap installs one if absent).

set -euo pipefail

HOST="${TWA_HOST:-app.hellofit.ir}"
PACKAGE="${TWA_PACKAGE:-app.hellofit.twa}"
ALIAS="${TWA_KEY_ALIAS:-hellofit}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE="$HERE/android.keystore"

need() { command -v "$1" >/dev/null 2>&1 || { echo "✗ missing: $1"; exit 1; }; }

case "${1:-help}" in

  init)
    need node
    need keytool
    npx --yes @bubblewrap/cli@latest doctor

    if [[ ! -f "$KEYSTORE" ]]; then
      echo "→ creating release keystore (keep this file and its password safe —"
      echo "  losing it means you can never update the listing)"
      keytool -genkeypair -v \
        -keystore "$KEYSTORE" \
        -alias "$ALIAS" \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storetype PKCS12
    fi

    # Bubblewrap reads the live web manifest, so deploy before running this.
    npx --yes @bubblewrap/cli@latest init \
      --manifest "https://$HOST/manifest.json" \
      --directory "$HERE" \
      --chromeosonly false
    echo "✓ project generated in $HERE"
    ;;

  build)
    need node
    ( cd "$HERE" && npx --yes @bubblewrap/cli@latest build --skipPwaValidation )
    echo "✓ artefacts:"
    ls -la "$HERE"/*.apk "$HERE"/*.aab 2>/dev/null || true
    ;;

  fingerprint)
    need keytool
    if [[ ! -f "$KEYSTORE" ]]; then echo "✗ no keystore at $KEYSTORE — run: $0 init"; exit 1; fi
    echo "→ local release key:"
    keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" | grep -i 'SHA256:' | head -1
    cat <<'NOTE'

  If the app ships through Play App Signing, the fingerprint Google re-signs
  with is the one that matters. Take it from:
      Play Console → Release → Setup → App signing → App signing key certificate
  List BOTH (upload key + Play signing key) in assetlinks.json, or the URL bar
  will show for users who install from Play.
NOTE
    ;;

  verify)
    need curl
    echo "→ https://$HOST/.well-known/assetlinks.json"
    curl -fsS "https://$HOST/.well-known/assetlinks.json" | head -40
    echo
    echo "→ Google's statement-list verifier:"
    echo "   https://developers.google.com/digital-asset-links/tools/generator"
    ;;

  *)
    sed -n '2,9p' "${BASH_SOURCE[0]}"
    ;;
esac

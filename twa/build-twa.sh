#!/usr/bin/env bash
# HelloFit — Android TWA release pipeline.
#
#   ./twa/build-twa.sh doctor       check the toolchain
#   ./twa/build-twa.sh render       bubblewrap.json → twa-manifest.json
#   ./twa/build-twa.sh init         generate the Android project (once)
#   ./twa/build-twa.sh build        signed APK + AAB
#   ./twa/build-twa.sh assetlinks   print the statement list for this keystore
#   ./twa/build-twa.sh verify       check the deployed statement list
#   ./twa/build-twa.sh release      render → build → verify, in order
#   ./twa/build-twa.sh clean        remove generated artefacts (keeps the keystore)
#
# Requires: Node 20+, JDK 17. Bubblewrap fetches the Android SDK on first run.
#
# Overrides (all optional):
#   TWA_HOST            app.hellofit.ir
#   TWA_PACKAGE         app.hellofit.twa
#   TWA_VERSION_NAME    read from package.json
#   TWA_VERSION_CODE    commit count, so it always increases
#   TWA_KEYSTORE_PASSWORD / TWA_KEY_PASSWORD   required for a signed build

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SOURCE="$HERE/bubblewrap.json"
RENDERED="$HERE/twa-manifest.json"
KEYSTORE="$HERE/android.keystore"

die() { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }
ok()  { printf '\033[32m✓ %s\033[0m\n' "$1"; }
say() { printf '\033[36m→ %s\033[0m\n' "$1"; }

need() { command -v "$1" >/dev/null 2>&1 || die "missing: $1"; }

bubblewrap() { npx --yes @bubblewrap/cli@latest "$@"; }

host()    { echo "${TWA_HOST:-app.hellofit.ir}"; }
package() { echo "${TWA_PACKAGE:-app.hellofit.twa}"; }

version_name() {
  if [[ -n "${TWA_VERSION_NAME:-}" ]]; then echo "$TWA_VERSION_NAME"; return; fi
  node -p "require('$ROOT/package.json').version" 2>/dev/null || echo "1.0.0"
}

# Play rejects an upload whose versionCode is not higher than the last one, so
# it is derived from the commit count rather than remembered by hand.
version_code() {
  if [[ -n "${TWA_VERSION_CODE:-}" ]]; then echo "$TWA_VERSION_CODE"; return; fi
  git -C "$ROOT" rev-list --count HEAD 2>/dev/null || echo 1
}

render() {
  [[ -f "$SOURCE" ]] || die "no $SOURCE"
  HOST="$(host)" PKG="$(package)" VNAME="$(version_name)" VCODE="$(version_code)" \
  SOURCE="$SOURCE" RENDERED="$RENDERED" node -e '
    const fs = require("node:fs");
    const config = JSON.parse(fs.readFileSync(process.env.SOURCE, "utf8"));
    delete config._comment;

    const host = process.env.HOST;
    const origin = `https://${host}`;
    // Everything that carries the origin is rewritten together, so pointing a
    // build at staging cannot leave one URL aimed at production.
    const retarget = (value) =>
      typeof value === "string" ? value.replace(/https:\/\/[^\/]+/, origin) : value;

    config.host = host;
    config.packageId = process.env.PKG;
    config.appVersionName = process.env.VNAME;
    config.appVersion = process.env.VNAME;
    config.appVersionCode = Number(process.env.VCODE);
    for (const key of ["webManifestUrl", "fullScopeUrl", "iconUrl", "maskableIconUrl", "monochromeIconUrl"]) {
      if (config[key]) config[key] = retarget(config[key]);
    }
    for (const shortcut of config.shortcuts ?? []) {
      shortcut.chosenIconUrl = retarget(shortcut.chosenIconUrl);
    }

    fs.writeFileSync(process.env.RENDERED, JSON.stringify(config, null, 2) + "\n");
  '
  ok "rendered $RENDERED — $(package) $(version_name) (code $(version_code)) → $(host)"
}

case "${1:-help}" in

  doctor)
    need node
    need keytool
    bubblewrap doctor
    ;;

  render)
    need node
    render
    ;;

  init)
    need node
    [[ -f "$KEYSTORE" ]] || die "no keystore — run: ./twa/keystore.sh create"
    render
    # Bubblewrap reads the live web manifest, so the site must be deployed first.
    say "fetching https://$(host)/manifest.json"
    ( cd "$HERE" && bubblewrap init --manifest "https://$(host)/manifest.json" --directory "$HERE" )
    ok "android project generated in $HERE"
    ;;

  build)
    need node
    [[ -f "$RENDERED" ]] || die "no $RENDERED — run: $0 render"
    [[ -f "$KEYSTORE" ]] || die "no keystore — run: ./twa/keystore.sh create"
    [[ -n "${TWA_KEYSTORE_PASSWORD:-}" ]] || die "set TWA_KEYSTORE_PASSWORD for a signed build."

    # Bubblewrap reads these two rather than prompting, which is what makes the
    # build runnable in CI. They stay in the process, never on the command line.
    export BUBBLEWRAP_KEYSTORE_PASSWORD="$TWA_KEYSTORE_PASSWORD"
    export BUBBLEWRAP_KEY_PASSWORD="${TWA_KEY_PASSWORD:-$TWA_KEYSTORE_PASSWORD}"

    ( cd "$HERE" && bubblewrap build --skipPwaValidation )

    say "artefacts:"
    ls -la "$HERE"/*.apk "$HERE"/*.aab 2>/dev/null || die "no artefacts produced."
    ok "upload the .aab to Play; the .apk is for sideload testing"
    ;;

  assetlinks)
    local_fp="$("$HERE/keystore.sh" fingerprint)"
    [[ -n "$local_fp" ]] || die "could not read the fingerprint."
    PKG="$(package)" FP="$local_fp" PLAY_FP="${TWA_PLAY_FINGERPRINT:-}" node -e '
      const fingerprints = [process.env.FP, process.env.PLAY_FP].filter(Boolean);
      console.log(JSON.stringify([{
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: process.env.PKG,
          sha256_cert_fingerprints: fingerprints,
        },
      }], null, 2));
    '
    if [[ -z "${TWA_PLAY_FINGERPRINT:-}" ]]; then
      cat <<'NOTE' >&2

  Only the local upload key is listed. If the app ships through Play App
  Signing, Google re-signs it and that certificate is the one Chrome checks.
  Take it from Play Console → Release → Setup → App signing, then re-run with
  TWA_PLAY_FINGERPRINT=AA:BB:… — otherwise Play installs show a URL bar while
  your sideload looks perfect.
NOTE
    fi
    ;;

  verify)
    need curl
    url="https://$(host)/.well-known/assetlinks.json"
    say "$url"
    body="$(curl -fsS "$url")" || die "statement list not reachable — deploy the web app first."
    echo "$body"
    echo "$body" | grep -q "$(package)" || die "the statement list does not name $(package)."
    echo "$body" | grep -qiE '[0-9A-F]{2}(:[0-9A-F]{2}){31}' || die "no SHA-256 fingerprint in the statement list."
    if grep -q "AA:BB:CC:DD" <<<"$body"; then die "the placeholder fingerprint is still deployed."; fi
    ok "statement list names $(package) and carries a real fingerprint"
    say "cross-check: https://developers.google.com/digital-asset-links/tools/generator"
    ;;

  release)
    "$0" render
    "$0" build
    "$0" verify
    ;;

  clean)
    rm -rf "$HERE"/app "$HERE"/.gradle "$HERE"/build "$HERE"/*.apk "$HERE"/*.aab \
           "$HERE"/*.idsig "$HERE"/twa-manifest.json "$HERE"/gradlew* "$HERE"/gradle \
           "$HERE"/settings.gradle "$HERE"/build.gradle "$HERE"/store_icon.png
    ok "cleaned (the keystore was left alone)"
    ;;

  *)
    sed -n '2,12p' "${BASH_SOURCE[0]}"
    ;;
esac

#!/usr/bin/env bash
# HelloFit — release keystore.
#
#   ./twa/keystore.sh create       generate twa/android.keystore (once, ever)
#   ./twa/keystore.sh fingerprint  print the SHA-256 for assetlinks.json
#   ./twa/keystore.sh check        confirm the keystore opens with the password
#
# The keystore is the app's identity on Google Play. Lose it and the listing
# can never be updated again — there is no recovery, no support ticket, nothing.
# Back up the file AND its passwords somewhere that survives this machine.
#
# Passwords come from the environment so they never land in shell history:
#   TWA_KEYSTORE_PASSWORD   store password
#   TWA_KEY_PASSWORD        key password (defaults to the store password)
# Unset, `create` prompts and `fingerprint` reads from a tty.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE="${TWA_KEYSTORE:-$HERE/android.keystore}"
ALIAS="${TWA_KEY_ALIAS:-hellofit}"
DNAME="${TWA_KEY_DNAME:-CN=HelloFit, OU=Mobile, O=HelloFit, L=Tehran, C=IR}"
VALIDITY="${TWA_KEY_VALIDITY:-10000}"

die() { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }
ok()  { printf '\033[32m✓ %s\033[0m\n' "$1"; }

command -v keytool >/dev/null 2>&1 || die "keytool not found — install a JDK 17 and re-run."

case "${1:-help}" in

  create)
    [[ -f "$KEYSTORE" ]] && die "a keystore already exists at $KEYSTORE — refusing to overwrite it."

    # `-storepass`/`-keypass` are only passed when the caller supplied them;
    # otherwise keytool prompts, which keeps the password off the command line.
    args=(
      -genkeypair -v
      -keystore "$KEYSTORE"
      -alias "$ALIAS"
      -keyalg RSA -keysize 4096
      -validity "$VALIDITY"
      -storetype PKCS12
      -dname "$DNAME"
    )
    if [[ -n "${TWA_KEYSTORE_PASSWORD:-}" ]]; then
      args+=(-storepass "$TWA_KEYSTORE_PASSWORD" -keypass "${TWA_KEY_PASSWORD:-$TWA_KEYSTORE_PASSWORD}")
    fi

    keytool "${args[@]}"
    chmod 600 "$KEYSTORE"
    ok "created $KEYSTORE (alias: $ALIAS, RSA 4096, ${VALIDITY} days)"
    cat <<'WARN'

  Back this up now:
    • the keystore file itself
    • the store password and the key password
    • the alias

  Losing any of them ends the listing. Store them in the team's secret
  manager, not in this repository — twa/android.keystore is git-ignored
  and must stay that way.
WARN
    ;;

  fingerprint)
    [[ -f "$KEYSTORE" ]] || die "no keystore at $KEYSTORE — run: $0 create"
    args=(-list -v -keystore "$KEYSTORE" -alias "$ALIAS")
    [[ -n "${TWA_KEYSTORE_PASSWORD:-}" ]] && args+=(-storepass "$TWA_KEYSTORE_PASSWORD")
    keytool "${args[@]}" | awk '/SHA256:/ { print $2; exit }'
    ;;

  check)
    [[ -f "$KEYSTORE" ]] || die "no keystore at $KEYSTORE"
    [[ -n "${TWA_KEYSTORE_PASSWORD:-}" ]] || die "set TWA_KEYSTORE_PASSWORD to check non-interactively."
    keytool -list -keystore "$KEYSTORE" -alias "$ALIAS" -storepass "$TWA_KEYSTORE_PASSWORD" >/dev/null
    ok "keystore opens and contains alias '$ALIAS'"
    ;;

  *)
    sed -n '2,16p' "${BASH_SOURCE[0]}"
    ;;
esac

# Digital Asset Links — the checklist

A TWA is only a TWA while Chrome can prove the app and the site belong to the
same owner. When the proof fails the app still runs, but with a URL bar across
the top — which is how most "my TWA looks like a browser" reports start.

The proof is one file, served from the site, naming the certificates allowed to
speak for it:

```
https://app.hellofit.ir/.well-known/assetlinks.json
```

In this repository that file is [`public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json),
and it currently holds **placeholders**. Replace them before the first release.

## Steps

1. **Create the keystore — once, ever.**
   ```bash
   ./twa/keystore.sh create
   ```
   Back up the file, the store password, the key password and the alias. There
   is no recovery: without them the Play listing can never be updated again.

2. **Read the upload-key fingerprint.**
   ```bash
   ./twa/keystore.sh fingerprint
   ```

3. **Get the Play signing fingerprint too, if the app ships through Play.**
   Play Console → Release → Setup → App signing → *App signing key certificate*
   → SHA-256. Google re-signs every upload, so this is the certificate that is
   actually installed on a user's phone. Skipping it is the single most common
   cause of a URL bar appearing only for Play installs.

4. **Generate the statement list.**
   ```bash
   TWA_PLAY_FINGERPRINT="AA:BB:…" ./twa/build-twa.sh assetlinks \
     > public/.well-known/assetlinks.json
   ```

5. **Deploy the web app.** Chrome fetches the statement list when the app is
   installed and caches the result. Building an APK against an undeployed
   statement list produces an app that shows a URL bar until it is reinstalled.

6. **Verify.**
   ```bash
   ./twa/build-twa.sh verify
   ```
   It fails loudly if the file is unreachable, does not name the package, has no
   SHA-256 in it, or still carries the placeholder.

## Requirements the file itself must meet

- [ ] Served over **HTTPS** with a certificate the device trusts.
- [ ] `Content-Type: application/json` — enforced in `next.config.mjs`.
- [ ] **HTTP 200 with no redirect.** A 301 from `hellofit.ir` to
      `app.hellofit.ir` breaks verification; serve it on the exact host in the
      manifest.
- [ ] Reachable without authentication — excluded from the middleware matcher
      in `src/middleware.ts` for exactly this reason.
- [ ] `package_name` matches `packageId` in `twa/bubblewrap.json`.
- [ ] Fingerprints are uppercase hex, colon-separated, 32 bytes.
- [ ] Every signing identity is listed: upload key, Play signing key, and any
      debug key used on a test device.

## If the URL bar still shows

```bash
adb shell am start -a android.intent.action.VIEW \
  -n app.hellofit.twa/LauncherActivity
adb logcat | grep -i "digital_asset_links\|OriginVerifier"
```

`OriginVerifier` logs the exact mismatch. Cross-check the generated file with
Google's tool: <https://developers.google.com/digital-asset-links/tools/generator>

Chrome caches a failed verification for the lifetime of the install, so after
fixing the file **uninstall and reinstall** — reopening is not enough.

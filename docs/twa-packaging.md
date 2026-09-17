# Packaging HelloFit as an Android TWA

The web app is already TWA-shaped: `display: standalone`, safe-area padding, a scope of
`/`, maskable icons and a service worker with an offline fallback. What remains is the
Android wrapper.

---

## 1. Prerequisites

- The PWA served over **HTTPS** on a stable origin (e.g. `https://app.hellofit.ir`).
- `https://<origin>/manifest.json` reachable and valid.
- Lighthouse PWA audit passing on a real deployment.
- The IRANYekan `woff2` files present (see `public/fonts/README.md`) — otherwise the
  installed app renders in the fallback face.

## 2. Generate the wrapper

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://app.hellofit.ir/manifest.json
```

Answers that matter:

| Prompt | Value |
|---|---|
| Application ID | `app.hellofit.twa` (must match `assetlinks.json` and the manifest's `related_applications`) |
| App name | `هلوفیت` |
| Launcher name | `هلوفیت` |
| Display mode | `standalone` |
| Orientation | `portrait` |
| Status bar colour | `#059669` |
| Navigation bar colour | `#FFFFFF` |
| Splash colour | `#F8FAFC` |
| Include support for shortcuts | yes |

```bash
bubblewrap build          # → app-release-signed.apk + app-release-bundle.aab
```

## 3. Digital Asset Links

Without this the TWA shows a Chrome URL bar. Take the release key's fingerprint:

```bash
keytool -list -v -keystore android.keystore -alias android | grep SHA256
```

Put it in `public/.well-known/assetlinks.json`, replacing
`REPLACE_WITH_YOUR_RELEASE_SIGNING_SHA256_FINGERPRINT`, redeploy, then verify:

```bash
curl https://app.hellofit.ir/.well-known/assetlinks.json
```

If the app ships through **Play App Signing**, use the fingerprint Play shows under
*Release → Setup → App signing*, not the local one. Both may be listed.

`next.config.mjs` already serves that file as `application/json`.

## 4. Store assets

`public/manifest.json` references three narrow screenshots; capture them per
`public/screenshots/README.md` before the listing goes live. Play also needs a 512×512
icon (`public/icons/icon-512.png`) and a 1024×500 feature graphic.

## 5. Verification checklist

- [ ] No URL bar on launch → asset links resolve.
- [ ] Status bar is emerald; content clears the notch and the gesture handle.
- [ ] Back gesture navigates the SPA rather than closing the app.
- [ ] Airplane mode → `offline.html` renders in Persian with the correct face.
- [ ] Long-press the launcher icon → the three manifest shortcuts appear.
- [ ] Share a PDF from another app → HelloFit appears as a target (`share_target`).
- [ ] The maskable icon is not clipped on circular, squircle and teardrop masks.
- [ ] A 30 MB lab PDF uploads over mobile data without the WebView being killed.

## 6. Native capabilities worth adding later

| Need | Approach |
|---|---|
| Supplement reminders when the app is closed | Web Push via FCM (`sw.js` already handles `push`) |
| Step count | Health Connect through a small Android plugin + `postMessage` bridge |
| Biometric unlock | WebAuthn, once auth exists |
| Background upload of large lab files | Android `WorkManager` in the wrapper, or resumable chunks (already chunked at 512 KB) |

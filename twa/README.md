# Android TWA packaging

The web app is already TWA-shaped — `display: standalone`, safe-area padding, a
`/` scope, maskable and monochrome icons, and a service worker with an offline
fallback. What lives here is the Android wrapper around it.

## Files

| File | Purpose |
|---|---|
| `bubblewrap.json` | **Source of truth.** Package id, colours, shortcuts, signing key. Committed. |
| `twa-manifest.json` | Generated from the above by `build-twa.sh render`. Disposable, git-ignored. |
| `keystore.sh` | `create` / `fingerprint` / `check` |
| `build-twa.sh` | `doctor` / `render` / `init` / `build` / `assetlinks` / `verify` / `release` / `clean` |
| `ASSETLINKS.md` | The Digital Asset Links checklist — read it before the first release |
| `android.keystore` | **Never committed.** Created by `keystore.sh`; back it up |

Edit `bubblewrap.json`. The rendered manifest is overwritten on every build,
so a change made there is a change that will be silently lost.

## One-off setup

```bash
./twa/build-twa.sh doctor        # Node 20+, JDK 17, Android SDK
./twa/keystore.sh create         # the app's identity — back it up immediately
./twa/build-twa.sh init          # generates the Android project
```

Then follow [`ASSETLINKS.md`](./ASSETLINKS.md) and **deploy the web app** before
building an APK. Chrome fetches the statement list at install time.

## Release

```bash
export TWA_KEYSTORE_PASSWORD='…'     # from the secret manager, not the repo
./twa/build-twa.sh release           # render → signed APK + AAB → verify
```

Upload the `.aab` to the Play Console; the `.apk` is for sideload testing.

## Versions

`appVersionCode` must increase on every upload. `build-twa.sh` derives it from
the commit count, so it always does — override with `TWA_VERSION_CODE` when a
build is replayed. `appVersionName` comes from the web app's `package.json`.

## Targeting another host

```bash
TWA_HOST=staging.hellofit.ir TWA_PACKAGE=app.hellofit.twa.staging \
  ./twa/build-twa.sh release
```

Every URL carrying the origin — manifest, scope, icons, shortcut icons — is
rewritten together, so a staging build cannot leave one of them pointed at
production.

## Device checklist

- [ ] No URL bar on launch → asset links resolve for the *installed* signature.
- [ ] Status bar emerald `#059669`; content clears the notch and the gesture bar.
- [ ] Back gesture navigates the SPA rather than closing the app.
- [ ] Sign-in: the SMS code auto-fills from the notification (`autocomplete="one-time-code"`).
- [ ] Airplane mode → `offline.html` renders in Persian in the right face.
- [ ] Long-press the launcher icon → all three manifest shortcuts appear.
- [ ] Share a PDF from another app → HelloFit is offered as a target.
- [ ] The maskable icon is not clipped on circular, squircle and teardrop masks.
- [ ] A 30 MB lab PDF uploads over mobile data without the WebView being killed.
- [ ] A supplement reminder fires with the app closed (requires web push).

## What the wrapper does not do

Notifications still come from the web layer (`public/sw.js`). The TWA forwards
them, but the subscription and the VAPID key are the gateway's job — see
[`docs/notifications.md §5`](../docs/notifications.md).

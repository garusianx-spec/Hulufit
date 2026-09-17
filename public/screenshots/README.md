# Store screenshots

`public/manifest.json` references three narrow-form screenshots used by the Android
install prompt and the Play listing:

```
today-mobile.png    1080×2280
plans-mobile.png    1080×2280
chat-mobile.png     1080×2280
```

Capture them from a real device or Chrome DevTools (Pixel 7 preset, 3× DPR) before
packaging the TWA. Chrome ignores missing screenshots — the manifest stays valid
without them, the install prompt is just less rich.

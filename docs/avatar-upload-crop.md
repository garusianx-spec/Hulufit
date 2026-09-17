# Profile avatar — crop & upload modal

> `components/profile/AvatarUploadCropModal.tsx` · helpers in `lib/image/cropCanvas.ts`
> Entry point: the camera badge on the avatar in `app/profile/page.tsx`

A single modal covers the whole avatar lifecycle: choose, preview, crop, upload, save —
and remove. Nothing leaves the device until the user confirms, and what leaves is a
512×512 JPEG rather than the original camera file.

---

## 1. Component tree

```
AvatarUploadCropModal                  one component, three stages
├── Sheet                              shared bottom-sheet shell (backdrop, drag-to-close)
│
├── stage "pick"
│   ├── current avatar preview         circular, or a placeholder glyph
│   ├── PickerTile ×2                  دوربین (capture="user") · گالری
│   ├── remove button                  only when an avatar exists
│   └── privacy note                   explains the on-device downscale
│
├── stage "crop"
│   ├── crop viewport 264×264          motion.img with drag + constraints
│   │   └── circular mask overlay      SVG mask + guide ring
│   ├── zoom slider                    1× → 3×, re-anchored on the viewport centre
│   └── file meta row                  name + faFileSize()
│
└── stage "saving"
    ├── crop viewport (locked)
    └── ProgressBar + "در حال آپلود… ۶۴٪"

hidden <input type="file" accept="image/*">            gallery
hidden <input type="file" accept="image/*" capture="user">  front camera
```

The footer swaps with the stage: nothing on `pick`, and
`[تصویر دیگر] [ذخیره تصویر]` on `crop` / `saving`.

---

## 2. State

| State | Purpose |
|---|---|
| `stage` | `"pick" \| "crop" \| "saving"` — drives layout, footer and interactivity |
| `source` | object URL of the chosen file |
| `natural` | intrinsic `{width, height}` after decode; the basis for all crop math |
| `zoom` | 1 → 3 |
| `offset` | `{x, y}` of the image's top-left, in crop-box pixels |
| `progress` | 0–100 during upload |
| `fileMeta` | name + size, shown under the viewport |

`objectUrl` lives in a ref and is revoked on reset, on a second pick, and on unmount —
picking five photos in a row leaks nothing.

---

## 3. Crop math

The image is laid out to *cover* the 264 px crop box at `zoom = 1`:

```
baseScale   = CROP_BOX / min(naturalW, naturalH)
displayW    = naturalW * baseScale * zoom
displayH    = naturalH * baseScale * zoom
offset      ∈ [CROP_BOX − displayW, 0] × [CROP_BOX − displayH, 0]   (clampOffset)
```

Dragging updates `offset`; `clampOffset` guarantees the window never shows empty space.
Changing zoom re-anchors around the viewport centre so the crop does not lurch:

```
cx = CROP_BOX/2 − ((CROP_BOX/2 − offset.x) / displayW) * newW
```

On save the box is converted to normalised source coordinates and handed to
`cropToBlob()`:

```
rect.x    = −offset.x / (baseScale*zoom) / naturalW
rect.y    = −offset.y / (baseScale*zoom) / naturalH
rect.size = CROP_BOX  / (baseScale*zoom) / min(naturalW, naturalH)
```

`cropToBlob` draws that region into an off-screen 512×512 canvas with
`imageSmoothingQuality: "high"` and returns both a `Blob` (for the network) and a
`dataUrl` (for instant optimistic display).

---

## 4. Upload path

```
pick ──guardFile(maxBytes: 8 MB, allow: ["image"])──▶ reject → toast, nothing allocated
                       │ ok
                       ▼
        URL.createObjectURL ──▶ loadImage() ──▶ centre the crop window ──▶ stage "crop"
                       │
                    (save)
                       ▼
        cropToBlob(512², JPEG q0.9)  ── a 6 MB camera shot becomes ~80 KB
                       ▼
        PUT /api/profile/avatar  (progress → ProgressBar)
                       ▼
        dispatch({type:"avatar/set", dataUrl}) ── header, dashboard and chat update at once
```

**Why crop before upload.** An 8 MB ceiling on a file that ends up 512×512 exists only to
stop a pathological pick; the real saving is the canvas step, which cuts the payload by
two orders of magnitude and removes EXIF (including GPS) as a side effect.

**Removal** dispatches `avatar/set` with `null`; the `Avatar` component falls back to the
user's Persian initials, so there is no broken-image state.

---

## 5. Failure handling

| Failure | Behaviour |
|---|---|
| File > 8 MB | Red toast with the actual and allowed size; no object URL created |
| Non-image mime | Red toast; picker stays open |
| `loadImage` rejects (corrupt / unsupported codec) | Object URL revoked, toast, back to `pick` |
| `canvas.toBlob` returns null | Stage returns to `crop`, toast, the crop is preserved |
| Upload rejected | Same — the user retries without re-cropping |

---

## 6. Accessibility & platform notes

- The sheet is `role="dialog" aria-modal="true"`, closes on Escape, and locks body scroll.
- The zoom slider is a native `<input type="range">` with `aria-label`, so it is
  keyboard- and TalkBack-operable; in RTL the browser mirrors it automatically.
- The crop viewport sets `touch-action: none` so a drag never scrolls the sheet behind it.
- `capture="user"` opens the selfie camera directly inside the Android TWA.
- Every control clears the 44 px touch target (`.tap-target`).

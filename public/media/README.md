# Exercise media

`lib/mock/workouts.ts` points every exercise at `/media/exercises/<name>.svg`. Those files
are **not** committed: the demo build renders an inline animated figure
(`MovementLoop` in `components/plans/ExercisePreviewModal.tsx`) so the repository ships
no binary media.

For production, drop looping previews here — `webp` or `gif` at 480×360, ≤ 400 KB each —
and swap `MovementLoop` for:

```tsx
<img src={exercise.previewUrl} alt={exercise.name} className="h-full w-full object-cover" />
```

Keep `previewUrl` pointing at the file and `videoUrl` at a full-length mp4 for the
"مشاهده ویدیوی حرکت" action.

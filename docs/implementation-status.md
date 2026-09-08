# Studio implementation and verification

Updated September 8, 2026. The redesign has been reviewed locally and approved for publication. Human usability research remains outstanding.

## Delivered

- Flexible V3 RGBA document model, rectangular presets/custom sizes, version 1/2 migration, saved palettes, shared layers with independent frame cels, and bounded undo/redo.
- Device-local autosave, acknowledged saves, previous-revision retention, recent projects, conflict copies, and editable file backups.
- New home, canvas-centered editor, contextual tools, light/dark themes, native-size preview, responsive inspector, and focusable controls.
- Pencil/eraser/fill/picker; shapes, symmetry, optional corner cleanup, dither; rectangular/contiguous selection, cut/copy/paste, preview/apply/cancel movement; layer actions, color ramps, extraction, and scoped replacement.
- Resize/scale/transform previews, origin guides and metadata, non-exported reference images, and tile-repeat preview.
- Flexible timeline, per-frame timing, named clips, previous/next tinted guides, and separate editing/playback state.
- PNG and sprite-sheet import, PNG/sheet/sequence/GIF exports, full RGBA PNG data, and explicit GIF conversion preview.
- Visual character choices, presets and randomization locks, saved generator recipe, new-project variants, and nine ordered editable character part layers.
- Three optional lessons and four original editable examples; art/palette credits recorded.

## Verified during implementation

- `tests/studio-model.test.cjs`: sixteen scenarios covering rectangular bounds, fills, mirrored strokes, locking, alpha, frame/layer isolation, compositing, merge, shapes, history, resize, serialization, legacy migrations, corrupt input, clip membership, and history memory.
- Existing legacy pixel-model checks retained.
- `tests/generator.test.cjs`: 23,040 frames spanning every current build/hair/outfit/hat/equipment/cape combination and all directions/frames. New flat rendering and nine-part compositing match the captured legacy renderer exactly.
- Ten native browser checks passed: committed IndexedDB saves, last-good revision, conflict preservation, transaction abort, PNG alpha/dimensions, examples, part compositing, ZIP structure, GIF decoding, and a representative 64 × 64 / 16-frame / 4-layer editing workload. Final measured workload: 10 ms for twenty edits/composites in the local Codex browser; not a cross-device benchmark.
- Independent Pillow decoding of generated GIF verifies two frames, 16 × 24 dimensions, 150/230 ms timing, color conversion, and disposal/transparency. Python `zipfile` validates archive CRCs and payloads.
- Browser interaction checks include create/draw/undo/redo, layers, frame duplication, save/reload/reopen, rectangular PNG import, resize/undo, malformed project rejection, selection cancel, guided lessons, character generation, clip playback, light/dark themes, and export preview/download invocation.
- An isolated page with deliberately failing storage verified the Save failed message and retention/reopening of an unsaved draft, including its undo history, in the same tab. This does not claim recovery after closing a tab whose storage failed.
- Desktop 1366 × 768 and phone 390 × 844 layouts inspected. Real touchscreen hardware testing remains separate from responsive browser inspection.

## Remaining validation and deliberate boundaries

- Recruit first-time pixel artists before claiming the plan's ten-minute completion target or 80% unaided success rate. Those are research goals, not achieved metrics.
- Test exported sheets in the user's chosen game engine before adding named engine presets. Current metadata is a generic Sprite Forge schema.
- Larger character resolutions, attack animations, a broader art library, and advanced free-rotation tooling remain future work. The generator remains native 48 × 48 walking art.
- Cloud accounts, collaboration, AI generation, a marketplace, and a full map editor were excluded from the first product slice in the approved plan.
- Local interactive review is complete; publication was approved on September 8, 2026. GitHub Actions records the deployment outcome.

# Sprite Forge

**A little canvas. Endless possibilities.**

A welcoming, account-free pixel art studio. Start a small sprite, build a fantasy character, or open existing artwork. Draw, animate, and export entirely in your browser.

Plain HTML, CSS, JavaScript, and Canvas. No build step, runtime dependencies, API keys, remote assets, or AI service.

## Run it yourself

Open **`dist/index.html`** in a modern browser for the standalone app. For consistent device-local saving, serve it from the same local address each time:

```powershell
python -m http.server 8766 --bind 127.0.0.1 --directory dist
```

Open [Sprite Forge locally](http://127.0.0.1:8766). Keep that terminal running while you use the app; Ctrl+C stops the server. Your browser's saved projects belong to that browser and address. Changing ports or browsers does not transfer them.

The public site is hosted at [Sprite Forge on GitHub Pages](https://bitofastickler.github.io/sprite-forge/). Local changes become public only after they are pushed to `main` and the Pages workflow succeeds.

## Start small

- **Draw a sprite:** illustrated-purpose presets for 16, 32, 48, 64, 128, and 32 × 48; quick 8, 24, and 96 choices; custom width and height from 1 to 256 pixels. Starts with one layer and one frame.
- **Build a character:** body, hair, outfit, headwear, equipment, and colors. Visual hair/outfit choices, character presets, and randomization locks. Generates 48 × 48 artwork in four walking directions with sixteen frames and nine editable part layers.
- **Open artwork:** import PNG images, slice PNG sprite sheets, or reopen editable projects. Version 1 and 2 character JSON files are migrated; saved pixel drafts are retained even if the old file was in generator mode.
- **Learn by making:** optional potion, creature, and sparkle lessons, plus editable examples and a repeating meadow tile.

## Draw and refine

- Pencil, eraser, flood fill, eyedropper, rectangular selection/move, contiguous color selection, and pan.
- Line, rectangle, ellipse, filled shapes, dithering, left/right and top/bottom symmetry, and optional pencil corner cleanup.
- Brush sizes, integer zoom, fit, grid, keyboard pixel cursor, mouse/touch drawing, and two-finger pan/zoom.
- Cut/copy/paste selections, preview moves, apply or cancel. Each stroke or committed operation is one undo step.
- Canvas resize with anchor, nearest-neighbor artwork scaling, and transform previews. Rectangular 90-degree rotations can crop; inspect the preview.
- Layers: show/hide, lock, alpha lock, opacity, rename, duplicate, reorder, merge, and delete. Layer structure is shared across frames; pixels are independent.
- Saved palettes, custom swatches, color extraction, shadow/base/highlight suggestions, optional palette constraint, and scoped color replacement.
- Native-size, grayscale, light/dark, and tile-repeat previews. References stay outside exported artwork.
- Dark/light themes, labeled controls, focus indicators, and a collapsible inspector on narrow screens.

## Animate and export

Choose **Animate** to reveal the timeline. Add, duplicate, delete, or reorder frames; set per-frame durations; name animation clips; and preview previous/next frame guides. Playback does not change the editing frame.

Export choices:

| Format | Contents |
| --- | --- |
| Image PNG | Current frame, visible layers, preserved alpha |
| Sprite sheet ZIP | PNG grid plus JSON frame rectangles, timing, clips, scale, and origin |
| GIF | Looping animation, up to 255 opaque colors plus transparency |
| PNG sequence ZIP | Numbered transparent PNGs plus timing JSON |
| Editable project | Version 3 `.spriteforge` JSON with pixels, palettes, layers, frames, clips, origin, and optional generator recipe |

Exports support integer enlargement. Sheets offer columns, padding, spacing, and clip selection. Set the sprite origin from the tool rail. Overlays, grids, references, and editor backgrounds never enter exported pixels.

GIF converts partial transparency to opaque/transparent, quantizes excess colors, and rounds timing to 10 ms. Its export preview shows the converted first frame. Use PNG for full RGBA fidelity. GIF encoding favors a simple dependency-free implementation over minimum file size.

Generated character clips retain the original order: Down, Left, Up, Right, with four frames per direction. New projects and imported artwork are not restricted to that layout. Sheet metadata uses Sprite Forge's documented format, not an unverified named engine preset.

## Keep your work

Projects autosave to IndexedDB after committed edits. **Saved on this device** appears only after the transaction completes. Recent projects reopen after refresh; the previous saved revision is retained for recovery. Conflicting saves from another tab create a recovered copy.

Device storage is not cloud backup. It can be cleared, denied, or unavailable with `file:` URLs or private browsing. If saving fails, the app reports it and keeps the open draft in the current tab. **Save project file** downloads an editable backup. Undo history and reference images are session-only and are not included in project files.

The supported document budget is 2,097,152 pixels across all frame/layer combinations (8 MiB of raw RGBA), at most 256 frames and 32 layers. Undo history has a 32 MiB budget. Exports and imports have additional dimension limits to avoid unreasonable allocations. These are guardrails, not promises of equal speed on every device.

## Development and verification

`dist/` is the hand-authored source, not generated build output. Classic scripts preserve standalone-file compatibility.

| File | Responsibility |
| --- | --- |
| `dist/index.html`, `dist/style.css` | Workspace, dialogs, responsive visual design |
| `dist/app.js` | UI interactions, drawing sessions, previews, import/export orchestration |
| `dist/studio-model.js` | Version 3 model, RGBA operations, migration, history, layers, frames |
| `dist/project-store.js` | IndexedDB persistence, previous revision, conflict copies |
| `dist/generator.js` | Original procedural renderer and ordered part layers |
| `dist/studio-art.js` | Original starter art, lessons, Canvas pixel conversion |
| `dist/studio-io.js` | ZIP and GIF encoders |
| `dist/pixel-model.js` | Legacy model retained for compatibility regression tests |

Run all syntax/model/encoder/generator checks with Node:

```powershell
node tests/run.cjs
```

For native browser storage, Canvas, PNG, GIF, and performance checks, serve the repository on a **different test port** and open the test page:

```powershell
python -m http.server 8767 --bind 127.0.0.1
```

[Browser checks](http://127.0.0.1:8767/tests/browser.html) create isolated test projects on that origin. They do not replace interaction tests or usability sessions. See [implementation and verification notes](docs/implementation-status.md), the [product plan](docs/product-plan.md), and [art credits](docs/art-credits.md).

## Hosting

The GitHub Pages workflow runs the automated checks, then publishes `dist/` on pushes to `main`. No server, database service, or secrets are required. A local preview should be reviewed before publishing a visual redesign.

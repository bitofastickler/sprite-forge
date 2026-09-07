# Sprite Forge

**Create an adventurer. Make every pixel your own.**

Sprite Forge is a lightweight, browser-based character creator for top-down 2D games. Assemble a fantasy character from customizable parts, then paint directly on its animation frames—or start with a completely blank canvas.

Built with plain HTML, CSS, JavaScript, and Canvas. No build step, runtime dependencies, API keys, or AI service required.

**[Open Sprite Forge](https://bitofastickler.github.io/sprite-forge/)** — use the character studio directly in your browser.

## Features

### Generate a starting character

- Three body builds, five hairstyles, and editable skin, eye, and hair colors.
- Tunics, plate armor, robes, headwear, capes, and handheld equipment.
- Coordinated color palettes and character randomization.
- Four-direction walking preview with adjustable playback speed.

### Edit every pixel

- Start from scratch or edit a generated character.
- Pencil, eraser, flood fill, and eyedropper.
- Brush sizes of 1, 2, 3, or 5 pixels, plus optional mirrored brush strokes.
- Pixel grid and previous-frame overlay for aligning animation poses.
- Sixteen individually editable frames, with frame copying and pasting.
- Copy one pose across all four frames of a direction.
- Undo and redo, including recovery after clearing or replacing artwork.
- Mouse, touch, and keyboard drawing controls.

### Take it into your game

- Transparent PNG export for a single frame or the complete sprite sheet.
- JSON character files preserve generator settings and the pixel-editing draft.
- Original version 1 character files remain loadable.

## Run locally

Download the repository, extract it, and open **`dist/index.html`** in a modern browser.

For development, you can also serve the directory with Python:

```bash
python -m http.server 8000 --directory dist
```

Then open <http://localhost:8000>.

The application runs entirely in the browser. The repository contains the full app; ChatGPT Sites is not required to run it.

## Create your first character

1. Pick the body, hairstyle, clothing, and equipment—or select **Randomize**.
2. Select **Edit generated character** to customize the pixels. For a fully original drawing, select **Start from scratch**.
3. Choose a direction and frame from the frame thumbnails.
4. Draw your changes. Copy a frame to begin the next pose, and enable **Previous frame** to guide alignment.
5. Play the walk preview to inspect the animation.
6. Use **Save character** to keep an editable JSON project, and export a PNG for your game engine.

**Save before closing or refreshing the page.** Drafts and undo history live in browser memory; there is no autosave or cloud character storage. JSON saves preserve artwork, but not undo history. Returning to the generator preserves the pixel draft during the current session; select **Resume pixel editor** to return to it.

## Sprite sheet layout

Each frame is **48 × 48 pixels**. The full sheet is **192 × 192 pixels**, with four columns and four rows.

| Row (zero-based) | Direction | Columns |
| --- | --- | --- |
| 0 | Down | Walking frames 0–3 |
| 1 | Left | Walking frames 0–3 |
| 2 | Up | Walking frames 0–3 |
| 3 | Right | Walking frames 0–3 |

For frame column `c` and direction row `r`, the source rectangle is `(c × 48, r × 48, 48, 48)`. Import with nearest-neighbor filtering to retain crisp pixel edges. The checkerboard, editing grid, and previous-frame overlay are not included in exported PNGs.

## Keyboard controls

Pixel editor shortcuts apply when a text, color, or select control is not focused.

| Key | Action |
| --- | --- |
| `B` | Pencil |
| `E` | Eraser |
| `F` | Flood fill |
| `I` | Eyedropper |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` | Redo |
| Arrow keys, with drawing canvas focused | Move pixel cursor |
| Space, with drawing canvas focused | Apply the selected tool |

## Project structure

| File | Purpose |
| --- | --- |
| `dist/index.html` | Character creator and editor interface |
| `dist/style.css` | Responsive layout and visual styling |
| `dist/app.js` | Procedural character rendering, editor interactions, animation, and exports |
| `dist/pixel-model.js` | Pixel document model, drawing operations, validation, and undo/redo |
| `tests/pixel-model.test.cjs` | Dependency-free pixel model checks |

Despite its name, `dist/` contains the hand-authored application source. There is no bundler or compilation step.

## Run the tests

With Node.js installed:

```bash
node tests/pixel-model.test.cjs
```

The checks cover blank creation, continuous strokes, frame isolation, erasing, mirrored painting, bounded flood fill, undo/redo, replacement recovery, JSON pixel-data round trips, and malformed pixel-data rejection. They do not replace browser interaction or visual testing.

## Hosting

The public app is hosted on [GitHub Pages](https://bitofastickler.github.io/sprite-forge/). The workflow in `.github/workflows/pages.yml` checks the JavaScript and pixel model, then publishes `dist/` whenever changes are pushed to `main`. It can also be run manually from GitHub Actions.

Serve the contents of `dist/` with a static web host. No server process, database, secrets, or environment variables are needed by the application.

This public-source package omits the original ChatGPT Sites project binding. Hosting a fork should use your own hosting configuration.

## Current scope

- The art style is inspired by 16-bit games; the native drawing canvas is 48 × 48 pixels.
- Character generation uses procedural drawing, not a GAN or diffusion model.
- Generated animation covers walking. Attack and other animation sets are not included.
- Manual edits apply to individual frames. New poses and directions must be drawn or copied; they are not automatically inferred.
- Generated parts become a flat pixel image when edited. Separate editable art layers are not implemented.
- PNG import and automatic character saving are not currently implemented.

## Contributing

Bug reports, new character parts, animation improvements, and accessibility fixes are welcome. Keep changes focused and preserve the dependency-free local workflow. For rendering changes, check every affected direction and frame. Include reproduction steps for bug reports and explain how a proposed change was verified.

# Sprite Forge product and experience plan

Status: proposed roadmap, September 7, 2026. This document plans future work; it does not describe shipped features.

## Product promise

Make your first sprite with confidence, then grow into animation and game assets without changing tools.

Design for a person who has never used a pixel editor. Their first success should be a small piece of art they understand, can change, can recover, and can export. Keep the existing account-free, browser-based workflow and downloadable local app.

The organizing principle is progressive disclosure: one coherent editor, with additional controls appearing when the project or selected tool needs them. Avoid separate beginner and expert applications that force users to relearn the interface.

## Current foundation and gaps

Source review covered README.md, dist/index.html, dist/style.css, dist/app.js, dist/pixel-model.js, dist/palette-state.js, and tests/pixel-model.test.cjs. These findings are based on code inspection, not a browser usability study.

- Reuse the procedural character generator, walking preview, pencil, eraser, fill, picker, mirror brush, frame copying, undo/redo, PNG export, and versioned JSON loading.
- Every document currently has sixteen flat 48 x 48 frames. Dimensions, rendering, coordinates, animation grouping, validation, and export all assume that layout.
- The page prioritizes character configuration. The pixel editor is inserted above the preview and sheet, while disabled generator controls remain in the sidebar.
- No persistent project recovery, variable dimensions, PNG import, editable layers, selections, or flexible animation timeline exists.
- Palette retention currently wraps a global UI function and lasts only for the current draft. Palette membership should become explicit saved project data.
- Undo copies the entire document and retains up to forty checkpoints. This needs a memory budget before supporting larger layered projects.
- The existing automated checks cover useful core pixel behavior; they do not establish browser usability or visual quality.

## 1. A welcoming start

Show recent projects and three primary choices: **Draw a sprite**, **Build a character**, and **Open artwork**. Offer **Try a five-minute lesson** as a secondary action. Returning users can resume immediately.

Draw a sprite asks what the user wants to make, then suggests a size. Include tiny finished examples at native size and enlarged size, with a plain description of the tradeoff. Start blank artwork with one frame and one layer. Animation is opt-in.

| Starting point | Suggested size | Other useful choices |
| --- | --- | --- |
| Tiny icon or collectible | 16 x 16 | 8 x 8, 24 x 24 |
| Item, prop, or small creature | 32 x 32 | 16 x 16, 48 x 48 |
| Character | 32 x 48 | 32 x 32, 48 x 48, 64 x 64 |
| Terrain tile | 16 x 16 | 32 x 32, 48 x 48 |
| Portrait or detailed sprite | 64 x 64 | 96 x 96, 128 x 128 |

These are proposed practical presets, not universal engine requirements or a measured popularity ranking. Feature 16, 32, 48, and 64 prominently; put other sizes and separate custom width/height inputs behind More sizes. Suggest 32 x 32 when no use case is chosen. Explain that more pixels require more drawing effort.

Initially support custom dimensions from 1 to 256 pixels per side, with a separate total document memory limit established through profiling. Preserve the existing generator at its native 48 x 48 resolution. Other blank-canvas sizes must not imply that the generator can produce equally good artwork at those sizes.

Treat **Canvas size** and **Scale artwork** as different commands. Canvas size adds or crops space using an anchor preview. Scaling uses nearest-neighbor sampling, highlights clean integer enlargements, and previews destructive downscaling. Both are undoable.

## 2. A beautiful workspace with a clear hierarchy

Give the canvas the largest share of the screen. Reduce the large marketing heading to a compact brand and project header once a document is open.

| Region | Contents and behavior |
| --- | --- |
| Top bar | Project name, saving state, undo/redo, project menu, Export |
| Left tool rail | Labeled drawing tools; secondary tools under More tools |
| Context strip | Only the selected tool's options, including brush size and operation scope |
| Center | Canvas, zoom controls, fit button, optional grid, cursor position |
| Right inspector | Palette and native-size preview; layers available through a clear tab |
| Bottom | Compact frame strip when animation is enabled; optional expanded timeline |

Use charcoal surfaces, restrained lime accents that retain the current identity, consistent spacing, readable system typography, and a single icon family. Reserve pixel-style lettering for branding if used at all. Offer a light theme. Keep artwork preview backgrounds independently selectable so UI theme changes do not obscure pale or dark sprites.

Active tools need a shape or indicator plus their label, not color alone. Show short help on hover and keyboard focus; essential controls must remain usable without hover. Keep advanced help dismissible and remember that choice. Prefer precise copy: “Saved on this device,” “Previous frame guide,” and “Download editable project.”

For desktop, keep drawing and exporting possible without page scrolling at a target 1366 x 768 viewport. On tablets, collapse the inspector into a drawer and provide explicit pan/zoom controls alongside gestures. On phones, prioritize small edits, preview, and export, with one panel visible at a time. Verify browser zoom, keyboard access, visible focus, contrast, reduced motion, and touch targets of approximately 44 CSS pixels where practical.

## 3. Tools that explain themselves

Introduce tools in stages while maintaining stable locations and shortcuts.

| Stage | Tools | Beginner benefit |
| --- | --- | --- |
| Always visible | Pencil, eraser, fill, eyedropper, selection/move | Draw, correct, color, sample, and reposition |
| Next level | Line, rectangle, ellipse, flip, rotate 90 degrees, symmetry | Make deliberate shapes without redrawing |
| Advanced | Contiguous color selection, dithering, palette remapping, outline, shading ramp | Speed up repeated pixel-art work |

All geometry snaps to pixels. Add a brush footprint preview, adjustable grid visibility, integer zoom steps, fit-to-view, and temporary panning. Keep keyboard pixel drawing and offer visible equivalents for shortcuts. Avoid conflicts between Space-to-draw on the focused canvas and panning; provide a dedicated pan tool and use another documented gesture where necessary.

Default edits affect only the current frame and layer. A multi-frame operation must visibly state its scope, preview its effect, and commit as one undo action. A continuous stroke also creates one undo action. Canceling a shape or transform must leave the document unchanged.

Add horizontal and vertical symmetry with visible axes, pixel-perfect pencil cleanup as an optional explained setting, and alpha lock labeled “Paint only existing pixels.” Selection tools need cut/copy/paste, move, cancel, commit, and clear selection behavior before adding free rotation or complicated transforms.

## 4. Color guidance and editable layers

Ship a small set of carefully curated 8-, 16-, and 32-color palettes. Provide recent colors, saved custom swatches, extraction from artwork, and editable ramps labeled Shadow, Base, and Highlight. Palette colors remain available even after their last painted pixel is removed.

Offer a palette limit as an optional creative constraint. Changing a swatch must be distinct from replacing that color in artwork; replacement previews affected layers and frames. Transparency gets its own recognizable swatch.

Start with one layer named Artwork. Teach layers through an optional example: “Keep the outline separate so recoloring is easier.” Add visibility, locking, rename, duplicate, reorder, opacity, merge, and alpha lock. The document model should represent shared layers and per-frame layer images, even before the full layer interface ships.

Keep reference images in a separate non-exporting reference surface. Imported semitransparent PNG pixels must either be preserved through RGBA support or converted only through an explicit previewed choice; do not silently discard alpha.

## 5. Teach through small completed projects

Offer three optional lessons: a 16 x 16 potion, a 32 x 32 creature, and a two-frame sparkle or blink. Each should produce a usable export.

Use a repeatable sequence: silhouette, base colors, shadow, highlight, preview, export. Introduce one relevant tool per step, allow skipping and replaying, and keep the learner's artwork when the lesson closes. Avoid grading taste or blocking progress because art differs from the example.

Provide a native-size preview, light/dark background checks, and optional grayscale preview to help users judge readability. Explain what each reveals; avoid pretending automated feedback can reliably judge artistic quality.

Build a small library of editable icons, props, creatures, and tiles before expanding it. Record source and license information for every shipped example and palette.

## 6. Animation and character creation

Add animation through an explicit Animate action. Begin with duplicate frame, add/delete/reorder, play/pause, loop, and frame duration. Then introduce previous/next frame guides with opacity and tint controls, frame ranges, and named clips such as Idle and Walk. Directions become optional character-project metadata rather than a requirement of every sprite.

Keep editing selection distinct from the playback cursor so a playing preview cannot redirect a brush stroke. Add origin and ground guides to help stabilize character feet. Copying or mirroring a pose is a starting point; it does not generate a finished walk or attack.

Present Build a character as a guided starting workflow feeding the same editor. Improve the existing generator with visual part thumbnails, preset characters, coordinated colors, and randomization locks. Preserve the generator recipe alongside the resulting artwork. Regeneration creates a new variant instead of silently replacing hand edits.

Separate body, hair, clothing, and equipment layers only after validating compositing order in every direction and walking frame. Prove a complete, coherent character set before expanding to many body styles, resolutions, attacks, or equipment combinations.

## 7. Saving, importing, and exporting without surprises

Use IndexedDB for device-local projects on supported served origins. Save after committed edits with a short debounce, maintain a recoverable last-good revision, and distinguish Saving, Saved, and Save failed. Do not claim an edit is saved until the storage transaction succeeds.

Keep manual project downloads available in all modes. Storage can be denied, cleared, or unavailable for direct file launches; detect that and explain the actual state. Autosave is device-local recovery, not a cloud backup. Handle multiple tabs with revision checks and save conflicting work as a recovered copy. Validate imported projects fully before replacing the current document.

PNG import should support a single image first, then sprite sheets with a slicing preview for dimensions, margins, spacing, and ordering. Detect unreasonable decoded dimensions and document sizes before allocating large pixel buffers.

Export starts with purpose: **Image**, **Animation**, or **Game sprite sheet**. Show actual output dimensions, frame count, transparency, and a preview. Separate editable project saves from flattened art exports.

Ship PNG frame and grid/strip sheet exports first. Add PNG sequences and optional GIF sharing later. GIF export needs an explicit preview of palette/transparency changes. Game sheets should offer spacing, padding, order, origin, and JSON metadata for frame rectangles, durations, and clips. Ship named engine presets only after testing imports in those engines. Guides, references, selection outlines, grids, and UI backgrounds never enter exported pixels.

## 8. Engineering approach

Retain static hosting and the lightweight local workflow. A framework rewrite is not a prerequisite. Format the hand-authored source and incrementally separate document model, history, renderer, tools, persistence, import/export, generator, and UI state. Preserve direct-file compatibility by choosing a compatible loading strategy; do not introduce module-loading requirements accidentally.

Introduce a version 3 project format with width, height, explicit palette, layers, frame IDs/durations, per-frame layer pixels, animation clips/directions, origin, and optional generator recipe. Maintain pure migration functions for version 1 generator files and version 2 pixel drafts. Migration must preserve existing 48 x 48 artwork and row order exactly, including saved drafts when the active mode is generator.

Use typed pixel buffers internally and a documented portable serialization. Prefer RGBA internally for lossless PNG handling. Start with simple compositing and changed-frame redraws; add workers only if profiling shows a need. Replace unrestricted whole-document history growth with commands or pixel patches and a bounded memory budget. Apply the same history model to layer, frame, palette, and size changes.

## Delivery sequence and acceptance gates

| Phase | Scope | Exit gate |
| --- | --- | --- |
| 1. Trust and flexible documents | V3 model, migrations, variable dimensions, saved palettes, bounded history, autosave/recovery | Old files round-trip pixel-exactly; rectangular drawing/fill work; failed saves and corrupt imports preserve current work |
| 2. Beginner workspace | New start flow, presets, canvas-centered shell, labeled tools, zoom/pan, one-frame default, simple PNG export | A new user can start, draw, undo, save, reopen, and export without coaching |
| 3. Drawing confidence | Selection/move, shapes, symmetry, layers, color ramps, single-PNG import, first lesson | Editing a layered sprite preserves untouched pixels, alpha, and unaffected frames across undo/save/load |
| 4. Animation and handoff | Timeline, onion guides, clips, sheet import/export and metadata | User makes a loop and imports the sheet into a tested game-engine example with correct size, order, origin, and timing |
| 5. Distinctive studio | Improved generator, part layers, lessons/library, tile repeat preview, advanced tools, optional GIF | Complete example workflows pass novice testing; generator changes pass every direction/frame check |

Prioritize one complete vertical slice: **New 32 x 32 sprite -> choose palette -> draw -> undo -> recover after refresh -> export transparent PNG**. Build this across phases 1 and 2 before pursuing advanced breadth.

Treat effort estimates as provisional until the document migration and workspace prototype expose their scope. Cloud accounts, collaboration, AI generation, a marketplace, full map editing, and large animation libraries belong in later discovery; they should not delay the core experience.

## Validation and definition of success

Recruit five to eight first-time pixel artists for formative sessions. Ask them to create a potion, correct a mistake, reopen it, and export it without coaching. Then ask them to make a two-frame animation. Observe confusion about dimensions, active tools, layers, saving, and export rather than relying only on preference ratings.

Proposed targets, to validate rather than advertise as achieved: at least 80% complete the static task unaided within ten minutes; the first editable canvas appears within thirty seconds of starting; committed, acknowledged saves survive refresh in supported storage conditions. Record task timing through consented sessions; analytics need not upload artwork.

Automate model checks for rectangular bounds, stroke continuity, fills, alpha, transforms, layer compositing, history, migrations, corrupt imports, and export pixels. Browser-test mouse, touch, keyboard, focus, storage failure/recovery, responsive layout, and actual downloaded files. Compare legacy generated frames against a captured baseline. Choose a reference machine/browser and document a memory limit and responsive input target through profiling, then add regression checks for the supported workload.

Review the first workspace slice in a local interactive preview before publishing. Each later phase should also have a demonstrable end-to-end user workflow.

## Reference points

Piskel demonstrates a browser sprite workflow with live animation preview and PNG/GIF/sheet exports: https://www.piskelapp.com/ . Aseprite documents configurable previous/next frame guides: https://www.aseprite.org/docs/onion-skinning/ , and sheet slicing/export: https://www.aseprite.org/docs/sprite-sheet/ . These establish useful workflow references; the proposed beginner experience, priorities, dimensions, and success targets above are product recommendations for Sprite Forge.

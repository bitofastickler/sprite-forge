"use strict";
(async () => {
  const M = StudioModel,
    A = StudioArt,
    results = document.querySelector("#results");
  let passed = 0,
    failed = 0;
  const assert = (condition, message) => {
    if (!condition) throw Error(message);
  };
  async function test(name, fn) {
    const li = document.createElement("li");
    try {
      await fn();
      li.textContent = "PASS · " + name;
      li.className = "pass";
      passed++;
    } catch (e) {
      li.textContent = "FAIL · " + name + " · " + e.message;
      li.className = "fail";
      failed++;
    }
    results.append(li);
  }
  const p = M.blank(16, 24, "Browser storage test " + Date.now());
  p.frames[0].cels[0][0] = 0x12345680;
  let first;
  await test("IndexedDB acknowledges a committed RGBA project", async () => {
    first = await ProjectStore.save(p);
    const stored = await ProjectStore.get(p.id);
    assert(stored.revision === 1, "Revision not committed");
    assert(stored.project.frames[0].cels[0][0] === 0x12345680, "RGBA changed");
  });
  await test("A last-good revision is retained after another save", async () => {
    p.frames[0].cels[0][0] = 0xff0000ff;
    await ProjectStore.save(p, first.revision);
    const stored = await ProjectStore.get(p.id);
    assert(
      stored.previous.frames[0].cels[0][0] === 0x12345680,
      "Previous pixels missing",
    );
    assert(
      stored.project.frames[0].cels[0][0] === 0xff0000ff,
      "Current pixels missing",
    );
  });
  await test("Concurrent stale save creates a recovered copy", async () => {
    const stale = M.clone(p);
    stale.frames[0].cels[0][0] = 0x00ff00ff;
    const result = await ProjectStore.save(stale, 1);
    assert(result.conflict && result.id !== p.id, "Conflict did not branch");
    const original = await ProjectStore.get(p.id),
      copy = await ProjectStore.get(result.id);
    assert(
      original.project.frames[0].cels[0][0] === 0xff0000ff,
      "Original overwritten",
    );
    assert(
      copy.project.frames[0].cels[0][0] === 0x00ff00ff,
      "Conflict pixels lost",
    );
  });
  await test("Failed transaction does not replace saved artwork", async () => {
    const request = indexedDB.open("sprite-forge-studio", 1),
      db = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    await new Promise((resolve) => {
      const tx = db.transaction("projects", "readwrite");
      tx.objectStore("projects").put({ id: p.id, project: "bad" });
      tx.abort();
      tx.onabort = resolve;
    });
    db.close();
    const stored = await ProjectStore.get(p.id);
    assert(
      stored.project.frames[0].cels[0][0] === 0xff0000ff,
      "Aborted write replaced artwork",
    );
  });
  await test("PNG encoding/decoding keeps alpha and native dimensions", async () => {
    const c = A.canvas(p.frames[0].cels[0], 16, 24);
    p.frames[0].cels[0][1] = 0x80402080;
    A.canvas(p.frames[0].cels[0], 16, 24, c);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const im = await createImageBitmap(blob),
      out = document.createElement("canvas");
    out.width = im.width;
    out.height = im.height;
    out.getContext("2d").drawImage(im, 0, 0);
    const pixels = A.pixels(out);
    assert(im.width === 16 && im.height === 24, "PNG dimensions changed");
    assert(pixels[1] === 0x80402080, "PNG alpha changed");
    assert(pixels[2] === 0, "Transparent background not preserved");
    im.close();
  });
  await test("All original starter examples have visible editable artwork", () => {
    for (const key of Object.keys(A.samples)) {
      const p = A.project(key);
      assert(
        M.composite(p).some((v) => v & 255),
        key + " is empty",
      );
      assert(
        M.validate(M.serialize(p)).width === p.width,
        "Example does not round-trip",
      );
    }
  });
  await test("Native canvas layered character matches flattened rendering", () => {
    for (let d = 0; d < 4; d++)
      for (let f = 0; f < 4; f++) {
        const s = {
            ...SpriteGenerator.defaults,
            cape: true,
            weapon: "staff",
            hat: "wizard",
          },
          flat = document.createElement("canvas");
        flat.width = flat.height = 48;
        SpriteGenerator.draw(flat.getContext("2d"), s, d, f);
        const p = M.blank(48, 48);
        p.layers = SpriteGenerator.parts.map((name) => ({
          id: M.uid(),
          name,
          visible: true,
          locked: false,
          alphaLock: false,
          opacity: 1,
        }));
        p.frames[0].cels = SpriteGenerator.parts.map((part) => {
          const c = document.createElement("canvas");
          c.width = c.height = 48;
          SpriteGenerator.draw(c.getContext("2d"), s, d, f, 0, 0, part);
          return A.pixels(c);
        });
        const a = M.composite(p),
          b = A.pixels(flat);
        assert(
          a.every((v, i) => v === b[i]),
          "Layer composition differs",
        );
      }
  });
  await test("ZIP stores filename, payload bytes, and central directory", async () => {
    const bytes = new Uint8Array(
        await StudioIO.zip([
          ["sprite.png", Uint8Array.of(1, 2, 3)],
          ["timing.json", new TextEncoder().encode("[150]")],
        ]).arrayBuffer(),
      ),
      v = new DataView(bytes.buffer);
    assert(v.getUint32(0, true) === 0x04034b50, "Local ZIP header absent");
    const start = 30 + v.getUint16(26, true);
    assert(bytes[start] === 1 && bytes[start + 2] === 3, "Payload mismatch");
    assert(
      v.getUint32(bytes.length - 22, true) === 0x06054b50,
      "Directory footer absent",
    );
    assert(v.getUint16(bytes.length - 12, true) === 2, "Wrong entry count");
  });
  await test("GIF conversion decodes with the previewed palette and transparency", async () => {
    const pixels = new Uint32Array(16 * 24);
    pixels[17] = 0xff0000ff;
    pixels[18] = 0x80402080;
    const plan = StudioIO.gifPlan([pixels, pixels]),
      blob = StudioIO.gif(plan, 16, 24, [150, 230]),
      image = await createImageBitmap(blob),
      c = document.createElement("canvas");
    c.width = 16;
    c.height = 24;
    c.getContext("2d").drawImage(image, 0, 0);
    const actual = A.pixels(c);
    assert(actual[17] === 0xff0000ff, "Opaque GIF color changed");
    assert(actual[18] === 0x804020ff, "GIF preview conversion differs");
    assert(actual[0] === 0, "GIF background is not transparent");
    image.close();
  });
  await test("Typical 64 × 64 animation remains responsive within its memory budget", () => {
    const p = M.blank(64, 64);
    for (let i = 0; i < 3; i++) M.addLayer(p, 0);
    for (let i = 0; i < 15; i++) M.addFrame(p, 0);
    const d = new M.Document(p),
      start = performance.now();
    for (let i = 0; i < 20; i++) {
      d.change((p) => M.line(p, 0, 0, 0, i, 63, 63 - i, M.rgba("#b9ed83")));
      M.composite(d.project);
    }
    const elapsed = performance.now() - start;
    assert(
      elapsed < 1000,
      "20 edits/composites took " + Math.round(elapsed) + " ms",
    );
    document.querySelector("#summary").dataset.performance =
      Math.round(elapsed) + " ms for 20 edits/composites";
  });
  document.querySelector("#summary").textContent =
    `${passed} passed · ${failed} failed. ${document.querySelector("#summary").dataset.performance || ""}`;
})();

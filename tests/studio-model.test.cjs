"use strict";
const assert = require("node:assert/strict");
const M = require("../dist/studio-model.js");
let checks = 0;
function test(name, fn) {
  fn();
  checks++;
  console.log("PASS " + name);
}
const red = M.rgba("#ff0000"),
  blue = M.rgba("#0000ff");
test("rectangular dimensions and boundary isolation", () => {
  const p = M.blank(16, 24);
  M.line(p, 0, 0, 0, 0, 15, 23, red);
  assert.equal(p.frames[0].cels[0][0], red);
  assert.equal(p.frames[0].cels[0][383], red);
  assert.equal(p.frames[0].cels[0].length, 384);
  M.put(p, 0, 0, 16, 0, blue);
  assert.equal(p.frames[0].cels[0][16], 0);
});
test("bounded flood fill with alpha and contiguous region selection", () => {
  const p = M.blank(12, 9);
  M.line(p, 0, 0, 6, 0, 6, 8, red);
  M.fill(p, 0, 0, 0, 0, blue);
  assert.equal(p.frames[0].cels[0][5], blue);
  assert.equal(p.frames[0].cels[0][7], 0);
  assert.equal(M.region(p, 0, 0, 0, 0).length, 54);
});
test("mirroring includes both axes on a rectangular canvas", () => {
  const p = M.blank(8, 12);
  M.put(p, 0, 0, 1, 2, red, 1, "both");
  for (const [x, y] of [
    [1, 2],
    [6, 2],
    [1, 9],
    [6, 9],
  ])
    assert.equal(p.frames[0].cels[0][y * 8 + x], red);
});
test("locked and alpha-locked painting preserves original alpha", () => {
  const p = M.blank(3, 3);
  p.frames[0].cels[0][4] = 0xff000080;
  p.layers[0].alphaLock = true;
  M.put(p, 0, 0, 1, 1, blue);
  assert.equal(p.frames[0].cels[0][4], 0x0000ff80);
  M.put(p, 0, 0, 0, 0, blue);
  assert.equal(p.frames[0].cels[0][0], 0);
  M.put(p, 0, 0, 1, 1, 0);
  assert.equal(p.frames[0].cels[0][4], 0x0000ff80);
  p.layers[0].locked = true;
  M.fill(p, 0, 0, 1, 1, red);
  assert.equal(p.frames[0].cels[0][4], 0x0000ff80);
});
test("frame and layer copies are independent", () => {
  const p = M.blank(3, 3);
  M.put(p, 0, 0, 1, 1, red);
  M.addFrame(p, 0);
  M.addLayer(p, 0, true);
  M.put(p, 1, 1, 1, 1, blue);
  assert.equal(p.frames[0].cels[1][4], red);
  assert.equal(p.frames[1].cels[0][4], red);
  assert.equal(p.frames[1].cels[1][4], blue);
});
test("compositing uses source-over alpha and respects visibility/opacity", () => {
  const p = M.blank(1, 1);
  p.frames[0].cels[0][0] = red;
  M.addLayer(p, 0);
  p.frames[0].cels[1][0] = blue;
  p.layers[1].opacity = 0.5;
  assert.equal(M.composite(p)[0], 0x800080ff);
  p.layers[1].visible = false;
  assert.equal(M.composite(p)[0], red);
});
test("merging preserves rendering across every frame", () => {
  const p = M.blank(2, 2);
  M.addLayer(p, 0);
  M.addFrame(p, 0);
  for (const f of p.frames) {
    f.cels[0].fill(0xff000080);
    f.cels[1].fill(0x0000ff80);
  }
  p.layers[0].opacity = 0.5;
  p.layers[1].opacity = 0.7;
  const before = p.frames.map((_, i) => M.composite(p, i));
  M.mergeLayer(p, 1);
  p.frames.forEach((_, i) => assert.deepEqual(M.composite(p, i), before[i]));
});
test("shapes remain within rectangle and endpoints", () => {
  const p = M.blank(12, 10);
  M.shape(p, 0, 0, "rectangle", { x: 2, y: 3 }, { x: 7, y: 8 }, red);
  assert.equal(p.frames[0].cels[0][3 * 12 + 2], red);
  assert.equal(p.frames[0].cels[0][4 * 12 + 3], 0);
  M.shape(p, 0, 0, "ellipse", { x: 2, y: 3 }, { x: 7, y: 8 }, blue, true);
  assert.equal(p.frames[0].cels[0][5 * 12 + 5], blue);
  assert.equal(p.frames[0].cels[0][0], 0);
});
test("undo redo cancel restores geometry layers palette and pixels", () => {
  const d = new M.Document(M.blank(4, 6));
  d.change((p) => {
    p.palette.push("#abcdef");
    M.put(p, 0, 0, 1, 1, red);
    M.addLayer(p, 0);
  });
  d.change((p) => M.resize(p, 8, 12, true));
  d.undo();
  assert.equal(d.project.width, 4);
  assert.equal(d.project.layers.length, 2);
  d.undo();
  assert.equal(d.project.layers.length, 1);
  assert(!d.project.palette.includes("#abcdef"));
  d.redo();
  assert.equal(d.project.frames[0].cels[0][5], red);
  d.begin();
  M.resize(d.project, 2, 2);
  d.cancel();
  assert.equal(d.project.width, 4);
  d.change((p) => (p.name = "New branch"));
  assert.equal(d.redoStack.length, 0);
});
test("resize anchor and nearest-neighbor enlargement", () => {
  const p = M.blank(2, 3);
  p.frames[0].cels[0][0] = red;
  M.resize(p, 4, 6, true);
  for (const i of [0, 1, 4, 5]) assert.equal(p.frames[0].cels[0][i], red);
  assert.equal(p.frames[0].cels[0][2], 0);
  M.resize(p, 6, 8, false, "center");
  assert.equal(p.frames[0].cels[0][7], red);
});
test("save/load preserves RGBA, layer flags and unused palette colors", () => {
  const p = M.blank(2, 3);
  p.frames[0].cels[0][0] = 0x12345678;
  p.palette.push("#abcdef");
  p.layers[0].locked = true;
  const q = M.validate(JSON.parse(JSON.stringify(M.serialize(p))));
  assert.deepEqual(q, p);
  q.frames[0].cels[0][0] = 0;
  assert.equal(p.frames[0].cels[0][0], 0x12345678);
});
const recipe = {
  build: "standard",
  skin: "#dca477",
  eyes: "#315466",
  hair: "swept",
  hairColor: "#543a34",
  outfit: "tunic",
  cloth: "#4a8e79",
  trim: "#e5be70",
  hat: "none",
  weapon: "none",
  cape: false,
  capeColor: "#a54d5b",
};
test("v2 migration preserves draft even when active mode was generator", () => {
  const frames = Array.from({ length: 16 }, (_, i) =>
    Array(2304).fill(i ? i : -1),
  );
  const p = M.migrate({
    version: 2,
    character: recipe,
    mode: "generator",
    frames,
  });
  assert.equal(p.width, 48);
  assert.equal(p.frames[0].cels[0][0], 0);
  assert.equal(p.frames[15].cels[0][0], 0x00000fff);
  assert.equal(p.clips[3].frames[3], p.frames[15].id);
  assert.deepEqual(p.recipe, recipe);
});
test("v1 migration uses renderer without altering recipe", () => {
  let used;
  const p = M.migrate({ version: 1, character: recipe }, (r) => {
    used = r;
    return Array.from({ length: 16 }, () => ({
      id: M.uid(),
      duration: 167,
      cels: [new Uint32Array(2304)],
    }));
  });
  assert.deepEqual(used, recipe);
  assert.equal(p.frames.length, 16);
});
test("malformed files and allocations are rejected before replacement", () => {
  const p = M.serialize(M.blank());
  for (const mutate of [
    (p) => (p.width = 0),
    (p) => (p.height = 257),
    (p) => (p.frames[0].cels[0][0] = -1),
    (p) => (p.layers[0].opacity = NaN),
    (p) => (p.frames[0].duration = 0),
    (p) => (p.clips = [{ name: "bad", frames: ["missing"] }]),
    (p) => (p.palette = ["not-a-color"]),
  ]) {
    const q = structuredClone(p);
    mutate(q);
    assert.throws(() => M.validate(q));
  }
  assert.throws(() =>
    M.migrate({ version: 2, character: recipe, mode: "pixels", frames: null }),
  );
  const large = M.blank(256, 256);
  for (let i = 0; i < 31; i++) M.addFrame(large, 0);
  assert.throws(() => M.addFrame(large, 0));
});
test("clip membership follows duplication and deletion", () => {
  const p = M.blank(2, 2);
  p.clips = [{ name: "Idle", frames: [p.frames[0].id] }];
  M.addFrame(p, 0);
  assert.equal(p.clips[0].frames.length, 2);
  M.removeFrame(p, 0);
  assert.deepEqual(p.clips[0].frames, [p.frames[0].id]);
});
test("history memory stays bounded", () => {
  const p = M.blank(256, 256),
    d = new M.Document(p);
  for (let i = 0; i < 180; i++) d.change((p) => (p.frames[0].cels[0][0] = i));
  assert(d.undoStack.length < 180);
  assert(
    d.undoStack.reduce(
      (n, p) =>
        n + p.width * p.height * p.layers.length * p.frames.length * 4 + 8192,
      0,
    ) <= M.HISTORY,
  );
});
console.log(`${checks} model checks passed.`);

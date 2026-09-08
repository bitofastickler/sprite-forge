"use strict";
const assert = require("node:assert/strict"),
  M = require("../dist/studio-model.js"),
  G = require("../dist/generator.js"),
  old = require("./legacy-generator.cjs");
// Minimal integer rectangle rasterizer exercises the procedural renderer without a browser.
function context() {
  const pixels = new Uint32Array(2304),
    stack = [];
  let sx = 1,
    sy = 1,
    ox = 0,
    oy = 0;
  return {
    pixels,
    fillStyle: "#000000",
    save() {
      stack.push([sx, sy, ox, oy]);
    },
    restore() {
      [sx, sy, ox, oy] = stack.pop();
    },
    translate(x, y) {
      ox += x * sx;
      oy += y * sy;
    },
    scale(x, y) {
      sx *= x;
      sy *= y;
    },
    fillRect(x, y, w, h) {
      const xa = ox + x * sx,
        xb = ox + (x + w) * sx,
        ya = oy + y * sy,
        yb = oy + (y + h) * sy;
      for (
        let b = Math.max(0, Math.min(ya, yb));
        b < Math.min(48, Math.max(ya, yb));
        b++
      )
        for (
          let a = Math.max(0, Math.min(xa, xb));
          a < Math.min(48, Math.max(xa, xb));
          a++
        )
          pixels[b * 48 + a] = M.rgba(this.fillStyle);
    },
  };
}
let checks = 0;
for (const build of ["standard", "slim", "broad"])
  for (const hair of ["swept", "short", "long", "mohawk", "bald"])
    for (const outfit of ["tunic", "armor", "robe"])
      for (const hat of ["none", "hood", "helmet", "wizard"])
        for (const weapon of ["none", "sword", "staff", "axe"])
          for (const cape of [false, true]) {
            const s = { ...G.defaults, build, hair, outfit, hat, weapon, cape };
            for (let d = 0; d < 4; d++)
              for (let f = 0; f < 4; f++) {
                const baseline = context(),
                  current = context();
                old.draw(baseline, s, d, f);
                G.draw(current, s, d, f);
                assert.deepEqual(current.pixels, baseline.pixels);
                const composed = new Uint32Array(2304);
                for (const part of G.parts) {
                  const c = context();
                  G.draw(c, s, d, f, 0, 0, part);
                  for (let i = 0; i < 2304; i++)
                    if (c.pixels[i] & 255) composed[i] = c.pixels[i];
                }
                assert.deepEqual(
                  composed,
                  baseline.pixels,
                  `Part layers differ: ${JSON.stringify(s)}, direction ${d}, frame ${f}`,
                );
                checks++;
              }
          }
console.log(
  `PASS ${checks} generator frames: legacy renderer and nine-part compositing are pixel-exact.`,
);

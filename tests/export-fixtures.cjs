"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  IO = require("../dist/studio-io.js");
(async () => {
  const output = path.join(__dirname, "..", ".verification");
  fs.mkdirSync(output, { recursive: true });
  const a = new Uint32Array(16 * 24),
    b = new Uint32Array(16 * 24);
  a[17] = 0xff0000ff;
  b[34] = 0x00ff00ff;
  a[18] = 0x80402080;
  const plan = IO.gifPlan([a, b]);
  fs.writeFileSync(
    path.join(output, "encoder.gif"),
    Buffer.from(await IO.gif(plan, 16, 24, [150, 230]).arrayBuffer()),
  );
  fs.writeFileSync(
    path.join(output, "encoder.zip"),
    Buffer.from(
      await IO.zip([
        ["timing.json", new TextEncoder().encode("[150,230]")],
        ["pixels.bin", Uint8Array.of(0, 1, 2, 255)],
      ]).arrayBuffer(),
    ),
  );
  console.log(
    "Generated GIF and ZIP fixtures in .verification/ for independent decoding.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

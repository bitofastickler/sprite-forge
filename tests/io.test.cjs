"use strict";
const assert = require("node:assert/strict"),
  { zip } = require("../dist/studio-io.js");
(async () => {
  const entries = [
      ["frame-001.png", Uint8Array.from({ length: 1024 }, (_, i) => i % 256)],
      ["timing.json", new TextEncoder().encode('[{"duration":150}]')],
    ],
    blob = zip(entries),
    buffer = Buffer.from(await blob.arrayBuffer());
  const footer = buffer.length - 22;
  assert.equal(buffer.readUInt32LE(footer), 0x06054b50);
  assert.equal(buffer.readUInt16LE(footer + 10), 2);
  let central = buffer.readUInt32LE(footer + 16),
    pos = 0;
  for (const [name, payload] of entries) {
    assert.equal(buffer.readUInt32LE(pos), 0x04034b50);
    const nameLength = buffer.readUInt16LE(pos + 26),
      size = buffer.readUInt32LE(pos + 18);
    assert.equal(
      buffer.toString("utf8", pos + 30, pos + 30 + nameLength),
      name,
    );
    assert.deepEqual(
      buffer.subarray(pos + 30 + nameLength, pos + 30 + nameLength + size),
      Buffer.from(payload),
    );
    assert.equal(buffer.readUInt32LE(central), 0x02014b50);
    assert.equal(buffer.readUInt32LE(central + 42), pos);
    assert.equal(
      buffer.readUInt32LE(central + 16),
      buffer.readUInt32LE(pos + 14),
    );
    central += 46 + nameLength;
    pos += 30 + nameLength + size;
  }
  assert.equal(central, footer);
  console.log(
    "PASS ZIP filenames, payloads, checksums, directory offsets, entry count.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

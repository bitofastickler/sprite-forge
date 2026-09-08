"use strict";
const StudioIO = (() => {
  function zip(entries) {
    const encoder = new TextEncoder(),
      parts = [],
      directory = [];
    let offset = 0;
    const crc = (bytes) => {
      let n = 0xffffffff;
      for (const b of bytes) {
        n ^= b;
        for (let k = 0; k < 8; k++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
      }
      return (n ^ 0xffffffff) >>> 0;
    };
    for (const [name, bytes] of entries) {
      const path = encoder.encode(name),
        sum = crc(bytes),
        head = new Uint8Array(30 + path.length),
        v = new DataView(head.buffer);
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint32(14, sum, true);
      v.setUint32(18, bytes.length, true);
      v.setUint32(22, bytes.length, true);
      v.setUint16(26, path.length, true);
      head.set(path, 30);
      parts.push(head, bytes);
      const entry = new Uint8Array(46 + path.length),
        d = new DataView(entry.buffer);
      d.setUint32(0, 0x02014b50, true);
      d.setUint16(4, 20, true);
      d.setUint16(6, 20, true);
      d.setUint32(16, sum, true);
      d.setUint32(20, bytes.length, true);
      d.setUint32(24, bytes.length, true);
      d.setUint16(28, path.length, true);
      d.setUint32(42, offset, true);
      entry.set(path, 46);
      directory.push(entry);
      offset += head.length + bytes.length;
    }
    const length = directory.reduce((n, e) => n + e.length, 0),
      end = new Uint8Array(22),
      v = new DataView(end.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, entries.length, true);
    v.setUint16(10, entries.length, true);
    v.setUint32(12, length, true);
    v.setUint32(16, offset, true);
    return new Blob([...parts, ...directory, end], { type: "application/zip" });
  }

  // GIF uses binary transparency and at most 255 opaque colors. Quantization is
  // shared with the export preview so the user sees the conversion before saving.
  function gifPlan(frames) {
    const counts = new Map();
    let partial = false;
    for (const frame of frames)
      for (const p of frame) {
        const a = p & 255;
        if (a && a !== 255) partial = true;
        if (a >= 128) {
          const rgb = p >>> 8;
          counts.set(rgb, (counts.get(rgb) || 0) + 1);
        }
      }
    const palette = [
        0,
        ...[...counts]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 255)
          .map(([rgb]) => rgb),
      ],
      cache = new Map(palette.slice(1).map((p, i) => [p, i + 1]));
    const indexed = frames.map((frame) =>
      Uint8Array.from(frame, (p) => {
        if ((p & 255) < 128) return 0;
        const rgb = p >>> 8;
        if (cache.has(rgb)) return cache.get(rgb);
        let best = 1,
          distance = Infinity;
        for (let i = 1; i < palette.length; i++) {
          const q = palette[i],
            d =
              ((rgb >>> 16) - (q >>> 16)) ** 2 +
              (((rgb >>> 8) & 255) - ((q >>> 8) & 255)) ** 2 +
              ((rgb & 255) - (q & 255)) ** 2;
          if (d < distance) {
            distance = d;
            best = i;
          }
        }
        cache.set(rgb, best);
        return best;
      }),
    );
    return {
      palette,
      indexed,
      partial,
      quantized: counts.size > 255,
      preview: indexed.map((frame) =>
        Uint32Array.from(frame, (i) =>
          i ? ((palette[i] << 8) | 255) >>> 0 : 0,
        ),
      ),
    };
  }
  function gif(plan, width, height, durations) {
    const bytes = [],
      write = (...values) => bytes.push(...values),
      word = (n) => write(n & 255, (n >> 8) & 255),
      text = (s) => {
        for (const ch of s) write(ch.charCodeAt(0));
      };
    text("GIF89a");
    word(width);
    word(height);
    write(0xf7, 0, 0);
    for (let i = 0; i < 256; i++) {
      const p = plan.palette[i] || 0;
      write(p >>> 16, (p >>> 8) & 255, p & 255);
    }
    write(0x21, 0xff, 11);
    text("NETSCAPE2.0");
    write(3, 1, 0, 0, 0);
    for (let n = 0; n < plan.indexed.length; n++) {
      write(0x21, 0xf9, 4, 9);
      word(Math.max(2, Math.round(durations[n] / 10)));
      write(0, 0, 0x2c);
      word(0);
      word(0);
      word(width);
      word(height);
      write(0, 8);
      const stream = [];
      let bits = 0,
        count = 0;
      const code = (v) => {
        bits |= v << count;
        count += 9;
        while (count >= 8) {
          stream.push(bits & 255);
          bits >>>= 8;
          count -= 8;
        }
      };
      // Frequent clear codes keep this dependency-free encoder simple and bounded.
      for (const p of plan.indexed[n]) {
        code(256);
        code(p);
      }
      code(257);
      if (count) stream.push(bits & 255);
      for (let i = 0; i < stream.length; i += 255) {
        const part = stream.slice(i, i + 255);
        write(part.length);
        for (const b of part) write(b);
      }
      write(0);
    }
    write(0x3b);
    return new Blob([Uint8Array.from(bytes)], { type: "image/gif" });
  }
  return { zip, gifPlan, gif };
})();
if (typeof module !== "undefined") module.exports = StudioIO;

"use strict";

// Portable pixels are unsigned 0xRRGGBBAA values. Cels use Uint32Array internally.
const StudioModel = (() => {
  const LIMIT = 2 * 1024 * 1024; // total pixels across all frames and layers (8 MiB)
  const HISTORY = 32 * 1024 * 1024;
  const PALETTES = {
    Meadow: [
      "#202b35",
      "#435668",
      "#73917c",
      "#b9ed83",
      "#f4f0c9",
      "#e7ba83",
      "#c87863",
      "#795579",
    ],
    Ember: [
      "#211e33",
      "#47344d",
      "#7d4664",
      "#b05b60",
      "#dd8969",
      "#f2b980",
      "#f8e5b0",
      "#fff7e4",
      "#3c5260",
      "#547c75",
      "#81b59a",
      "#c0d997",
      "#795949",
      "#a88064",
      "#bd9c8b",
      "#e1c9b5",
    ],
    Tide: [
      "#182638",
      "#283f59",
      "#345e79",
      "#43899d",
      "#6ebdb0",
      "#a4d7b1",
      "#e0edc5",
      "#f9f0d9",
      "#5c4065",
      "#875575",
      "#b77985",
      "#e5a59b",
      "#856a59",
      "#b38c69",
      "#dfbc8d",
      "#fff2cf",
    ],
    Orchard: [
      "#171c2c",
      "#293349",
      "#40516a",
      "#63788a",
      "#8ba3b0",
      "#bcc9ce",
      "#e2e7dc",
      "#fff5d9",
      "#35283e",
      "#634161",
      "#925275",
      "#be7490",
      "#dfa0aa",
      "#f4cabc",
      "#714636",
      "#a66846",
      "#cf9660",
      "#edc482",
      "#f5dfac",
      "#45492f",
      "#667440",
      "#8ba64e",
      "#bbce72",
      "#dce99a",
      "#204c4d",
      "#337371",
      "#55a09b",
      "#8ec9b7",
      "#4c3e70",
      "#786199",
      "#a187bc",
      "#cbb8df",
    ],
  };
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const rgba = (hex) => ((parseInt(hex.slice(1), 16) << 8) | 255) >>> 0;
  const hex = (p) => "#" + (p >>> 8).toString(16).padStart(6, "0");
  const integer = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const clone = (p) => ({
    ...p,
    palette: [...p.palette],
    origin: { ...p.origin },
    recipe: p.recipe ? JSON.parse(JSON.stringify(p.recipe)) : null,
    layers: p.layers.map((l) => ({ ...l })),
    clips: p.clips.map((c) => ({ ...c, frames: [...c.frames] })),
    frames: p.frames.map((f) => ({ ...f, cels: f.cels.map((c) => c.slice()) })),
  });
  function blank(width = 32, height = 32, name = "Untitled sprite") {
    if (!integer(width, 1, 256) || !integer(height, 1, 256))
      throw Error("Choose dimensions from 1 to 256 pixels.");
    return {
      version: 3,
      id: uid(),
      name,
      width,
      height,
      palette: [...PALETTES.Meadow],
      origin: { x: Math.floor(width / 2), y: height - 1 },
      recipe: null,
      layers: [
        {
          id: uid(),
          name: "Artwork",
          visible: true,
          locked: false,
          alphaLock: false,
          opacity: 1,
        },
      ],
      frames: [
        { id: uid(), duration: 150, cels: [new Uint32Array(width * height)] },
      ],
      clips: [],
    };
  }
  function validate(raw) {
    const fail = () => {
      throw Error(
        "This is not a valid Sprite Forge project. Your current artwork is safe.",
      );
    };
    if (
      !raw ||
      raw.version !== 3 ||
      !integer(raw.width, 1, 256) ||
      !integer(raw.height, 1, 256)
    )
      fail();
    if (
      !Array.isArray(raw.layers) ||
      !integer(raw.layers.length, 1, 32) ||
      !Array.isArray(raw.frames) ||
      !integer(raw.frames.length, 1, 256)
    )
      fail();
    if (raw.width * raw.height * raw.layers.length * raw.frames.length > LIMIT)
      throw Error("This project exceeds the 2 million pixel document limit.");
    if (
      typeof raw.name !== "string" ||
      raw.name.length > 120 ||
      typeof raw.id !== "string" ||
      raw.id.length > 100
    )
      fail();
    const colors = raw.palette;
    if (
      !Array.isArray(colors) ||
      colors.length > 256 ||
      colors.some((c) => typeof c !== "string" || !/^#[a-f0-9]{6}$/i.test(c))
    )
      fail();
    if (
      !raw.origin ||
      !integer(raw.origin.x, 0, raw.width - 1) ||
      !integer(raw.origin.y, 0, raw.height - 1)
    )
      fail();
    const layers = raw.layers.map((l) => {
      if (
        !l ||
        typeof l.id !== "string" ||
        typeof l.name !== "string" ||
        l.name.length > 80 ||
        l.id.length > 100 ||
        typeof l.visible !== "boolean" ||
        typeof l.locked !== "boolean" ||
        typeof l.alphaLock !== "boolean" ||
        !Number.isFinite(l.opacity) ||
        l.opacity < 0 ||
        l.opacity > 1
      )
        fail();
      return {
        id: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        alphaLock: l.alphaLock,
        opacity: l.opacity,
      };
    });
    const frames = raw.frames.map((f) => {
      if (
        !f ||
        typeof f.id !== "string" ||
        f.id.length > 100 ||
        !integer(f.duration, 20, 10000) ||
        !Array.isArray(f.cels) ||
        f.cels.length !== layers.length
      )
        fail();
      return {
        id: f.id,
        duration: f.duration,
        cels: f.cels.map((c) => {
          if (
            !(Array.isArray(c) || c instanceof Uint32Array) ||
            c.length !== raw.width * raw.height
          )
            fail();
          for (const n of c) if (!integer(n, 0, 0xffffffff)) fail();
          return Uint32Array.from(c);
        }),
      };
    });
    if (
      new Set(layers.map((l) => l.id)).size !== layers.length ||
      new Set(frames.map((f) => f.id)).size !== frames.length
    )
      fail();
    if (!Array.isArray(raw.clips) || raw.clips.length > 256) fail();
    const ids = new Set(frames.map((f) => f.id));
    const clips = raw.clips.map((c) => {
      if (
        !c ||
        typeof c.name !== "string" ||
        c.name.length > 80 ||
        !Array.isArray(c.frames) ||
        !c.frames.length ||
        c.frames.some((id) => !ids.has(id)) ||
        new Set(c.frames).size !== c.frames.length
      )
        fail();
      return { name: c.name, frames: [...c.frames] };
    });
    const recipe = raw.recipe == null ? null : validateRecipe(raw.recipe);
    return {
      version: 3,
      id: raw.id,
      name: raw.name,
      width: raw.width,
      height: raw.height,
      palette: [...new Set(colors.map((c) => c.toLowerCase()))],
      origin: { ...raw.origin },
      recipe,
      layers,
      frames,
      clips,
    };
  }
  function validateRecipe(r) {
    const options = {
      build: ["standard", "slim", "broad"],
      hair: ["swept", "short", "long", "mohawk", "bald"],
      outfit: ["tunic", "armor", "robe"],
      hat: ["none", "hood", "helmet", "wizard"],
      weapon: ["none", "sword", "staff", "axe"],
    };
    const out = {};
    for (const [key, values] of Object.entries(options)) {
      if (!values.includes(r?.[key])) throw Error("Invalid character recipe.");
      out[key] = r[key];
    }
    for (const key of [
      "skin",
      "eyes",
      "hairColor",
      "cloth",
      "trim",
      "capeColor",
    ]) {
      if (!/^#[a-f0-9]{6}$/i.test(r?.[key]))
        throw Error("Invalid character color.");
      out[key] = r[key];
    }
    if (typeof r.cape !== "boolean") throw Error("Invalid character cape.");
    out.cape = r.cape;
    return out;
  }
  function migrate(raw, generate) {
    if (raw?.version === 3) return validate(raw);
    if (!raw || ![1, 2].includes(raw.version))
      throw Error("Unsupported project format.");
    const recipe = validateRecipe(raw.character),
      p = blank(48, 48, "Imported character");
    p.recipe = recipe;
    if (raw.version === 2 && !["pixels", "generator"].includes(raw.mode))
      throw Error("Invalid project mode.");
    if (raw.version === 2 && raw.frames !== null) {
      if (!Array.isArray(raw.frames) || raw.frames.length !== 16)
        throw Error("Invalid legacy frames.");
      p.frames = raw.frames.map((c) => {
        if (
          !Array.isArray(c) ||
          c.length !== 2304 ||
          c.some((n) => !integer(n, -1, 0xffffff))
        )
          throw Error("Invalid legacy pixels.");
        return {
          id: uid(),
          duration: 167,
          cels: [
            Uint32Array.from(c, (n) => (n < 0 ? 0 : ((n << 8) | 255) >>> 0)),
          ],
        };
      });
    } else {
      if (raw.version === 2 && raw.mode === "pixels")
        throw Error("Missing pixel draft.");
      if (!generate) throw Error("Character renderer required.");
      p.frames = generate(recipe);
    }
    p.clips = ["Down", "Left", "Up", "Right"].map((name, i) => ({
      name: `Walk ${name}`,
      frames: p.frames.slice(i * 4, i * 4 + 4).map((f) => f.id),
    }));
    p.palette = extract(p);
    return validate(p);
  }
  function serialize(p) {
    return {
      ...p,
      frames: p.frames.map((f) => ({
        ...f,
        cels: f.cels.map((c) => Array.from(c)),
      })),
    };
  }
  function over(bottom, top, opacity = 1) {
    const ta = ((top & 255) / 255) * opacity,
      ba = (bottom & 255) / 255,
      a = ta + ba * (1 - ta);
    if (!a) return 0;
    const channel = (shift) =>
      Math.round(
        (((top >>> shift) & 255) * ta +
          ((bottom >>> shift) & 255) * ba * (1 - ta)) /
          a,
      );
    return (
      ((channel(24) << 24) |
        (channel(16) << 16) |
        (channel(8) << 8) |
        Math.round(a * 255)) >>>
      0
    );
  }
  function composite(p, frame = 0) {
    const out = new Uint32Array(p.width * p.height);
    p.layers.forEach((l, i) => {
      if (l.visible && l.opacity)
        for (let n = 0; n < out.length; n++)
          out[n] = over(out[n], p.frames[frame].cels[i][n], l.opacity);
    });
    return out;
  }
  function extract(p) {
    const colors = new Set();
    for (const f of p.frames)
      for (const c of f.cels)
        for (const n of c) {
          if (n & 255) colors.add(hex(n));
          if (colors.size >= 256) return [...colors];
        }
    return [...colors];
  }
  function put(
    p,
    fi,
    li,
    x,
    y,
    color,
    size = 1,
    symmetry = "none",
    dither = false,
  ) {
    const l = p.layers[li];
    if (l.locked) return;
    const c = p.frames[fi].cels[li];
    const paint = (a, b) => {
      if (
        a < 0 ||
        a >= p.width ||
        b < 0 ||
        b >= p.height ||
        (dither && (a + b) % 2)
      )
        return;
      const i = b * p.width + a;
      if (l.alphaLock) {
        if (c[i] & 255 && color & 255)
          c[i] = ((color & 0xffffff00) | (c[i] & 255)) >>> 0;
      } else c[i] = color;
    };
    for (let dy = 0; dy < size; dy++)
      for (let dx = 0; dx < size; dx++) {
        const a = x + dx,
          b = y + dy;
        paint(a, b);
        if (symmetry === "horizontal" || symmetry === "both")
          paint(p.width - 1 - a, b);
        if (symmetry === "vertical" || symmetry === "both")
          paint(a, p.height - 1 - b);
        if (symmetry === "both") paint(p.width - 1 - a, p.height - 1 - b);
      }
  }
  function line(
    p,
    fi,
    li,
    x0,
    y0,
    x1,
    y1,
    color,
    size = 1,
    symmetry = "none",
    dither = false,
  ) {
    let dx = Math.abs(x1 - x0),
      sx = x0 < x1 ? 1 : -1,
      dy = -Math.abs(y1 - y0),
      sy = y0 < y1 ? 1 : -1,
      error = dx + dy;
    for (;;) {
      put(p, fi, li, x0, y0, color, size, symmetry, dither);
      if (x0 === x1 && y0 === y1) break;
      const e = 2 * error;
      if (e >= dy) {
        error += dy;
        x0 += sx;
      }
      if (e <= dx) {
        error += dx;
        y0 += sy;
      }
    }
  }
  function region(p, fi, li, x, y) {
    if (x < 0 || x >= p.width || y < 0 || y >= p.height) return [];
    const c = p.frames[fi].cels[li],
      start = y * p.width + x,
      target = c[start],
      seen = new Uint8Array(c.length),
      q = [start];
    seen[start] = 1;
    for (let head = 0; head < q.length; head++) {
      const i = q[head],
        a = i % p.width,
        b = Math.floor(i / p.width);
      for (const j of [
        a > 0 ? i - 1 : -1,
        a < p.width - 1 ? i + 1 : -1,
        b > 0 ? i - p.width : -1,
        b < p.height - 1 ? i + p.width : -1,
      ])
        if (j >= 0 && !seen[j] && c[j] === target) {
          seen[j] = 1;
          q.push(j);
        }
    }
    return q;
  }
  function fill(p, fi, li, x, y, color) {
    if (p.layers[li].locked) return;
    for (const i of region(p, fi, li, x, y))
      put(p, fi, li, i % p.width, Math.floor(i / p.width), color);
  }
  function shape(
    p,
    fi,
    li,
    type,
    a,
    b,
    color,
    solid = false,
    size = 1,
    sym = "none",
  ) {
    if (type === "line") {
      line(p, fi, li, a.x, a.y, b.x, b.y, color, size, sym);
      return;
    }
    const left = Math.min(a.x, b.x),
      right = Math.max(a.x, b.x),
      top = Math.min(a.y, b.y),
      bottom = Math.max(a.y, b.y);
    if (type === "rectangle") {
      for (let y = top; y <= bottom; y++)
        for (let x = left; x <= right; x++)
          if (solid || x === left || x === right || y === top || y === bottom)
            put(p, fi, li, x, y, color, 1, sym);
      return;
    }
    const rx = (right - left + 1) / 2,
      ry = (bottom - top + 1) / 2,
      cx = (left + right) / 2,
      cy = (top + bottom) / 2;
    const inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++)
        if (
          inside(x, y) &&
          (solid ||
            !inside(x - 1, y) ||
            !inside(x + 1, y) ||
            !inside(x, y - 1) ||
            !inside(x, y + 1))
        )
          put(p, fi, li, x, y, color, 1, sym);
  }
  function capacity(
    p,
    frames = p.frames.length,
    layers = p.layers.length,
    width = p.width,
    height = p.height,
  ) {
    if (frames > 256 || layers > 32 || frames * layers * width * height > LIMIT)
      throw Error(
        "Document limit reached. Use fewer frames, layers, or a smaller canvas.",
      );
  }
  function addFrame(p, fi, duplicate = true) {
    capacity(p, p.frames.length + 1);
    const f = {
      id: uid(),
      duration: p.frames[fi].duration,
      cels: p.layers.map((_, i) =>
        duplicate
          ? p.frames[fi].cels[i].slice()
          : new Uint32Array(p.width * p.height),
      ),
    };
    p.frames.splice(fi + 1, 0, f);
    for (const c of p.clips) {
      const i = c.frames.indexOf(p.frames[fi].id);
      if (i >= 0) c.frames.splice(i + 1, 0, f.id);
    }
    return fi + 1;
  }
  function removeFrame(p, fi) {
    if (p.frames.length === 1) throw Error("Keep at least one frame.");
    const id = p.frames[fi].id;
    p.frames.splice(fi, 1);
    p.clips = p.clips
      .map((c) => ({ ...c, frames: c.frames.filter((f) => f !== id) }))
      .filter((c) => c.frames.length);
  }
  function addLayer(p, li, duplicate = false) {
    capacity(p, p.frames.length, p.layers.length + 1);
    const l = duplicate
      ? {
          ...p.layers[li],
          id: uid(),
          name: p.layers[li].name + " copy",
          locked: false,
        }
      : {
          id: uid(),
          name: "Layer " + (p.layers.length + 1),
          visible: true,
          locked: false,
          alphaLock: false,
          opacity: 1,
        };
    p.layers.splice(li + 1, 0, l);
    for (const f of p.frames)
      f.cels.splice(
        li + 1,
        0,
        duplicate ? f.cels[li].slice() : new Uint32Array(p.width * p.height),
      );
    return li + 1;
  }
  function removeLayer(p, li) {
    if (p.layers.length === 1) throw Error("Keep at least one layer.");
    if (p.layers[li].locked) throw Error("Unlock this layer first.");
    p.layers.splice(li, 1);
    for (const f of p.frames) f.cels.splice(li, 1);
  }
  function mergeLayer(p, li) {
    if (li === 0) throw Error("This is already the bottom layer.");
    const a = p.layers[li - 1],
      b = p.layers[li];
    if (a.locked || b.locked) throw Error("Unlock both layers first.");
    for (const f of p.frames)
      for (let i = 0; i < f.cels[li].length; i++)
        f.cels[li - 1][i] = over(
          a.visible ? over(0, f.cels[li - 1][i], a.opacity) : 0,
          b.visible ? f.cels[li][i] : 0,
          b.opacity,
        );
    a.opacity = 1;
    a.visible = true;
    removeLayer(p, li);
  }
  function resize(p, width, height, scale = false, anchor = "center") {
    if (!integer(width, 1, 256) || !integer(height, 1, 256))
      throw Error("Choose dimensions from 1 to 256.");
    capacity(p, p.frames.length, p.layers.length, width, height);
    const ox = anchor === "top-left" ? 0 : Math.floor((width - p.width) / 2),
      oy = anchor === "top-left" ? 0 : Math.floor((height - p.height) / 2);
    for (const f of p.frames)
      f.cels = f.cels.map((c) => {
        const out = new Uint32Array(width * height);
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++) {
            const sx = scale ? Math.floor((x * p.width) / width) : x - ox,
              sy = scale ? Math.floor((y * p.height) / height) : y - oy;
            if (sx >= 0 && sx < p.width && sy >= 0 && sy < p.height)
              out[y * width + x] = c[sy * p.width + sx];
          }
        return out;
      });
    p.origin = {
      x: Math.max(
        0,
        Math.min(
          width - 1,
          scale ? Math.floor((p.origin.x * width) / p.width) : p.origin.x + ox,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          height - 1,
          scale
            ? Math.floor((p.origin.y * height) / p.height)
            : p.origin.y + oy,
        ),
      ),
    };
    p.width = width;
    p.height = height;
  }
  const bytes = (p) =>
    p.width * p.height * p.frames.length * p.layers.length * 4 + 8192;
  class Document {
    constructor(p = blank()) {
      this.project = validate(p);
      this.undoStack = [];
      this.redoStack = [];
      this.pending = null;
    }
    begin() {
      if (!this.pending) this.pending = clone(this.project);
    }
    commit() {
      if (!this.pending) return false;
      this.undoStack.push(this.pending);
      this.pending = null;
      this.redoStack = [];
      let total = this.undoStack.reduce((s, p) => s + bytes(p), 0);
      while (this.undoStack.length > 1 && total > HISTORY)
        total -= bytes(this.undoStack.shift());
      return true;
    }
    cancel() {
      if (this.pending) {
        this.project = this.pending;
        this.pending = null;
      }
    }
    change(fn) {
      this.begin();
      try {
        fn(this.project);
        this.commit();
      } catch (e) {
        this.cancel();
        throw e;
      }
    }
    undo() {
      this.cancel();
      if (this.undoStack.length) {
        this.redoStack.push(this.project);
        this.project = this.undoStack.pop();
      }
    }
    redo() {
      this.cancel();
      if (this.redoStack.length) {
        this.undoStack.push(this.project);
        this.project = this.redoStack.pop();
      }
    }
  }
  return {
    LIMIT,
    HISTORY,
    PALETTES,
    uid,
    rgba,
    hex,
    blank,
    clone,
    validate,
    validateRecipe,
    migrate,
    serialize,
    over,
    composite,
    extract,
    put,
    line,
    region,
    fill,
    shape,
    capacity,
    addFrame,
    removeFrame,
    addLayer,
    removeLayer,
    mergeLayer,
    resize,
    Document,
  };
})();
if (typeof module !== "undefined") module.exports = StudioModel;

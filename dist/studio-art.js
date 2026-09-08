"use strict";
// Original Sprite Forge examples and palette designs, CC0. See docs/art-credits.md.
const StudioArt = (() => {
  const M = StudioModel;
  const samples = {
    potion: {
      name: "A little potion",
      size: 16,
      kind: "lesson",
      caption: "16 × 16 · first lesson",
      colors: {
        o: "#293349",
        b: "#8ba3b0",
        l: "#e2e7dc",
        p: "#925275",
        h: "#dfa0aa",
        s: "#634161",
        c: "#cf9660",
      },
      rows: [
        "................",
        "......oooo......",
        "......occo......",
        "......oblo......",
        ".....obllo......",
        "....obllblo.....",
        "...oblllbblo....",
        "...ollllbbbo....",
        "...olhhhhppo....",
        "...olhpppppo....",
        "...obppppsso....",
        "...obpppssso....",
        "....opsssso.....",
        ".....ooooo......",
        "................",
        "................",
      ],
    },
    creature: {
      name: "A woodland friend",
      size: 32,
      kind: "lesson",
      caption: "32 × 32 · shape & color",
      colors: {
        o: "#293349",
        s: "#435668",
        b: "#73917c",
        h: "#b9ed83",
        l: "#f4f0c9",
        p: "#c87863",
      },
      rows: [
        "................",
        "...oo......oo...",
        "...oho....oho...",
        "...ohho..ohho...",
        "....ohhhhhho....",
        "...ohhhhhhhho...",
        "..ohhhhhhhhhho..",
        "..ohlohhhlohho..",
        "..ohloshhlohho..",
        "..ohhhsshhhsho..",
        "..ohphhhhphsso..",
        "...ohhhhhhsso...",
        "....osbbbso.....",
        "...ohsbbbsbo....",
        "...oooo.oooo....",
        "................",
      ],
    },
    sparkle: {
      name: "A tiny bit of magic",
      size: 16,
      kind: "lesson",
      caption: "16 × 16 · two-frame loop",
      colors: { o: "#795579", b: "#e7ba83", h: "#f4f0c9" },
      rows: [
        "................",
        ".......o........",
        ".......h........",
        "......ohb.......",
        "......ohb.......",
        ".....obhhb......",
        "...oobhhhboo....",
        ".ohhhhhhhhhhhbo.",
        "...oobhhhboo....",
        ".....obhhb......",
        "......ohb.......",
        "......ohb.......",
        ".......h........",
        ".......o........",
        "................",
        "................",
      ],
    },
    tile: {
      name: "A patch of meadow",
      size: 16,
      kind: "template",
      caption: "16 × 16 · repeating tile",
      colors: {
        b: "#435668",
        s: "#73917c",
        h: "#b9ed83",
        f: "#f4f0c9",
        p: "#c87863",
      },
      rows: [
        "ssssssssssssssss",
        "sssbsssssshsssss",
        "ssbsssssshhhssss",
        "sssssssssshsssss",
        "ssssshssssssssss",
        "sssshhhsssssbsss",
        "ssssshssssssssss",
        "ssssssssssssssss",
        "spssssssssssssss",
        "pfpsssssssshssss",
        "spsssssssshhhsss",
        "ssssssssssshssss",
        "ssssbsssssssssss",
        "ssssssssssbsssss",
        "ssshssssssssssss",
        "sshhsbssssssssss",
      ],
    },
  };
  function project(key, blank = false) {
    const s = samples[key],
      p = M.blank(s.size, s.size, s.name);
    p.palette = Object.values(s.colors);
    if (!blank) {
      const scale = s.size / 16;
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const c = s.colors[s.rows[y][x]];
          if (c) M.put(p, 0, 0, x * scale, y * scale, M.rgba(c), scale);
        }
    }
    return p;
  }
  function canvas(
    pixels,
    width,
    height,
    target = document.createElement("canvas"),
  ) {
    target.width = width;
    target.height = height;
    const ctx = target.getContext("2d"),
      image = ctx.createImageData(width, height);
    for (let i = 0; i < pixels.length; i++) {
      image.data[i * 4] = pixels[i] >>> 24;
      image.data[i * 4 + 1] = (pixels[i] >>> 16) & 255;
      image.data[i * 4 + 2] = (pixels[i] >>> 8) & 255;
      image.data[i * 4 + 3] = pixels[i] & 255;
    }
    ctx.putImageData(image, 0, 0);
    return target;
  }
  function pixels(canvas) {
    const bytes = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data,
      out = new Uint32Array(canvas.width * canvas.height);
    for (let i = 0; i < out.length; i++)
      out[i] =
        ((bytes[i * 4] << 24) |
          (bytes[i * 4 + 1] << 16) |
          (bytes[i * 4 + 2] << 8) |
          bytes[i * 4 + 3]) >>>
        0;
    return out;
  }
  const lessons = {
    potion: [
      [
        "Start with a silhouette",
        "Use Pencil and the darkest palette color. Draw a small bottle: a narrow neck, rounded sides, and a flat base.",
        "pencil",
      ],
      [
        "Give it a base color",
        "Choose a light blue. Use Fill inside the bottle. Leave a little room for the cork.",
        "fill",
      ],
      [
        "Add a magical ingredient",
        "Pick purple and use Pencil to fill the bottom half with your potion. Your bottle can be any shape you like.",
        "pencil",
      ],
      [
        "Find the light",
        "Add a pale highlight down the left side and a darker shade on the right. A few pixels are enough.",
        "pencil",
      ],
      [
        "See what you made",
        "Switch Preview to Native size. Try the light background. Adjust any pixels that make the bottle hard to read.",
        "pencil",
      ],
      [
        "Make it yours to keep",
        "Export an Image PNG, then save an editable project file. You can close this lesson without losing your drawing.",
        "pencil",
      ],
    ],
    creature: [
      [
        "Meet your silhouette",
        "Draw a friendly creature using Pencil or a filled ellipse. Add two ears. Use the darkest color for the edge.",
        "ellipse",
      ],
      [
        "Fill in the personality",
        "Use a mid-tone green inside the silhouette. Large, simple shapes are easier to read at small sizes.",
        "fill",
      ],
      [
        "Eyes bring it to life",
        "Place two pale eyes, then use a dark pixel for each pupil. Try Mirror left / right for a balanced face.",
        "pencil",
      ],
      [
        "Add a little depth",
        "Use a darker green underneath the face and a light green along the top. Keep the light coming from one side.",
        "pencil",
      ],
      [
        "Give it a finishing touch",
        "Add rosy cheeks, spots, or a little leaf. Native-size Preview helps you decide which details to keep.",
        "pencil",
      ],
      [
        "Your first little friend",
        "Export an Image PNG. To try a blink later, choose Animate and duplicate your frame.",
        "pencil",
      ],
    ],
    sparkle: [
      [
        "Draw a little light",
        "Use a pale color and the Line tool to draw a small cross in the center. Add diagonal pixels for a diamond shape.",
        "line",
      ],
      [
        "Give it a glow",
        "Add a warm border around the pale center. Use Pencil for a few deliberate pixels.",
        "pencil",
      ],
      [
        "Make a second moment",
        "Choose Animate, then Duplicate. This makes a new editable frame while keeping the first one.",
        "pencil",
      ],
      [
        "Make the light breathe",
        "On the second frame, erase a few outer pixels. Turn on Previous to see where the first frame was.",
        "eraser",
      ],
      [
        "Watch it shimmer",
        "Press Play. Try 200 ms or 300 ms frame durations. Select each frame to change its duration.",
        "pencil",
      ],
      [
        "Take your animation with you",
        "Export a sprite sheet with timing metadata or a ZIP of numbered PNG frames. Your editable project keeps both frames.",
        "pencil",
      ],
    ],
  };
  return { samples, project, canvas, pixels, lessons };
})();

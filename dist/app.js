"use strict";
(() => {
  const M = StudioModel,
    A = StudioArt,
    $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const paint = $("#paint"),
    overlay = $("#overlay"),
    viewport = $("#viewport");
  let doc = null,
    fi = 0,
    li = 0,
    zoom = 12,
    tool = "pencil",
    color = "#b9ed83",
    stroke = null,
    cursor = null,
    selection = null,
    clipboard = null;
  let playing = false,
    playIndex = 0,
    lastTick = 0,
    timeline = false,
    lesson = null,
    revision = 0,
    dirty = false,
    saving = null,
    saveTimer = null;
  let changeSerial = 0,
    imported = null,
    referenceURL = null,
    storageError = "",
    operationApply = null,
    operationCancel = null;
  const sessions = new Map(); // Keeps unsaved documents safe even when browser storage fails.
  const P = () => doc.project;
  const tools = [
    ["pencil", "Pencil", "B", "✎"],
    ["eraser", "Eraser", "E", "▱"],
    ["fill", "Fill", "F", "◩"],
    ["picker", "Pick color", "I", "⌖"],
    ["select", "Select / move", "V", "▧"],
    ["pan", "Pan", "H", "✥"],
    ["line", "Line", "L", "╱"],
    ["rectangle", "Rectangle", "R", "□"],
    ["ellipse", "Ellipse", "O", "○"],
    ["wand", "Color select", "W", "✧"],
    ["dither", "Dither", "D", "▦"],
  ];
  function message(text) {
    $("#status").textContent = text;
  }
  function button(text, action, attrs = {}) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.onclick = action;
    for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
    return b;
  }
  function num(id) {
    return Number($(id).value);
  }
  function safe(fn) {
    return (...args) => {
      try {
        const result = fn(...args);
        if (result?.catch) result.catch(report);
      } catch (e) {
        report(e);
      }
    };
  }
  function report(error) {
    message(error.message || String(error));
    if ($("#home").hidden === false || $$("dialog[open]").length) {
      openOperation(
        "Something needs attention",
        () => {
          const p = document.createElement("p");
          p.textContent = error.message || String(error);
          $("#operation-content").append(p);
        },
        () => {},
        "Got it",
      );
    }
  }
  function showDialog(id) {
    finishStroke();
    $(id).showModal();
  }
  $$("[data-close]").forEach(
    (b) => (b.onclick = () => b.closest("dialog").close()),
  );
  $("#help").onclick = () => showDialog("#help-dialog");
  $("#theme").onclick = () => {
    const light = document.documentElement.dataset.theme !== "light";
    document.documentElement.dataset.theme = light ? "light" : "dark";
    $("#theme").textContent = light ? "Dark theme" : "Light theme";
    $("#theme").setAttribute(
      "aria-label",
      `Switch to ${light ? "dark" : "light"} theme`,
    );
    try {
      localStorage.setItem("sprite-forge-theme", light ? "light" : "dark");
    } catch {}
    renderOverlay();
  };
  try {
    if (localStorage.getItem("sprite-forge-theme") === "light")
      $("#theme").click();
  } catch {}

  // Saves are serialized. A conflict creates a new project instead of overwriting another tab.
  function saveLabel(text, failed = false) {
    $("#save-state").textContent = text;
    $("#save-state").classList.toggle("failed", failed);
  }
  function changed() {
    dirty = true;
    changeSerial++;
    saveLabel("Saving…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persist(), 450);
  }
  async function persist() {
    clearTimeout(saveTimer);
    if (saving) {
      await saving;
      if (dirty) return persist();
      return true;
    }
    if (!doc || !dirty) return true;
    const owner = doc,
      serial = changeSerial,
      snapshot = M.clone(doc.pending || P()),
      expected = revision;
    saving = (async () => {
      try {
        const result = await ProjectStore.save(snapshot, expected);
        if (doc === owner) {
          revision = result.revision;
          storageError = "";
          if (result.conflict) {
            owner.project.id = result.id;
            owner.project.name = result.name;
            for (const past of [
              ...owner.undoStack,
              ...owner.redoStack,
              ...(owner.pending ? [owner.pending] : []),
            ]) {
              past.id = result.id;
              past.name = result.name;
            }
            $("#project-name").value = result.name;
            message(
              "Another tab saved this project. Your work was kept as a recovered copy.",
            );
          }
          if (changeSerial === serial) {
            dirty = false;
            saveLabel("Saved on this device");
          } else saveLabel("Saving…");
        }
        return true;
      } catch (e) {
        if (doc === owner) {
          storageError = e.message || "Storage unavailable";
          saveLabel("Save failed · download a copy", true);
          message(
            "Device storage could not save. Your artwork is still open; use Save project file.",
          );
        }
        return false;
      }
    })();
    const result = await saving;
    saving = null;
    if (result && dirty) saveTimer = setTimeout(() => persist(), 100);
    return result;
  }
  window.addEventListener("beforeunload", (e) => {
    if (dirty || doc?.pending) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      finishStroke();
      persist();
    }
  });
  function remember() {
    if (doc)
      sessions.set(P().id, { doc, revision, dirty, fi, li, timeline, lesson });
  }
  async function switchProject(project, rev = 0, existing = false) {
    finishStroke();
    cancelSelection();
    await persist();
    remember();
    doc = new M.Document(project);
    revision = rev;
    dirty = false;
    fi = li = 0;
    playing = false;
    timeline = P().frames.length > 1;
    lesson = null;
    selection = null;
    cursor = null;
    clipboard = null;
    changeSerial = 0;
    $("#remove-reference").click();
    $("#lesson").hidden = true;
    $("#inspector").classList.remove("open");
    $("#onion-prev").checked = $("#onion-next").checked = false;
    $("#palette-lock").checked = false;
    $("#clip").value = "all";
    $("#home").hidden = true;
    $("#editor").hidden = false;
    document.body.classList.add("editing");
    for (const id of ["project-heading", "download-project", "export"])
      $("#" + id).hidden = false;
    $("#project-name").value = P().name;
    saveLabel(existing ? "Saved on this device" : "Saving…");
    chooseTool("pencil");
    setColor(P().palette[3] || P().palette[0] || "#b9ed83");
    refresh();
    requestAnimationFrame(fit);
    if (!existing) changed();
    message(`${P().width} × ${P().height} · Ready when you are.`);
  }
  async function goHome() {
    finishStroke();
    cancelSelection();
    await persist();
    remember();
    playing = false;
    $("#home").hidden = false;
    $("#editor").hidden = true;
    document.body.classList.remove("editing");
    for (const id of ["project-heading", "download-project", "export"])
      $("#" + id).hidden = true;
    await recent();
  }
  $("#home-button").onclick = safe(goHome);
  async function recent() {
    const target = $("#recent");
    target.replaceChildren();
    let records = [];
    try {
      records = await ProjectStore.list();
    } catch {
      storageError =
        "Device storage is unavailable. Save editable project files to keep your work.";
    }
    const seen = new Set();
    const add = (p, subtitle, action) => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      const b = button("", safe(action), { class: "recent-item" }),
        c = A.canvas(M.composite(p), p.width, p.height),
        text = document.createElement("span"),
        small = document.createElement("small");
      text.textContent = p.name;
      small.textContent = subtitle;
      text.append(small);
      b.append(c, text);
      target.append(b);
    };
    for (const s of [...sessions.values()].reverse()) {
      if (!s.dirty) continue;
      add(s.doc.project, "Unsaved · kept in this tab", async () => {
        await switchProject(s.doc.project, s.revision, true);
        doc = s.doc;
        revision = s.revision;
        fi = s.fi;
        li = s.li;
        timeline = s.timeline;
        lesson = s.lesson;
        dirty = true;
        refresh();
        renderLesson();
        changed();
      });
    }
    for (const r of records.slice(0, 12)) {
      try {
        const p = M.validate(r.project);
        add(
          p,
          `${p.width} × ${p.height} · ${new Date(r.updated).toLocaleDateString()}`,
          async () => {
            await switchProject(p, r.revision, true);
          },
        );
      } catch {
        if (r.previous) {
          const p = M.validate(r.previous);
          add(p, "Recover last good save", async () => {
            p.id = M.uid();
            p.name = (p.name + " recovered").slice(0, 120);
            await switchProject(p);
          });
        }
      }
    }
    if (!target.children.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent =
        storageError ||
        "Your next creation starts here. Projects appear after their first save.";
      target.append(p);
    }
  }
  $("#project-name").onchange = () => {
    const name = $("#project-name").value.trim() || "Untitled sprite";
    edit((p) => (p.name = name), "Project renamed.");
  };
  function edit(fn, text = "Change applied. Undo is available.") {
    finishStroke();
    cancelSelection();
    playing = false;
    try {
      doc.change(fn);
      fi = Math.min(fi, P().frames.length - 1);
      li = Math.min(li, P().layers.length - 1);
      refresh();
      changed();
      message(text);
    } catch (e) {
      fi = Math.min(fi, P().frames.length - 1);
      li = Math.min(li, P().layers.length - 1);
      refresh();
      message(e.message);
    }
  }
  function undo(redo = false) {
    finishStroke();
    cancelSelection();
    playing = false;
    if (!doc) return;
    redo ? doc.redo() : doc.undo();
    fi = Math.min(fi, P().frames.length - 1);
    li = Math.min(li, P().layers.length - 1);
    $("#project-name").value = P().name;
    refresh();
    changed();
    message(redo ? "Redone." : "Undone.");
  }
  $("#undo").onclick = () => undo();
  $("#redo").onclick = () => undo(true);

  // Render pixels once at native size; CSS integer scaling keeps the drawing crisp.
  function frameCanvas(index = fi, p = P()) {
    return A.canvas(M.composite(p, index), p.width, p.height);
  }
  function render() {
    if (!doc) return;
    const p = P();
    A.canvas(M.composite(p, fi), p.width, p.height, paint);
    paint.style.width = p.width * zoom + "px";
    paint.style.height = p.height * zoom + "px";
    $("#canvas-wrap").style.width = p.width * zoom + "px";
    $("#canvas-wrap").style.height = p.height * zoom + "px";
    renderOverlay();
    renderPreview();
  }
  function renderOverlay() {
    if (!doc || $("#editor").hidden) return;
    const p = P(),
      w = p.width * zoom,
      h = p.height * zoom;
    overlay.width = w;
    overlay.height = h;
    const c = overlay.getContext("2d");
    c.imageSmoothingEnabled = false;
    const opacity = num("#onion-opacity") / 100,
      range = clipFrames();
    const pos = range.indexOf(fi);
    for (const [enabled, offset, tint] of [
      [$("#onion-prev").checked, -1, "#ff9e9e"],
      [$("#onion-next").checked, 1, "#8fcdff"],
    ]) {
      if (enabled && range.length > 1 && pos >= 0) {
        const index = range[(pos + offset + range.length) % range.length],
          ghost = frameCanvas(index),
          g = ghost.getContext("2d");
        g.globalCompositeOperation = "source-in";
        g.fillStyle = tint;
        g.fillRect(0, 0, p.width, p.height);
        c.globalAlpha = opacity;
        c.drawImage(ghost, 0, 0, w, h);
        c.globalAlpha = 1;
      }
    }
    if ($("#grid").checked && zoom >= 6) {
      c.strokeStyle = getComputedStyle(
        document.documentElement,
      ).getPropertyValue("--line");
      c.globalAlpha = 0.65;
      c.lineWidth = 1;
      c.beginPath();
      for (let x = 0; x <= p.width; x++) {
        c.moveTo(x * zoom + 0.5, 0);
        c.lineTo(x * zoom + 0.5, h);
      }
      for (let y = 0; y <= p.height; y++) {
        c.moveTo(0, y * zoom + 0.5);
        c.lineTo(w, y * zoom + 0.5);
      }
      c.stroke();
      c.globalAlpha = 1;
    }
    const sym = $("#symmetry").value;
    c.strokeStyle = "#edca7f";
    c.lineWidth = 1;
    c.setLineDash([4, 4]);
    c.beginPath();
    if (sym === "horizontal" || sym === "both") {
      c.moveTo(w / 2, 0);
      c.lineTo(w / 2, h);
    }
    if (sym === "vertical" || sym === "both") {
      c.moveTo(0, h / 2);
      c.lineTo(w, h / 2);
    }
    if ($("#guides").checked) {
      c.moveTo(0, (p.origin.y + 0.5) * zoom);
      c.lineTo(w, (p.origin.y + 0.5) * zoom);
      c.moveTo((p.origin.x + 0.5) * zoom, 0);
      c.lineTo((p.origin.x + 0.5) * zoom, h);
    }
    c.stroke();
    c.setLineDash([]);
    if (selection) {
      c.strokeStyle = "#fff";
      c.lineWidth = 1;
      c.setLineDash([4, 3]);
      c.strokeRect(
        selection.x * zoom + 0.5,
        selection.y * zoom + 0.5,
        selection.w * zoom - 1,
        selection.h * zoom - 1,
      );
      c.setLineDash([]);
    }
    if (cursor && !["select", "pan", "wand"].includes(tool)) {
      c.strokeStyle = "#fff";
      c.lineWidth = 1;
      c.strokeRect(
        cursor.x * zoom + 0.5,
        cursor.y * zoom + 0.5,
        zoom *
          (["pencil", "eraser", "dither"].includes(tool) ? num("#brush") : 1) -
          1,
        zoom *
          (["pencil", "eraser", "dither"].includes(tool) ? num("#brush") : 1) -
          1,
      );
    }
  }
  function renderPreview() {
    if (!doc) return;
    const p = P(),
      source = frameCanvas(playing ? playIndex : fi),
      target = $("#preview"),
      tile = $("#preview-mode").value === "tile",
      native = $("#preview-mode").value === "native";
    target.width = p.width * (tile ? 3 : 1);
    target.height = p.height * (tile ? 3 : 1);
    const c = target.getContext("2d");
    for (let y = 0; y < (tile ? 3 : 1); y++)
      for (let x = 0; x < (tile ? 3 : 1); x++)
        c.drawImage(source, x * p.width, y * p.height);
    const scale = native
      ? 1
      : Math.max(
          1,
          Math.floor(Math.min(190 / target.width, 110 / target.height)),
        );
    target.style.width = target.width * scale + "px";
    target.style.height = target.height * scale + "px";
    target.style.filter = $("#grayscale").checked ? "grayscale(1)" : "";
    const bg = $("#preview-bg").value,
      stage = $("#preview-stage");
    stage.classList.toggle("checker", bg === "checker");
    stage.style.backgroundColor =
      bg === "light" ? "#f7f5ec" : bg === "dark" ? "#161c20" : "";
  }
  function refresh() {
    if (!doc) return;
    const focused = document.activeElement,
      focusLabel = focused?.closest("#layers,#frames,#palette")
        ? focused.getAttribute("aria-label")
        : null;
    const p = P();
    fi = Math.min(fi, p.frames.length - 1);
    li = Math.min(li, p.layers.length - 1);
    if (cursor) cursor = bounded(cursor);
    $("#canvas-spec").textContent =
      `${p.width} × ${p.height} PX  /  FRAME ${fi + 1}`;
    $("#scope").textContent = `Frame ${fi + 1} · ${p.layers[li].name}`;
    $("#document-stats").textContent =
      `${p.frames.length} frame${p.frames.length === 1 ? "" : "s"} · ${p.layers.length} layer${p.layers.length === 1 ? "" : "s"} · RGBA`;
    $("#undo").disabled = !doc.undoStack.length;
    $("#redo").disabled = !doc.redoStack.length;
    $("#generator-variant").hidden = !p.recipe;
    $("#timeline").hidden = !timeline;
    $("#animate").textContent = timeline ? "Hide timeline" : "Animate";
    $("#duration").value = p.frames[fi].duration;
    renderPalette();
    renderLayers();
    renderFrames();
    render();
    selectionUI();
    if (focusLabel)
      $$("#layers button,#frames button,#palette button")
        .find((b) => b.getAttribute("aria-label") === focusLabel)
        ?.focus({ preventScroll: true });
  }
  function fit() {
    if (!doc || $("#editor").hidden) return;
    zoom = Math.max(
      1,
      Math.min(
        32,
        Math.floor(
          Math.min(
            (viewport.clientWidth - 64) / P().width,
            (viewport.clientHeight - 56) / P().height,
          ),
        ),
      ),
    );
    applyZoom();
  }
  function applyZoom() {
    zoom = Math.max(1, Math.min(32, zoom));
    $("#zoom-label").textContent = zoom * 100 + "%";
    render();
  }
  $("#fit").onclick = fit;
  $("#zoom-in").onclick = () => {
    zoom++;
    applyZoom();
  };
  $("#zoom-out").onclick = () => {
    zoom--;
    applyZoom();
  };
  viewport.addEventListener(
    "wheel",
    (e) => {
      if (!doc) return;
      e.preventDefault();
      zoom += e.deltaY < 0 ? 1 : -1;
      applyZoom();
    },
    { passive: false },
  );
  $("#grid").onchange = renderOverlay;
  $("#guides").onchange = renderOverlay;
  $("#symmetry").onchange = renderOverlay;
  $("#brush").onchange = renderOverlay;
  ["preview-bg", "preview-mode", "grayscale"].forEach(
    (id) => ($("#" + id).onchange = renderPreview),
  );
  $("#inspector-toggle").onclick = () => {
    $("#inspector").classList.toggle("open");
    $("#inspector-toggle").setAttribute(
      "aria-expanded",
      String($("#inspector").classList.contains("open")),
    );
  };
  for (const [i, [name, label, key, symbol]] of tools.entries()) {
    const b = button("", () => chooseTool(name), {
      "data-tool": name,
      "aria-pressed": "false",
      title: `${label} (${key})`,
      "aria-label": `${label} (${key})`,
    });
    const s = document.createElement("span");
    s.className = "tool-symbol";
    s.textContent = symbol;
    s.setAttribute("aria-hidden", "true");
    b.append(s, label);
    $(i < 6 ? "#main-tools" : "#extra-tools").append(b);
  }
  function chooseTool(name) {
    finishStroke();
    if (name !== "select" && name !== "wand") cancelSelection();
    tool = name;
    $$("[data-tool]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.tool === tool)),
    );
    $("#tool-name").textContent = tools.find((t) => t[0] === tool)[1];
    $("#brush-option").hidden = ![
      "pencil",
      "eraser",
      "line",
      "dither",
    ].includes(tool);
    $("#solid-option").hidden = !["rectangle", "ellipse"].includes(tool);
    $("#perfect-option").hidden = tool !== "pencil";
    $("#symmetry-option").hidden = [
      "select",
      "pan",
      "wand",
      "picker",
      "fill",
    ].includes(tool);
    paint.style.cursor = tool === "pan" ? "grab" : "crosshair";
    if (tools.findIndex((t) => t[0] === name) >= 6)
      $("#more-tools").open = true;
    renderOverlay();
  }
  function setColor(value) {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    value = value.toLowerCase();
    if (doc && $("#palette-lock").checked && !P().palette.includes(value)) {
      message(
        "Palette constraint is on. Pick a swatch or turn it off in Color tools.",
      );
      $("#paint-color").value = color;
      $("#hex-color").value = color;
      return;
    }
    color = value;
    $("#paint-color").value = value;
    $("#hex-color").value = value;
    renderPalette();
  }
  function renderPalette() {
    if (!doc) return;
    const focusLabel = document.activeElement?.closest("#palette")
      ? document.activeElement.getAttribute("aria-label")
      : null;
    $("#color-count").textContent =
      P().palette.length + (P().palette.length === 1 ? " color" : " colors");
    $("#palette").replaceChildren(
      ...P().palette.map((c) => {
        const b = button(
          "",
          () => {
            setColor(c);
            if (tool === "eraser" || tool === "picker") chooseTool("pencil");
          },
          { "aria-label": `Paint with ${c}`, title: c },
        );
        b.style.background = c;
        b.classList.toggle("selected", c === color);
        return b;
      }),
    );
    $("#color-ramp").replaceChildren(
      ...[
        [-35, "Shadow"],
        [0, "Base"],
        [35, "Highlight"],
      ].map(([n, label]) => {
        const c = SpriteGenerator.shade(color, n),
          b = button("", () => setColor(c), { "aria-label": `${label} ${c}` });
        const swatch = document.createElement("span");
        swatch.style.background = c;
        b.append(swatch, label);
        return b;
      }),
    );
    if (focusLabel)
      $$("#palette button")
        .find((b) => b.getAttribute("aria-label") === focusLabel)
        ?.focus({ preventScroll: true });
  }
  $("#paint-color").oninput = (e) => setColor(e.target.value);
  $("#hex-color").onchange = (e) => {
    if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setColor(e.target.value);
    else {
      e.target.value = color;
      message("Use a six-digit hex color, such as #b9ed83.");
    }
  };
  $("#add-color").onclick = () => {
    if (!P().palette.includes(color))
      edit((p) => {
        if (p.palette.length >= 256)
          throw Error("Palette is full (256 colors).");
        p.palette.push(color);
      }, "Color kept in your palette.");
  };
  $("#transparent").onclick = () => chooseTool("eraser");
  $("#palette-preset").onchange = (e) => {
    const colors = M.PALETTES[e.target.value];
    if (colors)
      edit(
        (p) =>
          (p.palette = [...new Set([...p.palette, ...colors])].slice(0, 256)),
        "Palette added. Existing artwork is unchanged.",
      );
    e.target.value = "";
  };
  $("#extract-colors").onclick = () =>
    edit(
      (p) =>
        (p.palette = [...new Set([...p.palette, ...M.extract(p)])].slice(
          0,
          256,
        )),
      "Artwork colors added to your palette.",
    );
  function writable() {
    if (P().layers[li].locked) {
      message("This layer is locked. Unlock it before drawing.");
      return false;
    }
    if (!P().layers[li].visible) {
      message("This layer is hidden. Show it before drawing.");
      return false;
    }
    return true;
  }
  function locate(e) {
    const r = paint.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) / zoom),
      y: Math.floor((e.clientY - r.top) / zoom),
    };
  }
  function bounded(p) {
    return {
      x: Math.max(0, Math.min(P().width - 1, p.x)),
      y: Math.max(0, Math.min(P().height - 1, p.y)),
    };
  }
  function ink() {
    return tool === "eraser" ? 0 : M.rgba(color);
  }
  function pick(p) {
    const n = M.composite(P(), fi)[p.y * P().width + p.x];
    if (n & 255) {
      setColor(M.hex(n));
      chooseTool("pencil");
      message("Color picked.");
    } else {
      chooseTool("eraser");
      message("Transparent pixel picked. Eraser selected.");
    }
  }
  function stamp(p) {
    M.put(
      P(),
      fi,
      li,
      p.x,
      p.y,
      ink(),
      num("#brush"),
      $("#symmetry").value,
      tool === "dither",
    );
  }
  function drawingStart(e) {
    if (!doc || stroke || gesture || e.button > 1) return;
    e.preventDefault();
    paint.focus({ preventScroll: true });
    playing = false;
    const p = bounded(locate(e));
    cursor = p;
    if (tool === "pan" || e.button === 1) {
      stroke = {
        kind: "pan",
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        sx: viewport.scrollLeft,
        sy: viewport.scrollTop,
      };
      paint.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === "picker") {
      pick(p);
      return;
    }
    if (!writable()) return;
    if (tool === "select" || tool === "wand") {
      if (
        selection &&
        p.x >= selection.x &&
        p.x < selection.x + selection.w &&
        p.y >= selection.y &&
        p.y < selection.y + selection.h
      ) {
        beginSelectionMove();
        stroke = {
          kind: "move",
          id: e.pointerId,
          start: p,
          baseX: selection.x,
          baseY: selection.y,
        };
      } else {
        cancelSelection();
        if (tool === "wand") {
          const points = M.region(P(), fi, li, p.x, p.y);
          const xs = points.map((i) => i % P().width),
            ys = points.map((i) => Math.floor(i / P().width));
          const x = Math.min(...xs),
            y = Math.min(...ys);
          selection = {
            x,
            y,
            w: Math.max(...xs) - x + 1,
            h: Math.max(...ys) - y + 1,
            mask: new Set(points),
          };
          selectionUI();
          renderOverlay();
          return;
        }
        selection = { x: p.x, y: p.y, w: 1, h: 1 };
        stroke = { kind: "select", id: e.pointerId, start: p };
      }
    } else {
      cancelSelection();
      doc.begin();
      if (
        !P().palette.includes(color) &&
        tool !== "eraser" &&
        P().palette.length < 256
      )
        P().palette.push(color);
      if (tool === "fill") {
        M.fill(P(), fi, li, p.x, p.y, ink());
        doc.commit();
        changed();
        refresh();
        return;
      }
      const shape = ["line", "rectangle", "ellipse"].includes(tool);
      stroke = {
        kind: shape ? "shape" : "draw",
        id: e.pointerId,
        start: p,
        last: p,
        previous: null,
        base: P().frames[fi].cels[li].slice(),
      };
      if (shape)
        M.shape(
          P(),
          fi,
          li,
          tool,
          p,
          p,
          ink(),
          $("#solid").checked,
          num("#brush"),
          $("#symmetry").value,
        );
      else stamp(p);
    }
    paint.setPointerCapture(e.pointerId);
    render();
    selectionUI();
  }
  paint.onpointerdown = drawingStart;
  paint.onpointermove = (e) => {
    if (!doc) return;
    const raw = locate(e),
      p = bounded(raw);
    cursor =
      raw.x >= 0 && raw.x < P().width && raw.y >= 0 && raw.y < P().height
        ? p
        : null;
    $("#coordinates").textContent = cursor
      ? `X ${p.x}  Y ${p.y}`
      : "Outside canvas";
    if (!stroke) {
      renderOverlay();
      return;
    }
    if (e.pointerId !== stroke.id) return;
    if (stroke.kind === "pan") {
      viewport.scrollLeft = stroke.sx - (e.clientX - stroke.x);
      viewport.scrollTop = stroke.sy - (e.clientY - stroke.y);
      return;
    }
    if (stroke.kind === "select") {
      selection = {
        x: Math.min(stroke.start.x, p.x),
        y: Math.min(stroke.start.y, p.y),
        w: Math.abs(p.x - stroke.start.x) + 1,
        h: Math.abs(p.y - stroke.start.y) + 1,
      };
      selectionUI();
      renderOverlay();
      return;
    }
    if (stroke.kind === "move") {
      selection.x = stroke.baseX + p.x - stroke.start.x;
      selection.y = stroke.baseY + p.y - stroke.start.y;
      previewSelection();
      return;
    }
    if (stroke.kind === "shape") {
      P().frames[fi].cels[li] = stroke.base.slice();
      M.shape(
        P(),
        fi,
        li,
        tool,
        stroke.start,
        p,
        ink(),
        $("#solid").checked,
        num("#brush"),
        $("#symmetry").value,
      );
    } else {
      let corner = -1;
      if (
        tool === "pencil" &&
        $("#pixel-perfect").checked &&
        num("#brush") === 1 &&
        $("#symmetry").value === "none" &&
        stroke.previous
      ) {
        const a = stroke.previous,
          b = stroke.last;
        if (
          Math.abs(a.x - p.x) === 1 &&
          Math.abs(a.y - p.y) === 1 &&
          (a.x === b.x || a.y === b.y) &&
          (b.x === p.x || b.y === p.y)
        )
          corner = b.y * P().width + b.x;
      }
      M.line(
        P(),
        fi,
        li,
        stroke.last.x,
        stroke.last.y,
        p.x,
        p.y,
        ink(),
        num("#brush"),
        $("#symmetry").value,
        tool === "dither",
      );
      if (corner >= 0) P().frames[fi].cels[li][corner] = stroke.base[corner];
      if (p.x !== stroke.last.x || p.y !== stroke.last.y) {
        stroke.previous = stroke.last;
        stroke.last = p;
      }
    }
    render();
  };
  function finishStroke(cancel = false) {
    if (!stroke) return;
    const s = stroke;
    stroke = null;
    if (paint.hasPointerCapture(s.id)) paint.releasePointerCapture(s.id);
    if (s.kind === "draw" || s.kind === "shape") {
      cancel ? doc.cancel() : doc.commit();
      if (!cancel) changed();
      refresh();
    }
    if (s.kind === "move" && cancel) cancelSelection();
  }
  paint.onpointerup = () => finishStroke();
  paint.onpointercancel = () => finishStroke(true);
  paint.onlostpointercapture = () => {
    if (stroke) finishStroke(true);
  };
  paint.onpointerleave = () => {
    if (!stroke) {
      cursor = null;
      renderOverlay();
    }
  };
  paint.onfocus = () => {
    if (doc) {
      cursor = cursor || {
        x: Math.floor(P().width / 2),
        y: Math.floor(P().height / 2),
      };
      renderOverlay();
    }
  };
  function selectionUI() {
    const visible = !!selection || !!clipboard;
    $("#selection-bar").hidden = !visible;
    $("#selection-label").textContent = selection
      ? `${selection.w} × ${selection.h} selection`
      : "Clipboard ready";
    for (const id of ["selection-copy", "selection-cut", "selection-clear"])
      $("#" + id).disabled = !selection;
    $("#selection-paste").disabled = !clipboard;
    $("#selection-apply").disabled = !selection?.moving;
    $("#selection-cancel").disabled = !selection;
  }
  function selectionData() {
    if (!selection) return null;
    const s = selection,
      data = new Uint32Array(s.w * s.h),
      mask = new Uint8Array(data.length),
      source = selection.moving ? selection.data : P().frames[fi].cels[li];
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const index = (s.y + y) * P().width + s.x + x,
          k = y * s.w + x;
        if (selection.moving) {
          data[k] = source[k];
          mask[k] = selection.localMask[k];
        } else if (
          s.x + x >= 0 &&
          s.x + x < P().width &&
          s.y + y >= 0 &&
          s.y + y < P().height &&
          (!s.mask || s.mask.has(index))
        ) {
          data[k] = source[index];
          mask[k] = 1;
        }
      }
    return { data, mask, w: s.w, h: s.h };
  }
  function beginSelectionMove() {
    if (selection.moving) return;
    const data = selectionData();
    doc.begin();
    selection = {
      ...selection,
      moving: true,
      data: data.data,
      localMask: data.mask,
      base: P().frames[fi].cels[li].slice(),
    };
    for (let y = 0; y < selection.h; y++)
      for (let x = 0; x < selection.w; x++)
        if (data.mask[y * selection.w + x])
          selection.base[(selection.y + y) * P().width + selection.x + x] = 0;
  }
  function previewSelection() {
    const s = selection;
    P().frames[fi].cels[li] = s.base.slice();
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const a = s.x + x,
          b = s.y + y,
          k = y * s.w + x;
        if (
          a >= 0 &&
          a < P().width &&
          b >= 0 &&
          b < P().height &&
          s.localMask[k]
        )
          P().frames[fi].cels[li][b * P().width + a] = s.data[k];
      }
    render();
    selectionUI();
  }
  function cancelSelection() {
    if (selection?.moving) doc.cancel();
    selection = null;
    if (doc) {
      render();
      selectionUI();
    }
  }
  function applySelection() {
    if (selection?.moving) {
      doc.commit();
      selection.moving = false;
      delete selection.data;
      delete selection.base;
      delete selection.mask;
      changed();
      refresh();
      message("Selection moved.");
    }
  }
  $("#selection-copy").onclick = () => {
    clipboard = selectionData();
    selectionUI();
    message("Selection copied.");
  };
  $("#selection-cut").onclick = () => {
    if (!writable() || !selection) return;
    clipboard = selectionData();
    if (!selection.moving) beginSelectionMove();
    P().frames[fi].cels[li] = selection.base.slice();
    doc.commit();
    selection = null;
    changed();
    refresh();
    message("Selection cut. Paste or undo to restore it.");
  };
  $("#selection-paste").onclick = () => {
    if (!clipboard || !writable()) return;
    cancelSelection();
    chooseTool("select");
    doc.begin();
    selection = {
      x: 0,
      y: 0,
      w: clipboard.w,
      h: clipboard.h,
      data: clipboard.data.slice(),
      localMask: clipboard.mask.slice(),
      moving: true,
      base: P().frames[fi].cels[li].slice(),
    };
    previewSelection();
    message("Drag the selection, then Apply move. Escape cancels.");
  };
  $("#selection-apply").onclick = applySelection;
  $("#selection-cancel").onclick = cancelSelection;
  $("#selection-clear").onclick = () => {
    applySelection();
    cancelSelection();
  };
  document.addEventListener("keydown", (e) => {
    if (
      !doc ||
      $("#editor").hidden ||
      $$("dialog[open]").length ||
      e.target.matches("input,select,textarea") ||
      e.target.isContentEditable
    )
      return;
    const key = e.key.toLowerCase(),
      mod = e.ctrlKey || e.metaKey;
    if (mod && key === "s") {
      e.preventDefault();
      downloadProject();
      return;
    }
    if (mod && key === "z") {
      e.preventDefault();
      undo(e.shiftKey);
      return;
    }
    if (mod && key === "y") {
      e.preventDefault();
      undo(true);
      return;
    }
    if (mod && ["c", "x", "v"].includes(key)) {
      e.preventDefault();
      $("#selection-" + { c: "copy", x: "cut", v: "paste" }[key]).click();
      return;
    }
    if (mod || e.altKey) return;
    if (key === "escape") {
      finishStroke(true);
      cancelSelection();
      return;
    }
    if (key === "enter" && selection?.moving) {
      applySelection();
      return;
    }
    const t = tools.find((t) => t[2].toLowerCase() === key);
    if (t) {
      chooseTool(t[0]);
      return;
    }
    if (["+", "=", "-"].includes(key)) {
      e.preventDefault();
      zoom += key === "-" ? -1 : 1;
      applyZoom();
      return;
    }
    if (e.target !== paint) return;
    const delta = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[e.key];
    if (delta) {
      e.preventDefault();
      if (selection) {
        if (!writable()) return;
        beginSelectionMove();
        selection.x += delta[0];
        selection.y += delta[1];
        previewSelection();
      } else {
        cursor = bounded({
          x: (cursor?.x || 0) + delta[0],
          y: (cursor?.y || 0) + delta[1],
        });
        renderOverlay();
      }
    } else if (e.key === " ") {
      e.preventDefault();
      cursor = cursor || { x: 0, y: 0 };
      if (tool === "picker") {
        pick(cursor);
        return;
      }
      if (!writable() || ["select", "pan", "wand"].includes(tool)) return;
      doc.change(() => {
        if (tool === "fill") M.fill(P(), fi, li, cursor.x, cursor.y, ink());
        else stamp(cursor);
      });
      changed();
      refresh();
    }
  });

  function renderLayers() {
    const p = P();
    $("#layers").replaceChildren(
      ...p.layers.map((l, i) => {
        const row = document.createElement("div");
        row.className = "layer-row" + (i === li ? " selected" : "");
        const select = button(
          "",
          () => {
            finishStroke();
            cancelSelection();
            li = i;
            refresh();
          },
          {
            class: "layer-select",
            "aria-label": `Select layer ${l.name}`,
            "aria-pressed": String(i === li),
          },
        );
        select.append(
          A.canvas(p.frames[fi].cels[i], p.width, p.height),
          l.name,
        );
        row.append(
          button(
            l.visible ? "◉" : "○",
            () => edit((p) => (p.layers[i].visible = !p.layers[i].visible)),
            { "aria-label": `${l.visible ? "Hide" : "Show"} layer ${l.name}` },
          ),
          select,
          button(
            l.locked ? "▣" : "▫",
            () => edit((p) => (p.layers[i].locked = !p.layers[i].locked)),
            { "aria-label": `${l.locked ? "Unlock" : "Lock"} layer ${l.name}` },
          ),
        );
        return row;
      }),
    );
    $("#layer-opacity").value = p.layers[li].opacity * 100;
    $("#opacity-value").value = Math.round(p.layers[li].opacity * 100) + "%";
    $("#alpha-lock").checked = p.layers[li].alphaLock;
    $("#merge-layer").disabled = li === 0;
    $("#delete-layer").disabled = p.layers.length === 1;
  }
  $("#add-layer").onclick = () =>
    edit(
      (p) => (li = M.addLayer(p, li)),
      "New layer added. Draw here without changing the layer below.",
    );
  $("#duplicate-layer").onclick = () =>
    edit((p) => (li = M.addLayer(p, li, true)));
  $("#delete-layer").onclick = () => edit((p) => M.removeLayer(p, li));
  $("#merge-layer").onclick = () =>
    edit((p) => {
      M.mergeLayer(p, li);
      li--;
    });
  function moveLayer(direction) {
    edit((p) => {
      const to = li + direction;
      if (to < 0 || to >= p.layers.length) return;
      [p.layers[li], p.layers[to]] = [p.layers[to], p.layers[li]];
      for (const f of p.frames)
        [f.cels[li], f.cels[to]] = [f.cels[to], f.cels[li]];
      li = to;
    });
  }
  $("#layer-up").onclick = () => moveLayer(1);
  $("#layer-down").onclick = () => moveLayer(-1);
  $("#layer-opacity").onchange = (e) =>
    edit((p) => (p.layers[li].opacity = Number(e.target.value) / 100));
  $("#alpha-lock").onchange = (e) =>
    edit((p) => (p.layers[li].alphaLock = e.target.checked));
  $("#rename-layer").onclick = () =>
    textOperation(
      "Rename layer",
      "Layer name",
      P().layers[li].name,
      80,
      (name) => edit((p) => (p.layers[li].name = name)),
    );

  function clipFrames(value = $("#clip").value) {
    const p = P();
    if (value === "all" || !p.clips[Number(value)])
      return p.frames.map((_, i) => i);
    const ids = new Set(p.clips[Number(value)].frames);
    return p.frames
      .map((f, i) => (ids.has(f.id) ? i : -1))
      .filter((i) => i >= 0);
  }
  function renderFrames() {
    const old = $("#clip").value;
    $("#clip").replaceChildren(
      new Option("All frames", "all"),
      ...P().clips.map((c, i) => new Option(c.name, String(i))),
    );
    $("#clip").value = [...$("#clip").options].some((o) => o.value === old)
      ? old
      : "all";
    $("#frames").replaceChildren(
      ...clipFrames().map((i) => {
        const b = button(
          "",
          () => {
            finishStroke();
            cancelSelection();
            playing = false;
            fi = i;
            refresh();
          },
          { "aria-label": `Frame ${i + 1}`, "aria-pressed": String(i === fi) },
        );
        b.append(frameCanvas(i), `${i + 1}`);
        return b;
      }),
    );
    $("#play").textContent = playing ? "Ⅱ Pause" : "▶ Play";
    $("#play").setAttribute("aria-pressed", String(playing));
    $("#delete-frame").disabled = P().frames.length === 1;
  }
  $("#animate").onclick = () => {
    timeline = !timeline;
    $("#timeline").hidden = !timeline;
    refresh();
    requestAnimationFrame(fit);
  };
  $("#duplicate-frame").onclick = () =>
    edit(
      (p) => (fi = M.addFrame(p, fi, true)),
      "Frame duplicated. Edit this pose; the original stays intact.",
    );
  $("#blank-frame").onclick = () =>
    edit((p) => (fi = M.addFrame(p, fi, false)));
  $("#delete-frame").onclick = () => edit((p) => M.removeFrame(p, fi));
  function moveFrame(delta) {
    edit((p) => {
      const to = fi + delta;
      if (to < 0 || to >= p.frames.length) return;
      [p.frames[fi], p.frames[to]] = [p.frames[to], p.frames[fi]];
      fi = to;
      for (const c of p.clips)
        c.frames = p.frames
          .filter((f) => c.frames.includes(f.id))
          .map((f) => f.id);
    });
  }
  $("#frame-left").onclick = () => moveFrame(-1);
  $("#frame-right").onclick = () => moveFrame(1);
  $("#duration").onchange = (e) => {
    const value = Number(e.target.value);
    if (!Number.isInteger(value) || value < 20 || value > 10000) {
      message("Frame duration must be 20–10,000 ms.");
      refresh();
      return;
    }
    edit((p) => (p.frames[fi].duration = value));
  };
  $("#clip").onchange = () => {
    finishStroke();
    cancelSelection();
    playing = false;
    fi = clipFrames()[0];
    refresh();
  };
  $("#play").onclick = () => {
    finishStroke();
    playing = !playing;
    playIndex = clipFrames()[0];
    lastTick = performance.now();
    renderFrames();
    renderPreview();
  };
  for (const id of ["onion-prev", "onion-next", "onion-opacity"])
    $("#" + id).oninput = renderOverlay;
  $("#add-clip").onclick = () =>
    openOperation(
      "Name an animation clip",
      () => {
        $("#operation-content").innerHTML =
          '<div class="stack"><label>Clip name<input id="clip-name" maxlength="80" value="Idle"></label><div class="row"><label>First frame<input id="clip-start" type="number" min="1" value="1"></label><label>Last frame<input id="clip-end" type="number" min="1"></label></div><p class="muted">Clips name a range of frames without copying the artwork.</p></div>';
        $("#clip-end").value = P().frames.length;
      },
      () => {
        const start = num("#clip-start") - 1,
          end = num("#clip-end"),
          name = $("#clip-name").value.trim();
        if (
          !name ||
          !Number.isInteger(start) ||
          !Number.isInteger(end) ||
          start < 0 ||
          end > P().frames.length ||
          start >= end
        )
          throw Error("Choose a name and a valid frame range.");
        edit((p) =>
          p.clips.push({
            name,
            frames: p.frames.slice(start, end).map((f) => f.id),
          }),
        );
      },
    );
  function tick(now) {
    if (doc && playing && !$("#editor").hidden) {
      const range = clipFrames();
      if (now - lastTick >= P().frames[playIndex].duration) {
        playIndex = range[(range.indexOf(playIndex) + 1) % range.length];
        lastTick = now;
        renderPreview();
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Project creation and the generator share the same editor.
  const presets = [
    [16, 16, "Tiny icon", "A few pixels go a long way"],
    [32, 32, "Sprite or prop", "A friendly place to start"],
    [48, 48, "Game character", "Room for a little detail"],
    [64, 64, "Portrait", "More room, more drawing"],
    [32, 48, "Tall character", "A rectangular canvas"],
    [128, 128, "Detailed artwork", "Take your time with this one"],
  ];
  presets.forEach(([w, h, label, hint]) => {
    const b = button(
      "",
      () => {
        $("#new-width").value = w;
        $("#new-height").value = h;
        $$("#size-presets button").forEach((b) =>
          b.classList.remove("selected"),
        );
        b.classList.add("selected");
      },
      { title: hint },
    );
    const strong = document.createElement("strong"),
      small = document.createElement("small");
    strong.textContent = `${w} × ${h}`;
    small.textContent = label;
    b.append(strong, small);
    b.classList.toggle("selected", w === 32 && h === 32);
    $("#size-presets").append(b);
  });
  $("#new-sprite").onclick = () => showDialog("#new-dialog");
  $("#new-form").onsubmit = safe(async (e) => {
    e.preventDefault();
    const p = M.blank(
      num("#new-width"),
      num("#new-height"),
      $("#new-name").value.trim() || "Untitled sprite",
    );
    $("#new-dialog").close();
    await switchProject(p);
  });
  ["new-width", "new-height"].forEach(
    (id) =>
      ($("#" + id).oninput = () =>
        $$("#size-presets button").forEach((b, i) =>
          b.classList.toggle(
            "selected",
            presets[i][0] === num("#new-width") &&
              presets[i][1] === num("#new-height"),
          ),
        )),
  );
  function recipe() {
    const form = $("#controls");
    return Object.fromEntries(
      Object.keys(SpriteGenerator.defaults).map((k) => [
        k,
        form.elements[k].type === "checkbox"
          ? form.elements[k].checked
          : form.elements[k].value,
      ]),
    );
  }
  function setRecipe(s) {
    const form = $("#controls");
    for (const k of Object.keys(SpriteGenerator.defaults)) {
      if (form.elements[k].type === "checkbox") form.elements[k].checked = s[k];
      else form.elements[k].value = s[k];
    }
    renderGenerator();
  }
  function renderGenerator() {
    const c = $("#generator-preview").getContext("2d");
    c.clearRect(0, 0, 48, 48);
    SpriteGenerator.draw(c, recipe(), 0, 0);
  }
  $("#controls").oninput = renderGenerator;
  function openGenerator() {
    setRecipe(doc?.project.recipe || SpriteGenerator.defaults);
    showDialog("#generator-dialog");
  }
  $("#new-character").onclick = openGenerator;
  $("#generator-variant").onclick = openGenerator;
  $("#random-character").onclick = () => {
    const s = recipe(),
      form = $("#controls");
    for (const k of ["build", "hair", "outfit", "hat", "weapon"]) {
      if ($("#lock-look").checked && ["build", "hair"].includes(k)) continue;
      const options = [...form.elements[k].options];
      s[k] = options[Math.floor(Math.random() * options.length)].value;
    }
    s.cape = Math.random() > 0.5;
    if (!$("#lock-colors").checked) {
      const pal = Object.values(M.PALETTES)[Math.floor(Math.random() * 4)];
      s.cloth = pal[2];
      s.trim = pal[4];
      s.capeColor = pal[6];
      s.skin = ["#efc49b", "#dca477", "#aa704d", "#754d3e"][
        Math.floor(Math.random() * 4)
      ];
      s.hairColor = ["#543a34", "#b1864d", "#d5ccaa", "#292a37", "#88463b"][
        Math.floor(Math.random() * 5)
      ];
    }
    setRecipe(s);
  };
  $("#character-preset").onchange = (e) => {
    const s = { ...SpriteGenerator.defaults };
    if (e.target.value === "knight")
      Object.assign(s, {
        outfit: "armor",
        hat: "helmet",
        weapon: "sword",
        cape: true,
      });
    if (e.target.value === "mage")
      Object.assign(s, {
        outfit: "robe",
        hat: "wizard",
        weapon: "staff",
        cloth: "#786199",
      });
    setRecipe(s);
  };
  function generate(s, layered = false) {
    const c = document.createElement("canvas");
    c.width = c.height = 48;
    const ctx = c.getContext("2d");
    return Array.from({ length: 16 }, (_, i) => ({
      id: M.uid(),
      duration: 167,
      cels: (layered ? SpriteGenerator.parts : [null]).map((part) => {
        ctx.clearRect(0, 0, 48, 48);
        SpriteGenerator.draw(ctx, s, Math.floor(i / 4), i % 4, 0, 0, part);
        return A.pixels(c);
      }),
    }));
  }
  $("#create-character").onclick = safe(async () => {
    const p = M.blank(48, 48, "My adventurer");
    p.recipe = recipe();
    p.frames = generate(p.recipe, true);
    p.layers = SpriteGenerator.parts.map((name) => ({
      id: M.uid(),
      name,
      visible: true,
      locked: false,
      alphaLock: false,
      opacity: 1,
    }));
    p.clips = ["Down", "Left", "Up", "Right"].map((name, i) => ({
      name: `Walk ${name}`,
      frames: p.frames.slice(i * 4, i * 4 + 4).map((f) => f.id),
    }));
    p.palette = M.extract(p);
    $("#generator-dialog").close();
    await switchProject(p);
    li = 2;
    $("#clip").value = "0";
    refresh();
  });
  for (const [key, s] of Object.entries(A.samples)) {
    const b = button("", () => openExample(key), { class: "example-card" }),
      art = document.createElement("div"),
      info = document.createElement("div"),
      title = document.createElement("strong"),
      caption = document.createElement("small"),
      p = A.project(key);
    art.className = "example-art";
    art.append(frameCanvas(0, p));
    info.className = "example-info";
    title.textContent = s.name;
    caption.textContent = s.caption;
    info.append(title, caption);
    b.append(art, info);
    $("#examples").append(b);
  }
  function openExample(key) {
    const s = A.samples[key];
    openOperation(
      s.name,
      () => {
        const p = A.project(key),
          preview = document.createElement("div");
        preview.className = "operation-preview checker";
        const c = frameCanvas(0, p);
        c.style.width = "128px";
        preview.append(c);
        $("#operation-content").append(preview);
        const row = document.createElement("div");
        row.className = "row";
        if (s.kind === "lesson")
          row.append(
            button(
              "Start guided lesson",
              safe(async () => {
                $("#operation-dialog").close();
                await switchProject(A.project(key, true));
                lesson = { key, step: 0 };
                renderLesson();
              }),
            ),
          );
        row.append(
          button(
            "Open editable example",
            safe(async () => {
              $("#operation-dialog").close();
              await switchProject(p);
              if (key === "tile") {
                $("#preview-mode").value = "tile";
                renderPreview();
              }
            }),
          ),
        );
        $("#operation-content").append(row);
      },
      () => {},
      "Close",
    );
  }
  function renderLesson() {
    if (!lesson) {
      $("#lesson").hidden = true;
      return;
    }
    const steps = A.lessons[lesson.key],
      step = steps[lesson.step];
    $("#lesson").hidden = false;
    $("#lesson-label").textContent =
      `${A.samples[lesson.key].name} · ${lesson.step + 1} / ${steps.length}`;
    $("#lesson-title").textContent = step[0];
    $("#lesson-text").textContent = step[1];
    $("#lesson-back").disabled = lesson.step === 0;
    $("#lesson-next").textContent =
      lesson.step === steps.length - 1 ? "Finish lesson" : "Next step";
    chooseTool(step[2]);
  }
  $("#lesson-next").onclick = () => {
    if (lesson.step === A.lessons[lesson.key].length - 1) {
      lesson = null;
      renderLesson();
      message("Lesson complete. Your artwork is yours to keep.");
    } else {
      lesson.step++;
      renderLesson();
    }
  };
  $("#lesson-back").onclick = () => {
    lesson.step = Math.max(0, lesson.step - 1);
    renderLesson();
  };
  $("#lesson-close").onclick = () => {
    lesson = null;
    renderLesson();
  };
  const hero = $("#hero-canvas").getContext("2d");
  hero.imageSmoothingEnabled = false;
  Object.keys(A.samples).forEach((key, i) => {
    const p = A.project(key),
      c = frameCanvas(0, p);
    hero.drawImage(
      c,
      [9, 64, 27, 81][i],
      [12, 8, 48, 48][i],
      i === 1 ? 32 : 24,
      i === 1 ? 32 : 24,
    );
  });

  // Operations use an explicit preview and a single history transaction.
  function openOperation(title, build, apply, label = "Apply", cancel = null) {
    if ($("#operation-dialog").open) $("#operation-dialog").close();
    $("#operation-title").textContent = title;
    $("#operation-content").replaceChildren();
    $("#operation-error").textContent = "";
    $("#operation-apply").textContent = label;
    operationApply = apply;
    operationCancel = cancel;
    build();
    showDialog("#operation-dialog");
  }
  $("#operation-apply").onclick = async () => {
    try {
      await operationApply?.();
      operationCancel = null;
      $("#operation-dialog").close();
    } catch (e) {
      $("#operation-error").textContent = e.message;
    }
  };
  $("#operation-dialog").addEventListener("close", () => {
    operationCancel?.();
    operationCancel = null;
  });
  function textOperation(title, label, value, max, apply) {
    openOperation(
      title,
      () => {
        const l = document.createElement("label");
        l.className = "stack";
        l.textContent = label;
        const input = document.createElement("input");
        input.id = "operation-text";
        input.value = value;
        input.maxLength = max;
        l.append(input);
        $("#operation-content").append(l);
      },
      () => {
        const value = $("#operation-text").value.trim();
        if (!value) throw Error("Enter a name.");
        apply(value);
      },
    );
  }
  $("#resize").onclick = () => {
    cancelSelection();
    let result;
    openOperation(
      "Canvas size & artwork scale",
      () => {
        $("#operation-content").innerHTML =
          '<div class="stack"><label>Action<select id="resize-mode"><option value="canvas">Canvas size · add or crop space</option><option value="scale">Scale artwork · nearest neighbor</option></select></label><div class="row"><label>Width<input id="resize-width" type="number" min="1" max="256"></label><label>Height<input id="resize-height" type="number" min="1" max="256"></label><label>Anchor<select id="resize-anchor"><option value="center">Center</option><option value="top-left">Top left</option></select></label></div><div class="operation-preview checker"><canvas id="resize-preview" aria-label="Canvas change preview"></canvas></div><p id="resize-info" class="muted"></p></div>';
        $("#resize-width").value = P().width;
        $("#resize-height").value = P().height;
        const update = () => {
          try {
            result = M.clone(P());
            const scale = $("#resize-mode").value === "scale";
            M.resize(
              result,
              num("#resize-width"),
              num("#resize-height"),
              scale,
              $("#resize-anchor").value,
            );
            A.canvas(
              M.composite(result, fi),
              result.width,
              result.height,
              $("#resize-preview"),
            );
            $("#resize-preview").style.width =
              Math.min(220, result.width * 4) + "px";
            $("#resize-info").textContent =
              `All ${P().frames.length} frames and ${P().layers.length} layers. ${scale ? "Scaling changes the pixels. Integer enlargement keeps clean edges." : "Cropping removes pixels outside the new canvas."} Undo restores the original.`;
            $("#operation-error").textContent = "";
          } catch (e) {
            result = null;
            $("#operation-error").textContent = e.message;
          }
        };
        $$("#operation-content input, #operation-content select").forEach(
          (el) => (el.oninput = update),
        );
        update();
      },
      () => {
        if (!result) throw Error("Choose valid dimensions.");
        edit((p) =>
          M.resize(
            p,
            result.width,
            result.height,
            $("#resize-mode").value === "scale",
            $("#resize-anchor").value,
          ),
        );
        fit();
      },
    );
  };
  $("#transform").onclick = () => {
    if (!writable()) return;
    cancelSelection();
    let transformed;
    openOperation(
      "Transform this layer & frame",
      () => {
        $("#operation-content").innerHTML =
          '<div class="stack"><label>Transform<select id="transform-kind"><option value="flip-x">Flip horizontally</option><option value="flip-y">Flip vertically</option><option value="rotate">Rotate 90° clockwise</option><option value="outline">Add a one-pixel outline</option></select></label><div class="operation-preview checker"><canvas id="transform-preview" aria-label="Transform preview"></canvas></div><p class="muted">Only the selected layer in this frame. Rectangular rotations are centered and may crop; inspect the preview before applying.</p></div>';
        const update = () => {
          const p = P(),
            src = p.frames[fi].cels[li],
            out = new Uint32Array(src.length),
            kind = $("#transform-kind").value;
          for (let y = 0; y < p.height; y++)
            for (let x = 0; x < p.width; x++) {
              let a = x,
                b = y;
              if (kind === "flip-x") a = p.width - 1 - x;
              else if (kind === "flip-y") b = p.height - 1 - y;
              else if (kind === "rotate") {
                a = Math.floor(y - (p.height - p.width) / 2);
                b = Math.floor(p.height - 1 - x + (p.width - p.height) / 2);
              }
              const i = y * p.width + x;
              if (kind === "outline") {
                out[i] = src[i];
                if (
                  !(src[i] & 255) &&
                  [
                    [x - 1, y],
                    [x + 1, y],
                    [x, y - 1],
                    [x, y + 1],
                  ].some(
                    ([a, b]) =>
                      a >= 0 &&
                      a < p.width &&
                      b >= 0 &&
                      b < p.height &&
                      src[b * p.width + a] & 255,
                  )
                )
                  out[i] = M.rgba(color);
              } else if (a >= 0 && a < p.width && b >= 0 && b < p.height)
                out[i] = src[b * p.width + a];
            }
          transformed = out;
          const temp = M.clone(p);
          temp.frames[fi].cels[li] = out;
          A.canvas(
            M.composite(temp, fi),
            p.width,
            p.height,
            $("#transform-preview"),
          );
          $("#transform-preview").style.width =
            Math.min(220, p.width * 5) + "px";
        };
        $("#transform-kind").onchange = update;
        update();
      },
      () => edit((p) => (p.frames[fi].cels[li] = transformed)),
    );
  };
  $("#replace-color").onclick = () => {
    let replacement;
    openOperation(
      "Replace a color in artwork",
      () => {
        $("#operation-content").innerHTML =
          '<div class="stack"><div class="row"><label>Replace<input id="replace-from" type="color"></label><label>With<input id="replace-to" type="color" value="#e7ba83"></label></div><label>Scope<select id="replace-scope"><option value="cel">This layer, this frame</option><option value="all">All unlocked layers, all frames</option></select></label><div class="operation-preview checker"><canvas id="replace-preview" aria-label="Color replacement preview"></canvas></div><p id="replace-info" class="muted"></p></div>';
        $("#replace-from").value = color;
        const update = () => {
          replacement = M.clone(P());
          const from = M.rgba($("#replace-from").value) >>> 8,
            to = M.rgba($("#replace-to").value) & 0xffffff00;
          let count = 0;
          replacement.frames.forEach((f, j) =>
            f.cels.forEach((c, k) => {
              if (
                replacement.layers[k].locked ||
                ($("#replace-scope").value === "cel" && (j !== fi || k !== li))
              )
                return;
              for (let i = 0; i < c.length; i++)
                if (c[i] >>> 8 === from && c[i] & 255) {
                  c[i] = (to | (c[i] & 255)) >>> 0;
                  count++;
                }
            }),
          );
          replacement.palette = [
            ...new Set([...replacement.palette, $("#replace-to").value]),
          ].slice(0, 256);
          A.canvas(
            M.composite(replacement, fi),
            replacement.width,
            replacement.height,
            $("#replace-preview"),
          );
          $("#replace-preview").style.width =
            Math.min(220, replacement.width * 5) + "px";
          $("#replace-info").textContent =
            `${count} pixels will change. Preview shows the current frame. Transparency is preserved.`;
        };
        $$("#operation-content input, #operation-content select").forEach(
          (e) => (e.oninput = update),
        );
        update();
      },
      () =>
        edit((p) => {
          p.frames = replacement.frames;
          p.palette = replacement.palette;
        }),
    );
  };

  // Export/import helpers are kept separate from canvas overlays and view state.
  function download(blob, name) {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const filename = () =>
    P()
      .name.replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-|-$/g, "") || "sprite";
  function downloadProject() {
    finishStroke();
    if (selection?.moving) applySelection();
    const data = M.serialize(P());
    download(
      new Blob([JSON.stringify(data)], { type: "application/json" }),
      filename() + ".spriteforge",
    );
    message("Editable project downloaded. Keep it as a backup.");
    persist();
  }
  $("#download-project").onclick = downloadProject;
  const blobCanvas = (canvas) =>
    new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(Error("Could not encode PNG. Try a smaller export.")),
        "image/png",
      ),
    );
  function exportData() {
    const p = P(),
      type = $("#export-type").value,
      scale = num("#export-scale"),
      indices = type === "frame" ? [fi] : clipFrames($("#export-range").value),
      padding = type !== "sheet" ? 0 : num("#export-padding"),
      spacing = type !== "sheet" ? 0 : num("#export-spacing"),
      columns =
        type !== "sheet" ? 1 : Math.min(num("#export-columns"), indices.length);
    if (
      !Number.isInteger(columns) ||
      columns < 1 ||
      !Number.isInteger(padding) ||
      padding < 0 ||
      padding > 32 ||
      !Number.isInteger(spacing) ||
      spacing < 0 ||
      spacing > 32
    )
      throw Error("Use valid columns, padding, and spacing.");
    const rows = type === "sheet" ? Math.ceil(indices.length / columns) : 1,
      width =
        (p.width * columns + spacing * (columns - 1) + padding * 2) * scale,
      height = (p.height * rows + spacing * (rows - 1) + padding * 2) * scale;
    if (width * height > 16 * 1024 * 1024 || width > 8192 || height > 8192)
      throw Error(
        "Export is too large. Reduce scale or change the column count.",
      );
    if (type === "gif" && width * height * indices.length > 2 * 1024 * 1024)
      throw Error("GIF is too large. Reduce export scale.");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext("2d");
    c.imageSmoothingEnabled = false;
    const frames = indices.map((index, n) => {
      const x = (padding + (n % columns) * (p.width + spacing)) * scale,
        y = (padding + Math.floor(n / columns) * (p.height + spacing)) * scale;
      if (type === "sheet" || n === 0)
        c.drawImage(
          frameCanvas(index),
          x,
          y,
          p.width * scale,
          p.height * scale,
        );
      return {
        id: p.frames[index].id,
        index,
        x,
        y,
        width: p.width * scale,
        height: p.height * scale,
        duration: p.frames[index].duration,
      };
    });
    return {
      canvas,
      metadata: {
        format: "sprite-forge-sheet-v1",
        image: filename() + ".png",
        width,
        height,
        scale,
        origin: { x: p.origin.x * scale, y: p.origin.y * scale },
        frames,
        clips: p.clips
          .map((c) => ({
            ...c,
            frames: c.frames.filter((id) => frames.some((f) => f.id === id)),
          }))
          .filter((c) => c.frames.length),
      },
      indices,
      scale,
    };
  }
  function renderExport() {
    try {
      const type = $("#export-type").value;
      $("#sheet-options").hidden = type === "frame";
      for (const id of ["export-columns", "export-padding", "export-spacing"])
        $("#" + id).parentElement.hidden = type !== "sheet";
      const data = exportData(),
        target = $("#export-preview");
      target.width = data.canvas.width;
      target.height = data.canvas.height;
      target.getContext("2d").drawImage(data.canvas, 0, 0);
      if (type === "gif") {
        const plan = StudioIO.gifPlan(
            data.indices.map((i) => M.composite(P(), i)),
          ),
          c = A.canvas(plan.preview[0], P().width, P().height);
        target.getContext("2d").clearRect(0, 0, target.width, target.height);
        target.getContext("2d").imageSmoothingEnabled = false;
        target.getContext("2d").drawImage(c, 0, 0, target.width, target.height);
      }
      target.style.width =
        Math.min(270, Math.max(120, target.width * 3)) + "px";
      $("#export-info").textContent =
        type === "gif"
          ? `${data.indices.length} animated frames · ${P().width * data.scale} × ${P().height * data.scale} · GIF converts alpha to on/off and uses up to 255 colors. Preview shows the converted first frame. Timing rounds to 10 ms.`
          : type === "sequence"
            ? `${data.indices.length} numbered PNGs · ${P().width * data.scale} × ${P().height * data.scale} each · ZIP download`
            : `${data.canvas.width} × ${data.canvas.height} pixels · ${data.indices.length} frame${data.indices.length === 1 ? "" : "s"}${type === "sheet" ? " · PNG + JSON in a ZIP" : ""}`;
      $("#export-error").textContent = "";
      $("#download-art").disabled = false;
    } catch (e) {
      $("#export-error").textContent = e.message;
      $("#download-art").disabled = true;
    }
  }
  $("#export").onclick = () => {
    finishStroke();
    if (selection?.moving) applySelection();
    $("#export-range").replaceChildren(
      new Option("All frames", "all"),
      ...P().clips.map((c, i) => new Option(c.name, String(i))),
    );
    $("#export-columns").value = P().recipe
      ? 4
      : Math.min(4, P().frames.length);
    showDialog("#export-dialog");
    renderExport();
  };
  $$("#export-dialog select, #export-dialog input").forEach(
    (el) => (el.oninput = renderExport),
  );
  $("#download-art").onclick = safe(async () => {
    const data = exportData(),
      name = filename(),
      type = $("#export-type").value;
    $("#download-art").disabled = true;
    try {
      if (type === "frame")
        download(await blobCanvas(data.canvas), `${name}-frame-${fi + 1}.png`);
      else if (type === "gif") {
        const w = P().width * data.scale,
          h = P().height * data.scale;
        if (w * h * data.indices.length > 2 * 1024 * 1024)
          throw Error("GIF is too large. Reduce export scale.");
        const frames = data.indices.map((i) => {
          const src = M.composite(P(), i),
            out = new Uint32Array(w * h);
          for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++)
              out[y * w + x] =
                src[
                  Math.floor(y / data.scale) * P().width +
                    Math.floor(x / data.scale)
                ];
          return out;
        });
        download(
          StudioIO.gif(
            StudioIO.gifPlan(frames),
            w,
            h,
            data.indices.map((i) => P().frames[i].duration),
          ),
          name + ".gif",
        );
      } else {
        const entries = [];
        if (type === "sheet") {
          entries.push(
            [
              name + ".png",
              new Uint8Array(
                await (await blobCanvas(data.canvas)).arrayBuffer(),
              ),
            ],
            [
              name + ".json",
              new TextEncoder().encode(JSON.stringify(data.metadata, null, 2)),
            ],
          );
        } else {
          for (const [n, i] of data.indices.entries()) {
            const c = document.createElement("canvas");
            c.width = P().width * data.scale;
            c.height = P().height * data.scale;
            const ctx = c.getContext("2d");
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(frameCanvas(i), 0, 0, c.width, c.height);
            entries.push([
              `${name}-${String(n + 1).padStart(3, "0")}.png`,
              new Uint8Array(await (await blobCanvas(c)).arrayBuffer()),
            ]);
          }
          entries.push([
            "timing.json",
            new TextEncoder().encode(
              JSON.stringify(
                data.indices.map((i, n) => ({
                  file: `${name}-${String(n + 1).padStart(3, "0")}.png`,
                  duration: P().frames[i].duration,
                })),
                null,
                2,
              ),
            ),
          ]);
        }
        download(
          StudioIO.zip(entries),
          name + (type === "sheet" ? "-sheet" : "-frames") + ".zip",
        );
      }
      message("Artwork exported. Your editable project stays here.");
    } finally {
      $("#download-art").disabled = false;
    }
  });
  const openFile = () => $("#file").click();
  $("#open").onclick = openFile;
  $("#open-artwork").onclick = openFile;
  $("#file").onchange = safe(async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    finishStroke();
    if (f.size > 32 * 1024 * 1024)
      throw Error("Choose a file smaller than 32 MB.");
    if (f.type === "image/png" || /\.png$/i.test(f.name)) {
      const header = new DataView(await f.slice(0, 24).arrayBuffer());
      if (
        header.byteLength < 24 ||
        header.getUint32(0) !== 0x89504e47 ||
        header.getUint32(4) !== 0x0d0a1a0a
      )
        throw Error("Invalid PNG file.");
      const w = header.getUint32(16),
        h = header.getUint32(20);
      if (!w || !h || w > 4096 || h > 4096 || w * h > 16 * 1024 * 1024)
        throw Error("PNG dimensions exceed the 4096-pixel import limit.");
      const image = await createImageBitmap(f);
      imported = { image, name: f.name.replace(/\.png$/i, "") };
      $("#import-type").value = w <= 256 && h <= 256 ? "image" : "sheet";
      $("#slice-width").value = Math.min(48, w);
      $("#slice-height").value = Math.min(48, h);
      showDialog("#import-dialog");
      renderImport();
    } else {
      const raw = JSON.parse(await f.text()),
        p = M.migrate(raw, generate);
      p.id = M.uid();
      await switchProject(p);
      message(
        raw.version < 3
          ? "Legacy project imported. Pixel draft and generator recipe preserved."
          : "Project opened as a new copy.",
      );
    }
  });
  function importLayout() {
    const im = imported.image,
      sheet = $("#import-type").value === "sheet",
      width = sheet ? num("#slice-width") : im.width,
      height = sheet ? num("#slice-height") : im.height,
      margin = sheet ? num("#slice-margin") : 0,
      spacing = sheet ? num("#slice-spacing") : 0;
    if (
      !Number.isInteger(width) ||
      width < 1 ||
      width > 256 ||
      !Number.isInteger(height) ||
      height < 1 ||
      height > 256 ||
      !Number.isInteger(margin) ||
      margin < 0 ||
      margin > 256 ||
      !Number.isInteger(spacing) ||
      spacing < 0 ||
      spacing > 256
    )
      throw Error(
        "Frames must be 1–256 pixels. Set valid margins and spacing.",
      );
    const columns = Math.floor(
        (im.width - 2 * margin + spacing) / (width + spacing),
      ),
      rows = Math.floor(
        (im.height - 2 * margin + spacing) / (height + spacing),
      ),
      count = rows * columns;
    if (
      columns < 1 ||
      rows < 1 ||
      count > 256 ||
      count * width * height > M.LIMIT
    )
      throw Error(
        "Choose a slicing grid with 1–256 frames within the document limit.",
      );
    return { width, height, margin, spacing, columns, rows, count };
  }
  function renderImport() {
    const im = imported.image,
      c = $("#import-preview");
    c.width = im.width;
    c.height = im.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(im, 0, 0);
    $("#import-slicing").hidden = $("#import-type").value !== "sheet";
    try {
      const l = importLayout();
      ctx.strokeStyle = "#ff5293";
      ctx.lineWidth = Math.max(1, im.width / 600);
      if ($("#import-type").value === "sheet")
        for (let y = 0; y < l.rows; y++)
          for (let x = 0; x < l.columns; x++)
            ctx.strokeRect(
              l.margin + x * (l.width + l.spacing),
              l.margin + y * (l.height + l.spacing),
              l.width,
              l.height,
            );
      $("#import-info").textContent =
        `${l.count} frame${l.count === 1 ? "" : "s"} · ${l.width} × ${l.height} pixels. Any remainder outside the outlined frames is excluded.`;
      $("#import-confirm").disabled = false;
    } catch (e) {
      $("#import-info").textContent = e.message;
      $("#import-confirm").disabled = true;
    }
  }
  $$("#import-dialog input, #import-dialog select").forEach(
    (el) => (el.oninput = renderImport),
  );
  $("#import-confirm").onclick = safe(async () => {
    const l = importLayout(),
      p = M.blank(l.width, l.height, imported.name.slice(0, 120)),
      c = document.createElement("canvas");
    c.width = l.width;
    c.height = l.height;
    const ctx = c.getContext("2d");
    p.frames = [];
    for (let y = 0; y < l.rows; y++)
      for (let x = 0; x < l.columns; x++) {
        ctx.clearRect(0, 0, l.width, l.height);
        ctx.drawImage(
          imported.image,
          l.margin + x * (l.width + l.spacing),
          l.margin + y * (l.height + l.spacing),
          l.width,
          l.height,
          0,
          0,
          l.width,
          l.height,
        );
        p.frames.push({ id: M.uid(), duration: 150, cels: [A.pixels(c)] });
      }
    p.palette = M.extract(p);
    $("#import-dialog").close();
    await switchProject(p);
    message("PNG opened. Original colors and alpha preserved.");
  });
  $("#import-dialog").addEventListener("close", () => {
    imported?.image.close();
    imported = null;
  });
  $("#reference").onclick = () => $("#reference-file").click();
  $("#reference-file").onchange = safe(async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024)
      throw Error("Choose a reference smaller than 10 MB.");
    if (referenceURL) URL.revokeObjectURL(referenceURL);
    referenceURL = URL.createObjectURL(file);
    $("#reference-image").src = referenceURL;
    $("#reference-panel").hidden = false;
    $("#inspector").classList.add("open");
  });
  $("#remove-reference").onclick = () => {
    if (referenceURL) URL.revokeObjectURL(referenceURL);
    referenceURL = null;
    $("#reference-image").removeAttribute("src");
    $("#reference-panel").hidden = true;
  };
  // Small, local SVG icons keep the tool language consistent without a remote icon dependency.
  const iconPaths = {
    pencil: "M4 16 15 5l4 4L8 20H4v-4Z M13 7l4 4",
    eraser: "m3 14 9-10 9 8-7 8H9l-6-6Z M8 9l9 8 M13 20h8",
    fill: "m5 5 9 9-6 6-7-7 6-6 M2 12h12 M18 13s4 4 4 6a3 3 0 0 1-6 0c0-2 2-6 2-6Z",
    picker: "m4 16 9-9 4 4-9 9H4v-4Z M12 4l8 8 M15 5l3-3 4 4-3 3",
    select: "M3 8V3h5 M16 3h5v5 M3 16v5h5 M16 21h5v-5 M8 12h8 M12 8v8",
    pan: "M12 2v20 M2 12h20 M8 6l4-4 4 4 M8 18l4 4 4-4 M6 8l-4 4 4 4 M18 8l4 4-4 4",
    line: "M4 20 20 4 M3 19h2v2H3Z M19 3h2v2h-2Z",
    rectangle: "M4 5h16v14H4Z",
    ellipse: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
    wand: "m4 20 12-12 M14 6l4 4 M5 3v4 M3 5h4 M19 15v6 M16 18h6",
    dither:
      "M4 4h4v4H4Z M12 4h4v4h-4Z M8 8h4v4H8Z M16 8h4v4h-4Z M4 12h4v4H4Z M12 12h4v4h-4Z M8 16h4v4H8Z M16 16h4v4h-4Z",
  };
  $$("[data-tool]").forEach(
    (b) =>
      (b.querySelector(".tool-symbol").innerHTML =
        `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPaths[b.dataset.tool]}"></path></svg>`),
  );
  const sizes = document.createElement("div");
  sizes.className = "row extra-sizes";
  for (const size of [8, 24, 96])
    sizes.append(
      button(`${size} × ${size}`, () => {
        $("#new-width").value = size;
        $("#new-height").value = size;
        $$("#size-presets button").forEach((b) =>
          b.classList.remove("selected"),
        );
      }),
    );
  $("#custom-size").append(sizes);
  const originButton = button(
    "Set origin",
    () =>
      openOperation(
        "Set the sprite origin",
        () => {
          $("#operation-content").innerHTML =
            '<p class="muted">The origin is the point your game uses to place the sprite. Bottom center is useful for character feet. Applies to every frame.</p><div class="row"><label>X<input id="origin-x" type="number" min="0"></label><label>Y<input id="origin-y" type="number" min="0"></label></div>';
          $("#origin-x").value = P().origin.x;
          $("#origin-y").value = P().origin.y;
          $("#origin-x").max = P().width - 1;
          $("#origin-y").max = P().height - 1;
        },
        () => {
          const x = num("#origin-x"),
            y = num("#origin-y");
          if (
            !Number.isInteger(x) ||
            !Number.isInteger(y) ||
            x < 0 ||
            x >= P().width ||
            y < 0 ||
            y >= P().height
          )
            throw Error("The origin must be inside the canvas.");
          edit((p) => (p.origin = { x, y }));
          $("#guides").checked = true;
          renderOverlay();
        },
      ),
    { id: "set-origin" },
  );
  $(".rail-bottom").append(originButton);
  for (const key of ["hair", "outfit"]) {
    const select = $(`#controls select[name="${key}"]`),
      choices = document.createElement("div");
    choices.className = "part-choices";
    choices.setAttribute("aria-label", `${key} previews`);
    for (const option of select.options) {
      const c = document.createElement("canvas");
      c.width = c.height = 48;
      const s = { ...SpriteGenerator.defaults, [key]: option.value };
      SpriteGenerator.draw(c.getContext("2d"), s, 0, 0);
      const b = button(
        "",
        () => {
          select.value = option.value;
          renderGenerator();
        },
        { "aria-label": `Choose ${option.textContent}` },
      );
      b.append(c, option.textContent);
      choices.append(b);
    }
    select.parentElement.after(choices);
  }
  let gesture = null;
  viewport.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 2) return;
      finishStroke(true);
      cancelSelection();
      const [a, b] = e.touches;
      gesture = {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom,
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
      e.preventDefault();
    },
    { passive: false },
  );
  viewport.addEventListener(
    "touchmove",
    (e) => {
      if (!gesture || e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = e.touches;
      zoom = Math.round(
        (gesture.zoom *
          Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)) /
          Math.max(1, gesture.distance),
      );
      applyZoom();
      viewport.scrollLeft =
        gesture.left - (a.clientX + b.clientX) / 2 + gesture.x;
      viewport.scrollTop =
        gesture.top - (a.clientY + b.clientY) / 2 + gesture.y;
    },
    { passive: false },
  );
  viewport.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) gesture = null;
  });
  viewport.addEventListener("touchcancel", () => {
    gesture = null;
  });
  renderGenerator();
  recent();
})();

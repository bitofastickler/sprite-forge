"use strict";
const { spawnSync } = require("node:child_process"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
for (const file of fs
  .readdirSync(path.join(root, "dist"))
  .filter((f) => f.endsWith(".js"))) {
  const result = spawnSync(
    process.execPath,
    ["--check", path.join(root, "dist", file)],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
for (const file of [
  "pixel-model.test.cjs",
  "studio-model.test.cjs",
  "generator.test.cjs",
  "io.test.cjs",
]) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log("All syntax and automated checks passed.");

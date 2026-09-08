"use strict";
const ProjectStore = (() => {
  let database;
  function open() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(
          Error(
            "Device storage is unavailable. Download your editable project.",
          ),
        );
        return;
      }
      const request = indexedDB.open("sprite-forge-studio", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("projects", { keyPath: "id" });
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(Error("Close other Sprite Forge tabs to enable storage."));
      request.onsuccess = () => resolve(request.result);
    });
    return database;
  }
  async function list() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("projects"),
        r = tx.objectStore("projects").getAll();
      r.onsuccess = () =>
        resolve(r.result.sort((a, b) => b.updated - a.updated));
      r.onerror = () => reject(r.error);
    });
  }
  async function get(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const r = db.transaction("projects").objectStore("projects").get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function save(project, expectedRevision = 0) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("projects", "readwrite"),
        store = tx.objectStore("projects"),
        read = store.get(project.id);
      let result;
      read.onsuccess = () => {
        const old = read.result,
          conflict = old && old.revision !== expectedRevision;
        const data = StudioModel.serialize(project);
        if (conflict) {
          data.id = StudioModel.uid();
          data.name = (data.name + " — recovered copy").slice(0, 120);
        }
        result = {
          id: data.id,
          revision: conflict ? 1 : (old?.revision || 0) + 1,
          name: data.name,
          conflict: !!conflict,
        };
        store.put({
          ...result,
          updated: Date.now(),
          project: data,
          previous: conflict ? null : old?.project || null,
        });
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error("Save interrupted."));
    });
  }
  return { open, list, get, save };
})();

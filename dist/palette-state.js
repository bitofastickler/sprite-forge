'use strict';

// Keep the editor palette stable while pixels are edited. app.js rebuilds the
// palette from colors that are still present in the sprite, which meant a color
// disappeared as soon as its last pixel was painted over. This wrapper retains
// colors that have been exposed to the user for the lifetime of the pixel draft.
(() => {
  const palette = document.querySelector('#palette');
  const colorInput = document.querySelector('#paint-color');
  const originalUpdatePalette = window.updatePalette;

  if (!palette || !colorInput || typeof originalUpdatePalette !== 'function') return;

  const retained = new Set();
  const normalize = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value.toLowerCase() : null;

  function collectVisibleColors() {
    palette.querySelectorAll('button').forEach(button => {
      const color = normalize(button.title);
      if (color) retained.add(color);
    });
  }

  function makeColorButton(color) {
    const button = document.createElement('button');
    button.style.background = color;
    button.title = color;
    button.setAttribute('aria-label', `Paint with ${color}`);
    button.onclick = () => {
      colorInput.value = color;
      document.querySelector('[data-tool="pencil"]')?.click();
    };
    return button;
  }

  function restoreRetainedColors() {
    const visible = new Set(
      [...palette.querySelectorAll('button')]
        .map(button => normalize(button.title))
        .filter(Boolean)
    );

    retained.forEach(color => {
      if (!visible.has(color)) palette.append(makeColorButton(color));
    });
  }

  window.updatePalette = function updatePersistentPalette() {
    // Capture the palette before app.js recomputes it, then merge the recomputed
    // colors back into the retained set. Colors can be added, but not silently lost.
    collectVisibleColors();
    originalUpdatePalette();
    collectVisibleColors();
    restoreRetainedColors();
  };

  colorInput.addEventListener('input', () => {
    const color = normalize(colorInput.value);
    if (!color) return;
    retained.add(color);
    restoreRetainedColors();
  });

  // Starting or loading another character is a new draft, so it should get a
  // fresh palette rather than inheriting unused colors from the previous draft.
  const resetPalette = () => {
    retained.clear();
    palette.replaceChildren();
  };

  document.querySelector('#edit-generated')?.addEventListener('click', resetPalette, true);
  document.querySelector('#start-blank')?.addEventListener('click', resetPalette, true);
  document.querySelector('#file')?.addEventListener('change', resetPalette, true);
})();

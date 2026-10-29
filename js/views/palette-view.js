// Colour swatches; selecting one copies its hex value.
export class PaletteView {
  constructor({ root, swatches, toast }) {
    root.innerHTML = swatches.map(s => `
      <button class="swatch" type="button" data-hex="${s.hex}" aria-label="Copy ${s.name}, ${s.hex}">
        <span class="swatch__chip" style="background:${s.hex}"></span>
        <span class="swatch__info"><span class="swatch__name">${s.name}</span><span class="swatch__hex">${s.hex}</span><span class="swatch__role">${s.role}</span></span>
      </button>`).join('');
    root.addEventListener('click', e => {
      const b = e.target.closest('.swatch');
      if (!b) return;
      const hex = b.dataset.hex;
      const done = () => toast.show(`Copied ${hex}`);
      try { navigator.clipboard.writeText(hex).then(done, () => toast.show(hex)); } catch { toast.show(hex); }
    });
  }
}

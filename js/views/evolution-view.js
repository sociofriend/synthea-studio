// Version timeline as an accessible tab list: arrow keys move between versions, Home and End jump.
export class EvolutionView {
  constructor({ root, viewModel }) {
    const tabs = root.querySelector('[role="tablist"]'), panel = root.querySelector('[role="tabpanel"]');
    const img = panel.querySelector('.evolution__img'), name = panel.querySelector('.evolution__name');
    const body = panel.querySelector('.evolution__body'), meta = panel.querySelector('.evolution__meta');
    panel.id = 'evolution-panel';

    tabs.innerHTML = viewModel.versions.map((v, i) => `
      <button class="evo-tab" type="button" role="tab" id="evo-tab-${v.id}" aria-controls="evolution-panel" data-index="${i}" data-status="${v.status}">
        <span class="evo-tab__label">${v.label}</span><span class="evo-tab__name">${v.name}</span>
      </button>`).join('');
    const buttons = [...tabs.querySelectorAll('[role="tab"]')];

    // warm the cache so switching is instant
    viewModel.versions.forEach(v => { const i = new Image(); i.src = v.image; });

    tabs.addEventListener('click', e => { const b = e.target.closest('[role="tab"]'); if (b) viewModel.select(+b.dataset.index); });
    tabs.addEventListener('keydown', e => {
      const map = { ArrowRight: () => viewModel.next(), ArrowLeft: () => viewModel.previous(), Home: () => viewModel.select(0), End: () => viewModel.select(viewModel.versions.length - 1) };
      if (!map[e.key]) return;
      e.preventDefault(); map[e.key](); buttons[viewModel.index.value].focus();
    });

    let first = true;
    viewModel.index.sink(i => {
      const v = viewModel.versions[i];
      buttons.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
      panel.setAttribute('aria-labelledby', `evo-tab-${v.id}`);
      meta.innerHTML = `<span class="chip" data-status="${v.status}">${v.status}</span><code>${v.branch}</code>`;
      name.textContent = `${v.label} · ${v.name}`;
      body.textContent = v.text;
      // keep the selected tab in view by scrolling the tab strip only, never the page
      const b = buttons[i];
      tabs.scrollTo({ left: b.offsetLeft - (tabs.clientWidth - b.offsetWidth) / 2, behavior: first ? 'instant' : 'smooth' });
      if (first) { first = false; img.src = v.image; img.alt = v.alt; return; }
      img.classList.add('is-swapping');
      const swap = () => { img.src = v.image; img.alt = v.alt; img.classList.remove('is-swapping'); };
      setTimeout(swap, 140);
    });
  }
}

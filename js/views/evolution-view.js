import { bindTabs } from '../core/tabs.js';

// Version timeline as an accessible tab list: arrow keys move between versions, Home and End jump.
export class EvolutionView {
  constructor({ root, viewModel }) {
    const list = root.querySelector('[role="tablist"]'), panel = root.querySelector('[role="tabpanel"]');
    const img = panel.querySelector('.evolution__img'), name = panel.querySelector('.evolution__name');
    const body = panel.querySelector('.evolution__body'), meta = panel.querySelector('.evolution__meta');
    panel.id = 'evolution-panel';

    list.innerHTML = viewModel.items.map(v => `
      <button class="evo-tab" type="button" role="tab" id="evo-tab-${v.id}" aria-controls="evolution-panel" data-status="${v.status}">
        <span class="evo-tab__label">${v.label}</span><span class="evo-tab__name">${v.name}</span>
      </button>`).join('');
    const tabs = [...list.querySelectorAll('[role="tab"]')];

    // warm the cache so switching is instant
    viewModel.items.forEach(v => { const i = new Image(); i.src = v.image; });
    bindTabs({ list, tabs, viewModel });

    let first = true;
    viewModel.selected.sink(v => {
      const tab = tabs[viewModel.index.value];
      panel.setAttribute('aria-labelledby', tab.id);
      meta.innerHTML = `<span class="chip" data-status="${v.status}">${v.status}</span><code>${v.branch}</code>`;
      name.textContent = `${v.label} · ${v.name}`;
      body.textContent = v.text;
      // keep the selected tab in view by scrolling the tab strip only, never the page
      list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: first ? 'instant' : 'smooth' });
      if (first) { first = false; img.src = v.image; img.alt = v.alt; return; }
      img.classList.add('is-swapping');
      setTimeout(() => { img.src = v.image; img.alt = v.alt; img.classList.remove('is-swapping'); }, 140);
    });
  }
}

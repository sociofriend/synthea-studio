import { bindTabs } from '../core/tabs.js';

// Source viewer: the file navigator is a tab list, and the breadcrumb follows the open file.
export class CodeView {
  constructor({ root, viewModel }) {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
    const folder = root.querySelector('.xcode__folder'), file = root.querySelector('.xcode__file');
    bindTabs({ list: root.querySelector('[role="tablist"]'), tabs, viewModel, orientation: 'both' });
    viewModel.index.sink(i => {
      panels.forEach((p, k) => { p.classList.toggle('is-inactive', k !== i); p.inert = k !== i; });
      folder.textContent = tabs[i].dataset.folder;
      file.textContent = tabs[i].textContent.trim();
    });
  }
}

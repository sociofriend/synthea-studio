// ARIA tabs bound to a SelectionViewModel: click or arrow keys select, Home and End jump.
const STEPS = {
  horizontal: { ArrowRight: 1, ArrowLeft: -1 },
  vertical: { ArrowDown: 1, ArrowUp: -1 },
  both: { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }
};

export function bindTabs({ list, tabs, viewModel, orientation = 'horizontal' }) {
  const steps = STEPS[orientation];
  list.addEventListener('click', e => {
    const i = tabs.indexOf(e.target.closest('[role="tab"]'));
    if (i >= 0) viewModel.select(i);
  });
  list.addEventListener('keydown', e => {
    const i = e.key in steps ? viewModel.index.value + steps[e.key] : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (i === null) return;
    e.preventDefault(); viewModel.select(i); tabs[viewModel.index.value].focus();
  });
  viewModel.index.sink(i => tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; }));
}

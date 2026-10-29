// The header switch. It shows the appearance you would switch to.
export class AppearanceToggleView {
  constructor({ button, label, appearance }) {
    button.addEventListener('click', () => appearance.toggle());
    appearance.mode.sink(mode => {
      const next = mode === 'dark' ? 'light' : 'dark';
      button.setAttribute('aria-pressed', String(mode === 'light'));
      label.textContent = `Switch to ${next} appearance`;
      button.title = label.textContent;
    });
  }
}

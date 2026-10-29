import { Subject } from '../core/subject.js';
import { storage } from '../core/storage.js';

const KEY = 'synthea.appearance';

// Resolves the appearance from an explicit choice, else the device setting, and publishes it.
export class AppearanceViewModel {
  #query = matchMedia('(prefers-color-scheme: light)');
  #explicit;

  constructor(root = document.documentElement) {
    this.root = root;
    const saved = storage.get(KEY);
    const preset = root.dataset.theme;
    this.#explicit = saved === 'light' || saved === 'dark' ? saved : (preset === 'light' || preset === 'dark' ? preset : null);
    this.mode = new Subject(this.#resolve());
    this.#query.addEventListener('change', () => { if (!this.#explicit) this.mode.send(this.#resolve()); });
  }

  #resolve() { return this.#explicit ?? (this.#query.matches ? 'light' : 'dark'); }

  toggle() {
    this.#explicit = this.mode.value === 'dark' ? 'light' : 'dark';
    this.root.dataset.theme = this.#explicit;
    storage.set(KEY, this.#explicit);
    this.mode.send(this.#explicit);
  }
}

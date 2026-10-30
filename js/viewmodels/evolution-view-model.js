import { Subject } from '../core/subject.js';

// Holds the selected version; defaults to the current one.
export class EvolutionViewModel {
  constructor(versions) {
    this.versions = versions;
    const current = versions.findIndex(v => v.status === 'Current');
    this.index = new Subject(current >= 0 ? current : versions.length - 1);
    this.selected = this.index.map(i => versions[i]);
  }

  select(i) { this.index.send((i + this.versions.length) % this.versions.length); }
  next() { this.select(this.index.value + 1); }
  previous() { this.select(this.index.value - 1); }
}

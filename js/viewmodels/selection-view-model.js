import { Subject } from '../core/subject.js';

// Holds which item of a list is selected, wrapping at both ends. Backs every tab list on the page.
export class SelectionViewModel {
  constructor(items, initial = 0) {
    this.items = items;
    this.index = new Subject(initial);
    this.selected = this.index.map(i => items[i]);
  }

  select(i) { this.index.send((i + this.items.length) % this.items.length); }
}

// A minimal value publisher, in the spirit of Combine's CurrentValueSubject.
// Views subscribe to view-model state; `sink` replays the current value immediately.

export class Subject {
  #value;
  #subscribers = new Set();

  constructor(value) { this.#value = value; }

  get value() { return this.#value; }

  send(value) {
    if (Object.is(value, this.#value)) return;
    this.#value = value;
    for (const fn of this.#subscribers) fn(value);
  }

  // Returns a cancel function, like an AnyCancellable.
  sink(fn) {
    this.#subscribers.add(fn);
    fn(this.#value);
    return () => this.#subscribers.delete(fn);
  }

  map(transform) {
    const derived = new Subject(transform(this.#value));
    this.sink(v => derived.send(transform(v)));
    return derived;
  }
}

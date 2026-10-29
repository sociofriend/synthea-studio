import { Subject } from '../core/subject.js';

// Short confirmations ("Copied #9CCBFF") that clear themselves.
export class ToastViewModel {
  message = new Subject('');
  #timer;

  show(text, ms = 1600) {
    clearTimeout(this.#timer);
    this.message.send('');
    this.message.send(text);
    this.#timer = setTimeout(() => this.message.send(''), ms);
  }
}

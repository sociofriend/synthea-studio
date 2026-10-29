export class ToastView {
  constructor({ el, toast }) {
    toast.message.sink(text => { el.textContent = text; el.hidden = !text; });
  }
}

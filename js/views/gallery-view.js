// Opens gallery images in a native <dialog>; Escape and the close button dismiss it.
export class GalleryView {
  constructor({ root, dialog }) {
    const img = dialog.querySelector('img'), caption = dialog.querySelector('.lightbox__caption');
    root.addEventListener('click', e => {
      const b = e.target.closest('button[data-full]');
      if (!b || typeof dialog.showModal !== 'function') return;
      const thumb = b.querySelector('img');
      img.src = b.dataset.full; img.alt = thumb.alt;
      caption.textContent = b.parentElement.querySelector('.gallery__caption')?.textContent ?? '';
      dialog.showModal();
    });
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  }
}

// Best-effort preference storage: private windows and blocked site data must not break the page.

export const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* preference simply isn't kept */ }
  }
};

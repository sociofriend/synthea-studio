import { drawGround, drawUnder, drawOver, drawSignal, drawOrbit, drawSignalLine } from '../render/pearl.js';

// The live pearl. The ground and the pearl's static layers are cached; each frame only the
// signal, the horizon and the orbit's satellite move. Pauses off-screen and for reduced motion.
export class HeroView {
  #mode = 'dark';
  #layers = null;
  #frame = 0;
  #running = false;
  #visible = true;
  #tilt = 0;
  #tiltTarget = 0;
  #reduced = matchMedia('(prefers-reduced-motion: reduce)');

  constructor({ ground, stage, appearance }) {
    this.ground = ground;
    this.stage = stage;
    this.host = stage.parentElement;
    appearance.mode.sink(mode => { this.#mode = mode; this.#layout(); });
    new ResizeObserver(() => this.#layout()).observe(this.host);
    new IntersectionObserver(([e]) => { this.#visible = e.isIntersecting; this.#update(); }).observe(this.host);
    document.addEventListener('visibilitychange', () => this.#update());
    this.#reduced.addEventListener('change', () => this.#update());
    this.host.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = this.host.getBoundingClientRect();
      this.#tiltTarget = ((e.clientX - r.left) / r.width - 0.5) * 2;
    });
    this.host.addEventListener('pointerleave', () => { this.#tiltTarget = 0; });
  }

  // Geometry: pearl to the right on wide screens, above the text on narrow ones.
  #geometry(w, h) {
    if (w < 760) { const r = Math.min(86, w * 0.21); return { cx: w / 2, cy: 150, r }; }
    const r = Math.min(h * 0.24, w * 0.15, 200);
    return { cx: w * 0.76, cy: h * 0.47, r };
  }

  #layout() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    const d = Math.min(2, devicePixelRatio || 1);
    for (const c of [this.ground, this.stage]) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    const g = this.#geometry(w, h);
    this.geo = { w, h, d, ...g };

    const gx = this.ground.getContext('2d'); gx.setTransform(d, 0, 0, d, 0, 0);
    drawGround(gx, w, h, { mode: this.#mode, seed: 5 });
    // fade the ground into the page below, so the hero has no hard edge
    const fade = gx.createLinearGradient(0, h * 0.7, 0, h);
    const bg = getComputedStyle(document.body).backgroundColor;
    fade.addColorStop(0, bg.replace('rgb(', 'rgba(').replace(')', ', 0)')); fade.addColorStop(1, bg);
    gx.fillStyle = fade; gx.fillRect(0, h * 0.7, w, h * 0.3);

    // cache the pearl's static layers once per size and appearance
    const size = Math.ceil(g.r * 4.2), off = size / 2;
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(size * d); c.height = Math.ceil(size * d); const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); return [c, x]; };
    const [under, ux] = mk(), [over, ox] = mk();
    drawUnder(ux, off, off, g.r, { mode: this.#mode });
    drawOver(ox, off, off, g.r, { mode: this.#mode });
    this.#layers = { under, over, size, off };
    this.#draw(performance.now());
    this.#update();
  }

  #update() {
    const shouldRun = this.#visible && !document.hidden && !this.#reduced.matches && !!this.#layers;
    if (shouldRun && !this.#running) { this.#running = true; this.#frame = requestAnimationFrame(t => this.#tick(t)); }
    if (!shouldRun && this.#running) { this.#running = false; cancelAnimationFrame(this.#frame); }
  }

  #tick(t) {
    if (!this.#running) return;
    this.#tilt += (this.#tiltTarget - this.#tilt) * 0.04;
    this.#draw(t);
    this.#frame = requestAnimationFrame(n => this.#tick(n));
  }

  #draw(t) {
    if (!this.#layers || !this.geo) return;
    const { w, h, d, cx, cy, r } = this.geo, { under, over, size, off } = this.#layers;
    const light = this.#mode === 'light', narrow = w < 760;
    const x = this.stage.getContext('2d');
    x.setTransform(d, 0, 0, d, 0, 0);
    x.clearRect(0, 0, w, h);

    const x0 = narrow ? 0 : Math.max(w * 0.52, cx - r * 3.6);
    drawSignalLine(x, x0, w, cy, { center: cx, span: r * 2.6, amp: r * 0.16, freq: 4.2 / r, alpha: light ? 0.4 : 0.32, mode: this.#mode, phase: -t * 0.0012 });

    const orbit = { rot: -0.42, alpha: light ? 0.5 : 0.32, width: 1, node: t * 0.00045 };
    const rx = Math.min(r * 2.3, (w - cx) + r * 1.2), ry = r * 0.62;
    drawOrbit(x, cx, cy, rx, ry, { ...orbit, half: 'back' });

    x.drawImage(under, cx - off, cy - off, size, size);
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip();
    drawSignal(x, cx, cy, r * 0.56, {
      ph: Math.PI / 2 + 0.22 * Math.sin(t * 0.00035),
      rot: -0.18 + this.#tilt * 0.14,
      drift: t * 0.00009,
      steps: 360
    });
    x.restore();
    x.drawImage(over, cx - off, cy - off, size, size);

    drawOrbit(x, cx, cy, rx, ry, { ...orbit, alpha: light ? 0.75 : 0.52, half: 'front' });
  }
}

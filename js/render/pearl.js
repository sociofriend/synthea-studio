// The Synthetic Pearl, rendered with Canvas 2D.
// Ported from the identity kit renderer (kit/src/pearl.js, v5 "Pearl Signal") and split into layers:
// `drawUnder` and `drawOver` are static and cached by the caller; only `drawSignal` runs per frame.

export const palette = Object.freeze({
  obsidian: '#090B10', graphite: '#171C26', pearl: '#DCE3EC', white: '#F6F7FB', ink: '#1E2230',
  icy: '156,203,255', violet: '184,167,248', nacre: '232,213,227'
});
const C = palette;
const OPAL = [[0, '#EBD3E1'], [0.2, '#CFC4F7'], [0.4, '#BCDDFB'], [0.55, '#F1ECF2'], [0.72, '#E8D5E3'], [0.88, '#C8BDF6'], [1, '#EBD3E1']];
const TAU = Math.PI * 2;

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// 3:2 Lissajous; with phase π/2 it passes through its own centre, where the core sits
function lissajous(ctx, cx, cy, R, ph, rot, steps) {
  const c = Math.cos(rot), s = Math.sin(rot);
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TAU, x = R * Math.sin(3 * t + ph), y = R * Math.sin(2 * t);
    const X = cx + x * c - y * s, Y = cy + x * s + y * c;
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
}
function lissajousPoint(cx, cy, R, ph, rot, t) {
  const x = R * Math.sin(3 * t + ph), y = R * Math.sin(2 * t);
  return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
}

// soft directional rim light: arc from angle `from` to `to`
function ring(ctx, cx, cy, r, color, alpha, from, to, width) {
  const steps = 48;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1), a0 = from + (to - from) * (i / steps), a1 = from + (to - from) * ((i + 1) / steps);
    const fade = Math.sin(Math.PI * t);
    ctx.strokeStyle = `rgba(${color},${alpha * fade})`;
    ctx.lineWidth = width * (0.4 + 0.6 * fade);
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
  }
}

function glow(ctx, x, y, rr, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 4);
  g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr * 4, 0, TAU); ctx.fill();
}

// Aura (or contact shadow in light mode), body and opal skin.
export function drawUnder(ctx, cx, cy, r, { variant = 'pearl', mode = 'dark' } = {}) {
  const light = mode === 'light';
  ctx.save();
  if (light) {
    ctx.save(); ctx.translate(cx, cy + r * 1.1); ctx.scale(1, 0.16);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    sh.addColorStop(0, 'rgba(30,34,48,0.22)'); sh.addColorStop(1, 'rgba(30,34,48,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.restore();
  } else {
    const au = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.9);
    au.addColorStop(0, `rgba(${C.icy},0.12)`); au.addColorStop(0.45, `rgba(${C.violet},0.07)`); au.addColorStop(0.75, `rgba(${C.nacre},0.03)`); au.addColorStop(1, `rgba(${C.nacre},0)`);
    ctx.fillStyle = au; ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, TAU); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const body = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.02, cx, cy, r * 1.02);
  if (variant === 'mind') {
    body.addColorStop(0, 'rgba(246,247,251,0.5)'); body.addColorStop(0.35, 'rgba(150,160,182,0.26)');
    body.addColorStop(0.8, 'rgba(23,28,38,0.88)'); body.addColorStop(1, 'rgba(9,11,16,0.96)');
  } else {
    body.addColorStop(0, '#FFFFFF'); body.addColorStop(0.1, '#FBF8FB'); body.addColorStop(0.34, '#E4E2EE');
    body.addColorStop(0.64, light ? '#9C9EB3' : '#83869B'); body.addColorStop(0.92, light ? '#4A4D61' : '#2A2D3D'); body.addColorStop(1, light ? '#383B4D' : '#181A25');
  }
  ctx.fillStyle = body; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (ctx.createConicGradient) {
    const ir = ctx.createConicGradient(-0.6, cx + r * 0.08, cy + r * 0.1);
    OPAL.forEach(([s, c]) => ir.addColorStop(s, c));
    ctx.filter = `blur(${Math.max(1, Math.round(r * 0.1))}px)`;
    ctx.globalCompositeOperation = variant === 'mind' ? 'screen' : 'soft-light'; ctx.globalAlpha = variant === 'mind' ? 0.16 : 0.85;
    ctx.fillStyle = ir; ctx.fillRect(cx - r * 1.2, cy - r * 1.2, r * 2.4, r * 2.4);
    if (variant !== 'mind') { ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = 0.4; ctx.fillRect(cx - r * 1.2, cy - r * 1.2, r * 2.4, r * 2.4); }
    ctx.filter = 'none';
  }
  ctx.restore();
}

// The signal: a ribbon of phase-shifted strands, one lit lead strand, nodes and the core.
// `drift` moves the nodes along the curve; `ph` and `rot` shape the figure.
export function drawSignal(ctx, cx, cy, R, { glass = false, n = 7, rot = -0.18, ph = Math.PI / 2, drift = 0, steps = 480 } = {}) {
  ctx.save();
  const gr = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  gr.addColorStop(0, `rgba(${C.violet},1)`); gr.addColorStop(1, `rgba(${C.icy},1)`);
  ctx.globalCompositeOperation = glass ? 'lighter' : 'multiply';
  ctx.lineWidth = Math.max(0.5, R * 0.006);
  for (let k = 0; k < n; k++) {
    const t = n > 1 ? k / (n - 1) : 0.5;
    ctx.strokeStyle = glass ? gr : 'rgba(78,80,118,1)';
    ctx.globalAlpha = (glass ? 0.12 : 0.08) + (glass ? 0.3 : 0.12) * Math.sin(Math.PI * t);
    lissajous(ctx, cx, cy, R * (0.9 + 0.1 * t), ph + (t - 0.5) * 0.5, rot, steps); ctx.stroke();
  }
  ctx.globalCompositeOperation = glass ? 'lighter' : 'source-over'; ctx.globalAlpha = glass ? 0.85 : 0.7;
  ctx.strokeStyle = gr; ctx.lineWidth = Math.max(0.8, R * 0.011);
  lissajous(ctx, cx, cy, R * 0.95, ph, rot, steps); ctx.stroke();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
  const rr = Math.max(0.8, R * 0.016);
  [0.35, 1.2, 2.05, 2.9, 3.75, 4.6, 5.45].forEach((t, i) => {
    const [x, y] = lissajousPoint(cx, cy, R * 0.95, ph, rot, t + drift);
    glow(ctx, x, y, rr, i % 3 === 1 ? C.violet : C.icy, 0.85);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(x, y, rr * 0.55, 0, TAU); ctx.fill();
  });
  const [kx, ky] = lissajousPoint(cx, cy, R * 0.95, ph, rot, Math.PI / 2);
  glow(ctx, kx, ky, rr * 1.5, C.icy, 0.9); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(kx, ky, rr * 0.9, 0, TAU); ctx.fill();
  ctx.restore();
}

// Glass sheen, fresnel edge, violet reflection, specular highlight and the icy rim light.
export function drawOver(ctx, cx, cy, r, { mode = 'dark' } = {}) {
  const light = mode === 'light';
  ctx.save();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const sh = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.3, cy + r * 0.3);
  sh.addColorStop(0, 'rgba(255,255,255,0.22)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const fr = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r);
  fr.addColorStop(0, 'rgba(9,11,16,0)'); fr.addColorStop(1, light ? 'rgba(30,34,48,0.28)' : 'rgba(9,11,16,0.5)');
  ctx.fillStyle = fr; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const vr = ctx.createRadialGradient(cx - r * 0.55, cy + r * 0.62, 0, cx - r * 0.55, cy + r * 0.62, r * 0.55);
  vr.addColorStop(0, `rgba(${C.violet},0.45)`); vr.addColorStop(1, `rgba(${C.violet},0)`);
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = vr; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const sp = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.46, 0, cx - r * 0.42, cy - r * 0.46, r * 0.16);
  sp.addColorStop(0, 'rgba(255,255,255,0.95)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sp; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
  ring(ctx, cx, cy, r * 0.993, C.icy, 0.8, -Math.PI * 0.32, Math.PI * 0.55, Math.max(1, r * 0.016));
  ring(ctx, cx, cy, r * 0.99, C.icy, light ? 0.18 : 0.3, -Math.PI * 0.4, Math.PI * 0.7, Math.max(2, r * 0.055));
  ring(ctx, cx, cy, r * 0.993, C.violet, 0.55, Math.PI * 0.45, Math.PI * 0.95, Math.max(1, r * 0.012));
  ctx.restore();
}

// Offset orbit; `half` is 'back' (behind the pearl), 'front', or 'full'.
export function drawOrbit(ctx, cx, cy, rx, ry, { rot = -0.42, alpha = 0.4, width = 1, half = 'full', node = null } = {}) {
  const [a0, a1] = half === 'back' ? [Math.PI, TAU] : half === 'front' ? [0, Math.PI] : [0, TAU];
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  const og = ctx.createLinearGradient(-rx, 0, rx, 0);
  og.addColorStop(0, `rgba(${C.violet},${alpha})`); og.addColorStop(1, `rgba(${C.icy},${alpha})`);
  ctx.strokeStyle = og; ctx.lineWidth = width;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, a0, a1); ctx.stroke();
  if (node !== null) {   // a small satellite travelling along the orbit
    const a = ((node % TAU) + TAU) % TAU, inHalf = half === 'full' || (half === 'front' ? a < Math.PI : a >= Math.PI);
    if (inHalf) { ctx.fillStyle = `rgba(${C.violet},${Math.min(1, alpha * 2)})`; ctx.beginPath(); ctx.arc(rx * Math.cos(a), ry * Math.sin(a), Math.max(2, width * 2.4), 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

// The horizon: flat at the edges, a few waves near the pearl. `phase` animates it.
export function drawSignalLine(ctx, x0, x1, y, { center, span, amp = 14, freq = 0.03, alpha = 0.35, width = 1, mode = 'dark', phase = 0 } = {}) {
  const col = mode === 'light' ? '30,34,48' : '220,227,236';
  const xc = center ?? (x0 + x1) / 2, sp = span ?? (x1 - x0) * 0.35;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${alpha})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = width; ctx.beginPath();
  for (let x = x0; x <= x1; x += 2) {
    const d = (x - xc) / sp, yy = y + amp * Math.exp(-d * d) * Math.sin((x - xc) * freq + phase);
    x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
  }
  ctx.stroke(); ctx.restore();
}

// Ground: obsidian with a few stars, or soft white with a faint nacre / violet / ice wash.
export function drawGround(ctx, W, H, { mode = 'dark', seed = 5, stars = true } = {}) {
  if (mode === 'light') {
    ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H);
    const r = rng(seed), cols = [C.nacre, C.violet, C.icy];
    for (let i = 0; i < 5; i++) {
      const x = r() * W, y = r() * H, rad = (0.3 + r() * 0.4) * Math.max(W, H), c = cols[i % 3];
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, `rgba(${c},0.22)`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    return;
  }
  ctx.fillStyle = C.obsidian; ctx.fillRect(0, 0, W, H);
  if (!stars) return;
  const r = rng(seed), n = Math.round(W * H / 7000);
  for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(220,227,236,${0.08 + r() * 0.25})`; ctx.beginPath(); ctx.arc(r() * W, r() * H, 0.4 + r() * 1.1, 0, TAU); ctx.fill(); }
}

// Whole pearl in one call, for static uses.
export function drawPearl(ctx, cx, cy, r, o = {}) {
  drawUnder(ctx, cx, cy, r, o);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  drawSignal(ctx, cx, cy, r * (o.variant === 'mind' ? 0.66 : 0.56), { glass: o.variant === 'mind', n: o.variant === 'mind' ? 14 : 7 });
  ctx.restore();
  drawOver(ctx, cx, cy, r, o);
}

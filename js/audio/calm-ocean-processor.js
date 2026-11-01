// "Calm Ocean" from Aethéa, ported line for line from the app's Swift generators.
// Three layers (Ocean Waves, Warm Pad, Wind Chimes) in the Bright mood, synthesised live:
// it never loops and never repeats. Each layer is written to its own stereo output, already
// shaped by its volume and width, so the main thread can give each its own reverb depth.

const TWO_PI = Math.PI * 2;

// MARK: - DSP (Audio/DSP.swift)

class RandomSource {
  constructor(seed = (Math.random() * 0xFFFFFFFF) >>> 0 || 1) { this.state = seed >>> 0; }
  next() {
    let s = this.state;
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    this.state = s;
    return s;
  }
  unit() { return (this.next() >>> 8) / 16777216; }
  bipolar() { return this.unit() * 2 - 1; }
  range(lower, upper) { return lower + (upper - lower) * this.unit(); }
  int(below) { return this.next() % Math.max(below, 1); }
}

class OnePoleLowpass {
  y = 0; a = 1;
  setCutoff(hertz, sampleRate) {
    const cutoff = Math.min(Math.max(hertz, 10), sampleRate * 0.45);
    this.a = 1 - Math.exp(-TWO_PI * cutoff / sampleRate);
  }
  process(x) { this.y += this.a * (x - this.y); return this.y; }
}

// Topology-preserving state-variable filter (Cytomic), lowpass output only.
class StateVariableFilter {
  ic1 = 0; ic2 = 0; a1 = 0; a2 = 0; a3 = 0; k = 1;
  set(cutoff, q, sampleRate) {
    const g = Math.tan(Math.PI * Math.min(Math.max(cutoff, 20), sampleRate * 0.45) / sampleRate);
    this.k = 1 / Math.max(q, 0.1);
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  low(v0) {
    const v3 = v0 - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    return v2;
  }
}

// Paul Kellet's economy pink noise filter.
class PinkNoise {
  b0 = 0; b1 = 0; b2 = 0;
  process(white) {
    this.b0 = 0.99765 * this.b0 + white * 0.0990460;
    this.b1 = 0.96300 * this.b1 + white * 0.2965164;
    this.b2 = 0.57000 * this.b2 + white * 1.0526913;
    return (this.b0 + this.b1 + this.b2 + white * 0.1848) * 0.11;
  }
}

class BrownNoise {
  value = 0;
  process(white) { this.value = (this.value + 0.02 * white) / 1.02; return this.value * 3.5; }
}

const TABLE_SIZE = 4096;
function makeTable(harmonics) {
  const table = new Float32Array(TABLE_SIZE + 1);
  let peak = 0;
  for (let i = 0; i <= TABLE_SIZE; i++) {
    const t = i / TABLE_SIZE;
    let v = 0;
    for (const [h, a] of harmonics) v += a * Math.sin(TWO_PI * h * t);
    table[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  for (let i = 0; i <= TABLE_SIZE; i++) table[i] /= peak;
  return table;
}
const range = n => Array.from({ length: n }, (_, i) => i + 1);
const SINE = makeTable([[1, 1]]);
const WARM = makeTable(range(6).map(n => [n, 1 / (n * n)]));
const BRIGHT = makeTable(range(12).map(n => [n, 1 / n]));

function read(table, phase) {
  const position = phase * TABLE_SIZE;
  const index = position | 0;
  const fraction = position - index;
  return table[index] + fraction * (table[index + 1] - table[index]);
}

const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);
function scaleMidi(base, degree, intervals) {
  const count = intervals.length;
  const octave = degree >= 0 ? Math.floor(degree / count) : Math.trunc((degree - count + 1) / count);
  return base + octave * 12 + intervals[degree - octave * count];
}

// The piece's shared settings (Models/Composition.swift, Preset "Calm Ocean").
const BRIGHT_MOOD = [0, 2, 4, 7, 9]; // hidden scale of the "Bright" mood
const ROOT = 0;
const THIRD = BRIGHT_MOOD.includes(4) ? 4 : 3;

// MARK: - Ocean Waves (Audio/NoiseGenerator.swift, texture .ocean)

class Ocean {
  static controlBlock = 32;
  random = new RandomSource();
  pinkL = new PinkNoise(); pinkR = new PinkNoise();
  brownL = new BrownNoise(); brownR = new BrownNoise();
  filterL = new StateVariableFilter(); filterR = new StateVariableFilter();
  swellRate = 1; swellHeight = 1;

  constructor(sampleRate, { density, tone, character }) {
    Object.assign(this, { sampleRate, density, tone, character });
    this.swellPhase = this.random.unit();
  }

  swell(phase) {
    const s = Math.sin(Math.PI * (phase < 0 ? phase + 1 : phase));
    return s * s * this.swellHeight;
  }

  render(frames, left, right) {
    for (let offset = 0; offset < frames; offset += Ocean.controlBlock) {
      this.#block(Math.min(Ocean.controlBlock, frames - offset), left, right, offset);
    }
  }

  #block(frames, left, right, o) {
    const sr = this.sampleRate;
    const size = 0.4 + 1.2 * this.character;
    const envelopeL = this.swell(this.swellPhase) * size;
    const envelopeR = this.swell(this.swellPhase - 0.06) * size;
    const brightness = 0.4 + this.tone;
    this.filterL.set(180 + 3000 * envelopeL * brightness, 0.6, sr);
    this.filterR.set(180 + 3000 * envelopeR * brightness, 0.6, sr);
    const gainL = 0.1 + 0.9 * envelopeL, gainR = 0.1 + 0.9 * envelopeR;
    for (let i = o; i < o + frames; i++) {
      const wl = this.random.bipolar(), wr = this.random.bipolar();
      const sl = this.pinkL.process(wl) + this.brownL.process(wl) * 0.4;
      const sr2 = this.pinkR.process(wr) + this.brownR.process(wr) * 0.4;
      left[i] += this.filterL.low(sl) * gainL;
      right[i] += this.filterR.low(sr2) * gainR;
    }
    const rate = (0.05 + 0.12 * this.density) * this.swellRate;
    this.swellPhase += rate * frames / sr;
    if (this.swellPhase >= 1) {
      this.swellPhase -= 1;
      this.swellHeight = this.random.range(0.45, 1);
      this.swellRate = this.random.range(0.75, 1.25);
    }
  }
}

// MARK: - Warm Pad (Audio/DroneGenerator.swift, style .pad)

class WarmPad {
  static voices = 6;
  static offsets = [0, 7, 12, 12 + THIRD, 19, 24];
  lowpassL = new OnePoleLowpass(); lowpassR = new OnePoleLowpass();

  constructor(sampleRate, { density, tone, character }) {
    Object.assign(this, { sampleRate, density, tone, character });
    const random = new RandomSource();
    const n = WarmPad.voices;
    this.phaseL = Float64Array.from({ length: n }, () => random.unit());
    this.phaseR = Float64Array.from({ length: n }, () => random.unit());
    this.breathPhase = Float64Array.from({ length: n }, () => random.unit());
    this.breathRate = Float64Array.from({ length: n }, () => random.range(0.02, 0.07));
    this.voiceGain = new Float64Array(n);
    this.amplitude = new Float64Array(n);
    this.incL = new Float64Array(n);
    this.incR = new Float64Array(n);
  }

  render(frames, left, right) {
    const { sampleRate: sr, density, tone, character } = this;
    const n = WarmPad.voices;
    const active = 1 + Math.round(density * (n - 1));
    const blockSeconds = frames / sr;
    const glide = 1 - Math.exp(-blockSeconds / 0.8);
    const spread = Math.pow(2, 6 / 1200);
    for (let v = 0; v < n; v++) {
      const f = frequency(48 + ROOT + WarmPad.offsets[v]);
      this.incL[v] = Math.min(f / spread / sr, 0.45);
      this.incR[v] = Math.min(f * spread / sr, 0.45);
      this.voiceGain[v] += ((v < active ? 1 : 0) - this.voiceGain[v]) * glide;
      this.breathPhase[v] += this.breathRate[v] * blockSeconds;
      if (this.breathPhase[v] >= 1) this.breathPhase[v] -= 1;
      const swell = 0.5 + 0.5 * Math.sin(TWO_PI * this.breathPhase[v]);
      this.amplitude[v] = this.voiceGain[v] * (1 - character * 0.9 * (1 - swell));
    }
    const cutoff = 250 * Math.pow(30, tone);
    this.lowpassL.setCutoff(cutoff, sr);
    this.lowpassR.setCutoff(cutoff, sr);
    const gain = 0.3 / Math.sqrt(active);
    const mix = tone;
    for (let i = 0; i < frames; i++) {
      let l = 0, r = 0;
      for (let v = 0; v < n; v++) {
        const a = this.amplitude[v];
        if (a <= 0.0001) continue;
        let p = this.phaseL[v];
        let soft = read(WARM, p);
        l += (soft + (read(BRIGHT, p) - soft) * mix) * a;
        p = this.phaseR[v];
        soft = read(WARM, p);
        r += (soft + (read(BRIGHT, p) - soft) * mix) * a;
        p = this.phaseL[v] + this.incL[v]; this.phaseL[v] = p >= 1 ? p - 1 : p;
        p = this.phaseR[v] + this.incR[v]; this.phaseR[v] = p >= 1 ? p - 1 : p;
      }
      left[i] += this.lowpassL.process(l) * gain;
      right[i] += this.lowpassR.process(r) * gain;
    }
  }
}

// MARK: - Wind Chimes (Audio/StrikeGenerator.swift, mode .chimes, StrikePool, Declicker)

const CHIME = [[1, 1, 3.5], [2.76, 0.45, 1.6], [5.4, 0.25, 0.8], [8.93, 0.12, 0.4]]; // ratio, amplitude, decay (s to -60 dB)
const SILENCE = 0.0001;

class WindChimes {
  static voices = 16;
  random = new RandomSource();
  samplesUntilEvent = 0;
  gust = 0.5;
  declickL = 0; declickR = 0;

  constructor(sampleRate, { density, tone, character }) {
    Object.assign(this, { sampleRate, density, tone, character });
    const size = WindChimes.voices * CHIME.length;
    this.phase = new Float64Array(size);
    this.increment = new Float64Array(size);
    this.amp = new Float64Array(size);
    this.decay = new Float64Array(size);
    this.count = new Int32Array(WindChimes.voices);
    this.gainL = new Float64Array(WindChimes.voices);
    this.gainR = new Float64Array(WindChimes.voices);
    this.attack = new Float64Array(WindChimes.voices);
    this.lastL = new Float64Array(WindChimes.voices);
    this.lastR = new Float64Array(WindChimes.voices);
    this.level = new Float64Array(WindChimes.voices);
    this.attackStep = 1 / (0.002 * sampleRate);
    this.declickFade = Math.exp(-1 / (0.005 * sampleRate));
  }

  render(frames, left, right) {
    let offset = 0;
    while (offset < frames) {
      if (this.samplesUntilEvent <= 0) {
        this.#trigger();
        this.samplesUntilEvent = Math.max(1, this.samplesUntilEvent + this.#interval());
      }
      const count = Math.min(frames - offset, this.samplesUntilEvent);
      this.#renderPool(count, left, right, offset);
      this.samplesUntilEvent -= count;
      offset += count;
    }
  }

  #interval() {
    const rate = (0.15 + 4 * this.density) * (0.25 + 1.5 * this.gust);
    return Math.trunc(-Math.log(Math.max(this.random.unit(), 0.0001)) / Math.max(rate, 0.001) * this.sampleRate);
  }

  #trigger() {
    this.gust = Math.min(1, Math.max(0, this.gust + this.random.bipolar() * 0.15));
    const degree = this.random.int(BRIGHT_MOOD.length * 2);
    const midi = scaleMidi(72 + ROOT, degree, BRIGHT_MOOD);
    this.#strike(frequency(midi), this.random.range(0.25, 0.9), this.random.range(-0.9, 0.9));
  }

  #freeVoice() {
    let quietest = 0;
    for (let v = 0; v < WindChimes.voices; v++) {
      if (this.count[v] === 0) return v;
      if (this.level[v] < this.level[quietest]) quietest = v;
    }
    return quietest;
  }

  #strike(f, velocity, pan) {
    const sr = this.sampleRate, v = this.#freeVoice();
    if (this.count[v] > 0) { this.declickL += this.lastL[v]; this.declickR += this.lastR[v]; }
    const base = v * CHIME.length, tilt = 0.5 + this.tone, sustain = 0.4 + 1.6 * this.character;
    let count = 0;
    CHIME.forEach(([ratio, amplitude, decay], index) => {
      const pf = f * ratio;
      if (pf >= sr * 0.45) return;
      this.phase[base + count] = 0;
      this.increment[base + count] = pf / sr;
      this.amp[base + count] = amplitude * velocity * Math.pow(tilt, index * 0.5);
      this.decay[base + count] = Math.pow(0.001, 1 / (decay * sustain * sr));
      count++;
    });
    const angle = (Math.min(Math.max(pan, -1), 1) + 1) * Math.PI / 4;
    this.gainL[v] = Math.cos(angle) * 0.35;
    this.gainR[v] = Math.sin(angle) * 0.35;
    this.attack[v] = 0;
    this.count[v] = count;
    this.level[v] = velocity;
  }

  #renderPool(frames, left, right, o) {
    const per = CHIME.length;
    for (let v = 0; v < WindChimes.voices; v++) {
      let count = this.count[v];
      if (count === 0) continue;
      const start = v * per, gl = this.gainL[v], gr = this.gainR[v];
      let envelope = this.attack[v], loudest = 0, outL = 0, outR = 0;
      for (let i = o; i < o + frames; i++) {
        let sample = 0;
        for (let p = start; p < start + count; p++) {
          sample += read(SINE, this.phase[p]) * this.amp[p];
          this.amp[p] *= this.decay[p];
          const next = this.phase[p] + this.increment[p];
          this.phase[p] = next >= 1 ? next - 1 : next;
        }
        envelope = Math.min(1, envelope + this.attackStep);
        sample *= envelope;
        outL = sample * gl; outR = sample * gr;
        left[i] += outL; right[i] += outR;
      }
      for (let p = start; p < start + count; p++) loudest = Math.max(loudest, this.amp[p]);
      while (count > 0 && this.amp[start + count - 1] < SILENCE) count--;
      this.attack[v] = envelope;
      this.lastL[v] = outL; this.lastR[v] = outR;
      this.level[v] = loudest;
      this.count[v] = loudest < SILENCE ? 0 : count;
    }
    // A reused voice fades out over a few milliseconds instead of stopping dead.
    if (Math.abs(this.declickL) > 1e-6 || Math.abs(this.declickR) > 1e-6) {
      for (let i = o; i < o + frames; i++) {
        left[i] += this.declickL; right[i] += this.declickR;
        this.declickL *= this.declickFade; this.declickR *= this.declickFade;
      }
    } else { this.declickL = 0; this.declickR = 0; }
  }
}

// MARK: - Mixing (Audio/LayerVoice.swift): volume and stereo width per layer.

// Layer settings of the preset: each sound's defaults (Models/SoundKind.swift), chimes thinned to 0.25.
const LAYERS = [
  { Generator: Ocean, volume: 0.7, width: 0.9, depth: 0.25, density: 0.4, tone: 0.5, character: 0.5 },
  { Generator: WarmPad, volume: 0.55, width: 0.8, depth: 0.5, density: 0.5, tone: 0.4, character: 0.5 },
  { Generator: WindChimes, volume: 0.5, width: 0.9, depth: 0.55, density: 0.25, tone: 0.6, character: 0.5 }
];

class CalmOceanProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.layers = LAYERS.map(layer => ({ ...layer, voice: new layer.Generator(sampleRate, layer) }));
  }

  process(_inputs, outputs) {
    this.layers.forEach((layer, index) => {
      const [left, right] = outputs[index];
      if (!left || !right) return;
      left.fill(0); right.fill(0);
      layer.voice.render(left.length, left, right);
      const { volume, width } = layer;
      let finite = 0;
      for (let i = 0; i < left.length; i++) {
        const mid = (left[i] + right[i]) * 0.5, side = (left[i] - right[i]) * 0.5 * width;
        left[i] = (mid + side) * volume;
        right[i] = (mid - side) * volume;
        finite += left[i] + right[i];
      }
      // A sound that went bad (NaN or infinity) restarts instead of silencing the whole mix.
      if (!Number.isFinite(finite)) { left.fill(0); right.fill(0); layer.voice = new layer.Generator(sampleRate, layer); }
    });
    return true;
  }
}

registerProcessor('calm-ocean', CalmOceanProcessor);

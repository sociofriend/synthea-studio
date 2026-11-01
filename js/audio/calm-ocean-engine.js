// Plays "Calm Ocean" from Aethéa: the generators run in an AudioWorklet, and this file builds the
// rest of the app's graph (Audio/SoundscapeEngine.swift): a reverb send per layer, the master level
// and a peak limiter. Starts on a tap (browsers require one), fades in and out, never loops.

const MASTER = 0.8;          // Composition.masterVolume
const DEPTHS = [0.25, 0.5, 0.55]; // each layer's reverb mix: Ocean Waves, Warm Pad, Wind Chimes
const FADE_IN = 2.5, FADE_OUT = 1.2;

export class CalmOceanEngine {
  #context = null;
  #fade = null;
  #ready = null;
  #suspendTimer = 0;
  #wantsPlay = false;
  onInterrupted = () => {};

  static get isSupported() { return 'AudioWorkletNode' in window; }

  async play() {
    this.#wantsPlay = true;
    clearTimeout(this.#suspendTimer);
    await (this.#ready ??= this.#build().catch(error => { this.#ready = null; throw error; }));
    if (!this.#wantsPlay) return; // paused while it was loading
    await this.#context.resume();
    this.#ramp(1, FADE_IN);
  }

  pause() {
    this.#wantsPlay = false;
    if (!this.#fade) return;
    this.#ramp(0, FADE_OUT);
    this.#suspendTimer = setTimeout(() => this.#context.suspend(), FADE_OUT * 1000 + 100);
  }

  #ramp(target, seconds) {
    const { currentTime } = this.#context, gain = this.#fade.gain;
    gain.cancelScheduledValues(currentTime);
    gain.setValueAtTime(gain.value, currentTime);
    gain.setTargetAtTime(target, currentTime, seconds / 4);
  }

  async #build() {
    // iOS: play through the silent switch, like music does.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* older Safari */ }
    const context = this.#context = new AudioContext({ latencyHint: 'playback' });
    this.#fade = new GainNode(context, { gain: 0 });
    (await makeCalmOcean(context)).connect(this.#fade).connect(context.destination);

    // A phone call or another app can stop the audio; report it so the button doesn't lie.
    context.addEventListener('statechange', () => {
      if (context.state === 'interrupted') this.onInterrupted();
    });
  }
}

// The mix of the three layers, ready to connect. Works with an OfflineAudioContext too (for rendering or tests).
export async function makeCalmOcean(context) {
  await context.audioWorklet.addModule(new URL('./calm-ocean-processor.js', import.meta.url));
  const source = new AudioWorkletNode(context, 'calm-ocean', {
    numberOfInputs: 0, numberOfOutputs: DEPTHS.length, outputChannelCount: DEPTHS.map(() => 2)
  });
  const bus = new GainNode(context, { gain: MASTER });
  const reverb = new ConvolverNode(context, { buffer: largeHall(context), disableNormalization: true });
  reverb.connect(bus);
  DEPTHS.forEach((depth, index) => {
    source.connect(new GainNode(context, { gain: 1 - depth }), index).connect(bus);
    source.connect(new GainNode(context, { gain: depth }), index).connect(reverb);
  });
  // Catches stray peaks only, like the app's peak limiter.
  const limiter = new DynamicsCompressorNode(context, { threshold: -1, knee: 0, ratio: 20, attack: 0.003, release: 0.25 });
  return bus.connect(limiter);
}

// A large, soft hall in place of AVAudioUnitReverb's .largeHall2: decorrelated stereo noise with a
// 3.2 s decay that darkens as it fades, scaled so the wet signal is about as loud as the dry one.
function largeHall(context) {
  const rate = context.sampleRate, seconds = 3.6, decay = 3.2, preDelay = Math.round(0.025 * rate);
  const length = Math.round(seconds * rate);
  const buffer = new AudioBuffer({ numberOfChannels: 2, length, sampleRate: rate });
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let seed = channel ? 0x2545F491 : 0x9E3779B9, low = 0, energy = 0;
    for (let i = preDelay; i < length; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      const white = ((seed >>> 0) / 4294967296) * 2 - 1;
      const t = (i - preDelay) / rate;
      const cutoff = 9000 * Math.exp(-t * 1.1) + 600;      // high frequencies die first
      low += (1 - Math.exp(-2 * Math.PI * cutoff / rate)) * (white - low);
      const fadeIn = Math.min(1, t / 0.04);
      data[i] = low * Math.exp(-6.9 * t / decay) * fadeIn;
      energy += data[i] * data[i];
    }
    const scale = 1 / Math.sqrt(energy);
    for (let i = 0; i < length; i++) data[i] *= scale;
  }
  return buffer;
}

import { Subject } from '../core/subject.js';

// The site's ambient sound: "Calm Ocean" from Aethéa. Publishes whether it is playing.
export class AmbienceViewModel {
  title = 'Calm Ocean';
  isPlaying = new Subject(false);

  constructor(engine) {
    this.engine = engine;
    engine.onInterrupted = () => this.isPlaying.send(false);
    this.#bindMediaSession();
  }

  toggle() { this.isPlaying.value ? this.pause() : this.play(); }

  play() {
    this.isPlaying.send(true);
    this.engine.play().catch(() => this.isPlaying.send(false));
  }

  pause() {
    this.isPlaying.send(false);
    this.engine.pause();
  }

  // Lock screen and media keys.
  #bindMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    this.isPlaying.sink(playing => {
      if (playing && !session.metadata) {
        session.metadata = new MediaMetadata({ title: this.title, artist: 'Aethéa', album: 'Synthéa',
          artwork: [{ src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
      }
      session.playbackState = playing ? 'playing' : 'paused';
    });
    session.setActionHandler('play', () => this.play());
    session.setActionHandler('pause', () => this.pause());
  }
}

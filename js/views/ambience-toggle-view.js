// The header sound switch: plays or pauses "Calm Ocean". Hidden where Web Audio worklets aren't available.
export class AmbienceToggleView {
  constructor({ button, label, ambience }) {
    button.hidden = false;
    button.addEventListener('click', () => ambience.toggle());
    ambience.isPlaying.sink(playing => {
      button.setAttribute('aria-pressed', String(playing));
      label.textContent = `${playing ? 'Pause' : 'Play'} ${ambience.title}, ambient sound from Aethéa`;
      button.title = `${playing ? 'Pause' : 'Play'} ${ambience.title}`;
    });
  }
}

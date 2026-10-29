// "Hear it": reads the name aloud with the device's speech engine, when there is one.
export class PronounceView {
  constructor({ button, pronunciation }) {
    if (!('speechSynthesis' in window)) return;
    button.hidden = false;
    button.setAttribute('aria-label', `Hear it: ${pronunciation.respelling}`);
    button.addEventListener('click', () => {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(pronunciation.spoken);
      u.lang = 'en-US'; u.rate = 0.82;
      const voice = speechSynthesis.getVoices().find(v => v.lang === 'en-US' && /female|samantha|zira|aria|jenny/i.test(v.name));
      if (voice) u.voice = voice;
      u.onstart = () => button.setAttribute('aria-busy', 'true');
      u.onend = u.onerror = () => button.removeAttribute('aria-busy');
      speechSynthesis.speak(u);
    });
  }
}

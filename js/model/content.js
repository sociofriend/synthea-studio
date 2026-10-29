// Content model: the data behind the interactive parts of the page.
// Static copy lives in index.html so the page reads fully without JavaScript.

export const contact = {
  // Set an address to turn the main call to action into an email link.
  email: '',
  github: 'https://github.com/sociofriend'
};

export const pronunciation = {
  spoken: 'sin THAY uh',   // what the speech engine reads aloud
  respelling: 'sin-THAY-uh',
  ipa: '/sɪnˈθeɪ.ə/'
};

export const swatches = [
  { name: 'Obsidian', hex: '#090B10', role: 'Primary ground. Depth and privacy.', group: 'foundation' },
  { name: 'Graphite', hex: '#171C26', role: 'Surfaces and interface.', group: 'foundation' },
  { name: 'Pearl Silver', hex: '#DCE3EC', role: 'Text and metal.', group: 'foundation' },
  { name: 'Soft White', hex: '#F6F7FB', role: 'Light-mode ground.', group: 'foundation' },
  { name: 'Icy Blue', hex: '#9CCBFF', role: 'Accent. Precision, digital light.', group: 'light' },
  { name: 'Ethereal Violet', hex: '#B8A7F8', role: 'Second accent. Intuition.', group: 'light' },
  { name: 'Nacre', hex: '#E8D5E3', role: 'Pearl sheen only, never a flat fill.', group: 'light' }
];

// One entry per kit version; each lives on its own branch of the identity repository.
export const versions = [
  {
    id: 'v1', label: 'v1', name: 'The Quiet Futurist', status: 'Shipped', branch: 'kit/v1-quiet-futurist',
    image: 'assets/img/evo-v1.webp', alt: 'Version 1: Synthéa wordmark beside a silver pearl on obsidian',
    text: 'The guidebook, translated directly: obsidian ground, a silver glass pearl, an icy rim of light and a neural filament inside.'
  },
  {
    id: 'v2', label: 'v2', name: 'A feminine note', status: 'Shipped', branch: 'kit/v2-feminine',
    image: 'assets/img/evo-v2.webp', alt: 'Version 2: the pearl with nacre iridescence and an italic serif tagline',
    text: 'A softer voice with the same precision. Nacre iridescence on the pearl, Cormorant italic for the editorial voice, filaments that bend.'
  },
  {
    id: 'v3', label: 'v3', name: 'The full guidebook', status: 'Shipped', branch: 'kit/v3-full-guidebook',
    image: 'assets/img/evo-v3.webp', alt: 'Version 3: three slides of the six principles carousel',
    text: 'All twelve chapters unfolded into the kit: origin, philosophy, personality, manifesto, personal code, plus carousel and story formats.'
  },
  {
    id: 'explore', label: 'Explore', name: 'Three directions', status: 'Explored', branch: 'explore/concepts-round-1',
    image: 'assets/img/evo-explore.webp', alt: 'Three concept avatars: Opaline, Waveform and Bloom Logic',
    text: 'Opaline, Waveform and Bloom Logic. Three images each, kept small on purpose, to test the edges of the concept before committing.'
  },
  {
    id: 'v4', label: 'v4', name: 'Opal Signal', status: 'Retired', branch: 'kit/v4-opal-signal',
    image: 'assets/img/evo-v4.webp', alt: 'Version 4: an iridescent opal orb with a Lissajous figure on ink plum',
    text: 'A bold mix of two directions, built out in full. It moved too far from who Synthéa is, so it was retired. It stays in the history, because it showed where the line was.'
  },
  {
    id: 'v5', label: 'v5', name: 'Pearl Signal', status: 'Current', branch: 'kit/v5-pearl-signal',
    image: 'assets/img/evo-v5.webp', alt: 'Version 5: the silver pearl with a quiet signal inside and an offset orbit',
    text: 'The synthesis. The original pearl and palette, with a soft opal sheen and a quiet signal inside that stands for thought in motion. A light appearance joins the obsidian one.'
  }
];

// Composition root: builds the view models and binds them to their views.
import { contact, pronunciation, swatches, versions } from './model/content.js';
import { AppearanceViewModel } from './viewmodels/appearance-view-model.js';
import { EvolutionViewModel } from './viewmodels/evolution-view-model.js';
import { ToastViewModel } from './viewmodels/toast-view-model.js';
import { HeroView } from './views/hero-view.js';
import { AppearanceToggleView } from './views/appearance-toggle-view.js';
import { PaletteView } from './views/palette-view.js';
import { ToastView } from './views/toast-view.js';
import { EvolutionView } from './views/evolution-view.js';
import { GalleryView } from './views/gallery-view.js';
import { PronounceView } from './views/pronounce-view.js';
import { ContactView } from './views/contact-view.js';

const $ = id => document.getElementById(id);

const appearance = new AppearanceViewModel();
const toast = new ToastViewModel();

new AppearanceToggleView({ button: $('appearanceToggle'), label: $('appearanceLabel'), appearance });
new HeroView({ ground: $('heroGround'), stage: $('heroStage'), appearance });
new PronounceView({ button: $('sayIt'), pronunciation });
new PaletteView({ root: $('swatches'), swatches, toast });
new ToastView({ el: $('toast'), toast });
new GalleryView({ root: $('gallery'), dialog: $('lightbox') });
new EvolutionView({ root: $('evolutionView'), viewModel: new EvolutionViewModel(versions) });
new ContactView({ primary: $('contactPrimary'), address: $('contactAddress'), contact });

// Installable and available offline once visited (GitHub Pages serves over HTTPS).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

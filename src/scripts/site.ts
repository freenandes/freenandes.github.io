/** Behaviour every page loads: print-to-PDF buttons and the reveal deferral. */

import { initReveal } from './reveal';

for (const button of document.querySelectorAll('.js-download-pdf')) {
  button.addEventListener('click', () => window.print());
}

initReveal();

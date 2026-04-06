/**
 * layout-slider-component.js
 *
 * Custom element for the layout-slider block. Extends Horizon's exported
 * Slideshow class — all keyboard navigation, autoplay, pause, accessibility,
 * and scroll-snap behaviour is inherited. This wrapper is intentionally thin.
 *
 * Required refs (validated at connect time):
 *   - scroller: the horizontal scroll container
 *   - slideshowContainer: the viewport wrapper
 *   - slides[]: individual slide wrappers (provided by _layout-slide children)
 *
 * Optional refs:
 *   - previous / next: arrow navigation buttons
 *   - dots[]: dot indicator buttons
 *
 * Settings are read from data attributes on the host element:
 *   - data-autoplay, data-autoplay-interval, data-pause-on-hover
 *   - data-slides-per-view-desktop, data-slides-per-view-mobile
 */

import { Slideshow } from '@theme/slideshow';

const REQUIRED_REFS = ['scroller'];

class LayoutSliderComponent extends Slideshow {
  connectedCallback() {
    // Runtime ref guard — surface missing refs early with a clear message
    for (const refName of REQUIRED_REFS) {
      if (!this.querySelector(`[ref="${refName}"]`)) {
        console.error(
          `[layout-slider-component] Missing required ref="${refName}". ` +
          `Ensure the markup includes an element with ref="${refName}". ` +
          `The slider will not function correctly without it.`
        );
      }
    }

    // Generate dot indicators if the navigation style includes dots
    this.#generateDots();

    super.connectedCallback();
  }

  /**
   * Generates dot indicator buttons based on the actual number of slides.
   * Called before super.connectedCallback() so that refs.dots is populated
   * when the Slideshow class initialises.
   */
  #generateDots() {
    const dotsContainer = this.querySelector('.layout-slider__dots');
    if (!dotsContainer) return;

    const slides = this.querySelectorAll('[ref="slides[]"]');
    if (!slides.length) return;

    // Clear any existing dots
    dotsContainer.innerHTML = '';

    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = 'layout-slider__dot';
      dot.setAttribute('ref', 'dots[]');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      dot.setAttribute('aria-label', `Slide ${index + 1} of ${slides.length}`);
      dot.setAttribute('on:click', `/select/${index}`);
      dotsContainer.appendChild(dot);
    });
  }
}

if (!customElements.get('layout-slider-component')) {
  customElements.define('layout-slider-component', LayoutSliderComponent);
}

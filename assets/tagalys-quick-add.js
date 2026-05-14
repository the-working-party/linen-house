import { morph } from '@theme/morph';

/**
 * Opens the native Horizon quick-add dialog for a Tagalys product tile.
 *
 * Tagalys tiles are not wrapped in `<product-card>`, so QuickAddComponent's
 * `productPageUrl` getter (which walks up to `closest('product-card')`) returns
 * empty and cannot be reused. This module replicates only the fetch → morph →
 * showDialog path, keeping the same modal and dialog that native cards use.
 *
 * Exposed as `window.tagalysOpenQuickAdd` so the synchronous non-module script
 * `tagalys-shared-templates.js` can call it from template click handlers.
 *
 * Cache is keyed by product URL and cleared on `cart:update` so availability
 * changes after add-to-cart are reflected on next open.
 */

/** @type {Map<string, Element>} */
const cache = new Map();

/** @type {AbortController | null} */
let activeController = null;

/**
 * @param {string} productUrl
 * @returns {Promise<void>}
 */
async function openTagalysQuickAdd(productUrl) {
  if (!productUrl) return;

  const dialog = /** @type {{ showDialog?: () => void } | null} */ (
    document.getElementById('quick-add-dialog')
  );
  const modalContent = document.getElementById('quick-add-modal-content');

  if (!dialog || !modalContent) return;

  // Abort any in-flight fetch for a previous tile
  activeController?.abort();
  activeController = new AbortController();

  let gridContent = cache.get(productUrl);

  if (!gridContent) {
    try {
      const response = await fetch(productUrl, { signal: activeController.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const found = /** @type {Element | null} */ (doc.querySelector('[data-product-grid-content]'));
      if (found) {
        gridContent = /** @type {Element} */ (found.cloneNode(true));
        cache.set(productUrl, gridContent);
      }
    } catch (err) {
      if (/** @type {Error} */ (err).name !== 'AbortError') {
        console.error('[tagalys-quick-add] fetch error:', err);
      }
      return;
    } finally {
      activeController = null;
    }
  }

  if (gridContent) {
    morph(modalContent, /** @type {Element} */ (gridContent.cloneNode(true)));
  }

  if (typeof dialog.showDialog === 'function') {
    dialog.showDialog();
  }
}

// Clear cache when cart updates so availability is re-fetched on next open
document.addEventListener('cart:update', () => cache.clear());

window.tagalysOpenQuickAdd = openTagalysQuickAdd;

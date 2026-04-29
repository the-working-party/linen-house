import { Component } from '@theme/component';

/**
 * <tagalys-predictive-search>
 *
 * Sibling component to Horizon's <predictive-search-component>. Initialises
 * `Tagalys.UIWidgets.ShopifySearchSuggestions` against the modal's search input
 * and renders results into the inner `[data-tagalys-predictive-mount]` div.
 *
 * Hijack-on-ready pattern: on init success, flips `data-search-provider="tagalys"`
 * on the search modal so the native predictive results hide via CSS. On init
 * failure or `data-init-timeout-ms` timeout (lazy, fires on first user input)
 * OR the connected-callback safety timeout (fires regardless of input so a
 * 404'd SDK does not strand the modal in `loading` forever), flips to
 * `data-search-provider="native"` and the native predictive flow resumes.
 *
 * The widget is initialised lazily on the first input event to avoid wasted
 * SDK work for users who never open the search modal.
 *
 * Tagalys SDK has no documented destroy() method, so initialisation runs once
 * per page lifetime; subsequent modal open/close cycles reuse the live widget.
 *
 * State machine on the search modal element via `data-search-provider`:
 *   "loading" → set in Liquid when tagalys + predictive both enabled (initial)
 *   "tagalys" → flipped on Tagalys SDK afterInitialRender callback
 *   "native"  → flipped on init failure, init timeout, or safety timeout
 *
 * The native predictive search handler (assets/predictive-search.js:283 #search)
 * bails when provider === "tagalys" || "loading" so only one provider drives
 * the dropdown at any time.
 */
class TagalysPredictiveSearch extends Component {
  #initStarted = false;
  #initFailed = false;
  #searchInput = null;
  #searchModal = null;
  #initTimeoutId = null;
  #safetyTimeoutId = null;
  #pollIntervalId = null;
  #boundInitOnFirstInput = null;

  connectedCallback() {
    super.connectedCallback();

    this.#searchModal = this.closest('.search-modal') || this.closest('dialog-component');
    if (!this.#searchModal) {
      this.#fallbackToNative('search-modal-not-found');
      return;
    }

    this.#searchModal.dataset.searchProvider ??= 'loading';

    const inputSelector = this.dataset.searchInputSelector || '#cmdk-input';
    this.#searchInput = document.querySelector(inputSelector);

    if (!this.#searchInput) {
      this.#fallbackToNative('search-input-not-found');
      return;
    }

    this.#boundInitOnFirstInput = this.#initOnFirstInput.bind(this);
    this.#searchInput.addEventListener('input', this.#boundInitOnFirstInput, { once: true });
    this.#searchInput.addEventListener('focus', this.#boundInitOnFirstInput, { once: true });

    // Safety timeout — fires regardless of whether the user types, so a 404'd
    // SDK does not leave the modal stranded in "loading" state with both
    // result panes hidden by the CSS gate. Doubles the input-driven timeout
    // since users may hover the modal open before typing.
    const safetyMs = (parseInt(this.dataset.initTimeoutMs, 10) || 2000) * 2;
    this.#safetyTimeoutId = setTimeout(() => {
      if (this.#searchModal?.dataset.searchProvider === 'tagalys') return;
      if (this.#initStarted) return;
      this.#fallbackToNative('safety-timeout-no-input');
    }, safetyMs);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    if (this.#initTimeoutId) clearTimeout(this.#initTimeoutId);
    if (this.#safetyTimeoutId) clearTimeout(this.#safetyTimeoutId);
    if (this.#pollIntervalId) clearInterval(this.#pollIntervalId);
    // Remove input listeners that may not have fired yet to avoid dangling
    // references holding the component instance after disconnect.
    if (this.#searchInput && this.#boundInitOnFirstInput) {
      this.#searchInput.removeEventListener('input', this.#boundInitOnFirstInput);
      this.#searchInput.removeEventListener('focus', this.#boundInitOnFirstInput);
    }
  }

  #initOnFirstInput() {
    if (this.#initStarted) return;
    this.#initStarted = true;

    // Safety timer no longer needed — input-driven timeout takes over.
    if (this.#safetyTimeoutId) {
      clearTimeout(this.#safetyTimeoutId);
      this.#safetyTimeoutId = null;
    }

    if (!window.whenTagalysReady) {
      this.#fallbackToNative('whenTagalysReady-missing');
      return;
    }

    const timeoutMs = parseInt(this.dataset.initTimeoutMs, 10) || 2000;
    this.#initTimeoutId = setTimeout(() => {
      if (!this.#searchModal || this.#searchModal.dataset.searchProvider === 'tagalys') return;
      this.#fallbackToNative('init-timeout');
    }, timeoutMs);

    this.#pollIntervalId = window.whenTagalysReady(() => this.#initWidget());
  }

  #initWidget() {
    if (this.#initFailed) return;

    const Tagalys = window.Tagalys;
    if (!Tagalys?.UIWidgets?.ShopifySearchSuggestions) {
      this.#fallbackToNative('widget-class-missing');
      return;
    }

    const minChars = parseInt(this.dataset.minChars, 10) || 2;
    const inputSelector = this.dataset.searchInputSelector || '#cmdk-input';
    const mountSelector = '[data-tagalys-predictive-mount]';
    const searchInput = this.#searchInput;
    const searchModal = this.#searchModal;
    const mount = this.querySelector(mountSelector);
    if (mount) mount.setAttribute('aria-busy', 'true');

    try {
      Tagalys.UIWidgets.ShopifySearchSuggestions.init(inputSelector, {
        templates: {
          widget: {
            options: {
              selector: mountSelector,
              alignToSelector: false,
              inheritAlignmentElementWidth: true,
              canBindSearchSubmitActionToNearestFormElement: false,
              minimumCharactersToShowSuggestions: minChars,
              onSearchSubmit(query) {
                const dialogComponent = searchModal?.closest('dialog-component') || searchModal;
                dialogComponent?.dispatchEvent?.(new CustomEvent('dialog:close'));
                window.location.href = `/search?q=${encodeURIComponent(query || searchInput.value || '')}`;
              },
            },
          },
        },
        searchResultsURL: '/search',
        callbacks: {
          afterInitialRender: () => {
            if (this.#initTimeoutId) clearTimeout(this.#initTimeoutId);
            if (this.#safetyTimeoutId) clearTimeout(this.#safetyTimeoutId);
            searchModal.dataset.searchProvider = 'tagalys';
            const m = this.querySelector(mountSelector);
            m?.setAttribute('aria-busy', 'false');
          },
          afterEveryRender: () => {
            const m = this.querySelector(mountSelector);
            m?.setAttribute('aria-busy', 'false');
          },
          beforeAPICall: (event) => {
            const m = this.querySelector(mountSelector);
            m?.setAttribute('aria-busy', 'true');
            return event;
          },
          onFailedAPICall: () => {
            this.#fallbackToNative('api-call-failed');
          },
        },
      });
    } catch (error) {
      this.#fallbackToNative(`init-threw: ${error?.message || 'unknown'}`);
    }
  }

  #fallbackToNative(reason) {
    if (this.#initFailed) return;
    this.#initFailed = true;
    if (this.#initTimeoutId) clearTimeout(this.#initTimeoutId);
    if (this.#safetyTimeoutId) clearTimeout(this.#safetyTimeoutId);
    if (this.#pollIntervalId) clearInterval(this.#pollIntervalId);
    if (this.#searchModal) {
      this.#searchModal.dataset.searchProvider = 'native';
    }
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[tagalys-predictive-search] falling back to native: ${reason}`);
    }
  }
}

if (!customElements.get('tagalys-predictive-search')) {
  customElements.define('tagalys-predictive-search', TagalysPredictiveSearch);
}

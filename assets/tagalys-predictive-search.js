import { Component } from "@theme/component";

/**
 * @typedef {Object} TagalysPredictiveSearchRefs
 * @property {HTMLDivElement} mount - The container element Tagalys's
 *   `ShopifySearchSuggestions` widget renders results into.
 */

/**
 * @typedef {Object} TagalysSDKCallbackPayload
 * @property {unknown} [response] - SDK-supplied response payload (opaque).
 */

/**
 * <tagalys-predictive-search>
 *
 * Sibling component to Horizon's <predictive-search-component>. Initialises
 * `Tagalys.UIWidgets.ShopifySearchSuggestions` against the modal's search input
 * and renders results into the inner [data-tagalys-predictive-mount] div
 * (also exposed as `this.refs.mount`).
 *
 * Hijack-on-ready pattern: on init success, flips
 * `data-search-provider="tagalys"` on the search modal so the native
 * predictive results hide via the CSS gate in
 * snippets/tagalys-predictive-search.liquid. On init failure or the
 * post-interaction init timeout (starts on first input/focus), flips to
 * `data-search-provider="native"` and the native predictive flow resumes via
 * assets/predictive-search.js.
 *
 * There is no idle/page-load timeout: a previous safety timer fired a few
 * seconds after connect even when search was never used, which switched to
 * native before the user opened the modal. Remaining edge case if the SDK
 * never loads and the user opens the modal but never focuses the input: the
 * modal can stay in `loading` until refresh (rare).
 *
 * The widget is initialised lazily on the first input or focus event to
 * avoid wasted SDK work for users who never open the search modal.
 *
 * State machine on the search modal element via `data-search-provider`:
 *   "loading" → set in Liquid when tagalys + predictive both enabled
 *   "tagalys" → flipped on Tagalys SDK afterInitialRender callback
 *   "native"  → flipped on init failure or init timeout (after first input)
 *
 * Tagalys SDK has no documented destroy() method, so initialisation runs
 * once per page lifetime; subsequent modal open/close cycles reuse the
 * live widget.
 *
 * @extends {Component<TagalysPredictiveSearchRefs>}
 */
class TagalysPredictiveSearch extends Component {
  /** @type {string[]} */
  requiredRefs = ["mount"];

  /** @type {boolean} */
  #initStarted = false;

  /** @type {boolean} */
  #initFailed = false;

  /** @type {HTMLInputElement | null} */
  #searchInput = null;

  /** @type {HTMLElement | null} */
  #searchModal = null;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #initTimeoutId = null;

  /** @type {ReturnType<typeof setInterval> | null} */
  #pollIntervalId = null;

  /** @type {((event: Event) => void) | null} */
  #boundInitOnFirstInput = null;

  /**
   * Locates the search modal and search input and registers lazy-init listeners.
   * @returns {void}
   */
  connectedCallback() {
    super.connectedCallback();

    this.#searchModal =
      this.closest(".search-modal") || this.closest("dialog-component");
    if (!this.#searchModal) {
      this.#fallbackToNative("search-modal-not-found");
      return;
    }

    this.#searchModal.dataset.searchProvider ??= "loading";

    const inputSelector =
      this.dataset.searchInputSelector ||
      "#search-modal input[data-tagalys-modal-search-input]";
    this.#searchInput = /** @type {HTMLInputElement | null} */ (
      document.querySelector(inputSelector)
    );

    if (!this.#searchInput) {
      this.#fallbackToNative("search-input-not-found");
      return;
    }

    this.#boundInitOnFirstInput = this.#initOnFirstInput.bind(this);
    this.#searchInput.addEventListener("input", this.#boundInitOnFirstInput, {
      once: true,
    });
    this.#searchInput.addEventListener("focus", this.#boundInitOnFirstInput, {
      once: true,
    });
  }

  /**
   * Clears all pending timers/intervals and removes lazy-init listeners.
   * @returns {void}
   */
  disconnectedCallback() {
    super.disconnectedCallback?.();
    if (this.#initTimeoutId) clearTimeout(this.#initTimeoutId);
    if (this.#pollIntervalId) clearInterval(this.#pollIntervalId);

    if (this.#searchInput && this.#boundInitOnFirstInput) {
      this.#searchInput.removeEventListener(
        "input",
        this.#boundInitOnFirstInput,
      );
      this.#searchInput.removeEventListener(
        "focus",
        this.#boundInitOnFirstInput,
      );
    }
  }

  /**
   * Lazy-init handler invoked once on first input or focus. Schedules the
   * SDK init via Tagalys's whenTagalysReady polling helper.
   * @returns {void}
   */
  #initOnFirstInput = () => {
    if (this.#initStarted) return;
    this.#initStarted = true;

    if (typeof window.whenTagalysReady !== "function") {
      this.#fallbackToNative("whenTagalysReady-missing");
      return;
    }

    const timeoutMs = parseInt(this.dataset.initTimeoutMs, 10) || 2000;
    this.#initTimeoutId = setTimeout(() => {
      if (
        !this.#searchModal ||
        this.#searchModal.dataset.searchProvider === "tagalys"
      )
        return;
      this.#fallbackToNative("init-timeout");
    }, timeoutMs);

    this.#pollIntervalId = window.whenTagalysReady(() => this.#initWidget());
  };

  /**
   * Initialises Tagalys.UIWidgets.ShopifySearchSuggestions on the host
   * search input. Wires lifecycle callbacks that flip the search modal's
   * provider state and update aria-busy on the mount.
   * @returns {void}
   */
  #initWidget() {
    if (this.#initFailed) return;

    const Tagalys = window.Tagalys;
    if (!Tagalys?.UIWidgets?.ShopifySearchSuggestions) {
      this.#fallbackToNative("widget-class-missing");
      return;
    }

    const minChars = parseInt(this.dataset.minChars, 10) || 2;
    const inputSelector =
      this.dataset.searchInputSelector ||
      "#search-modal input[data-tagalys-modal-search-input]";
    const mountSelector = "[data-tagalys-predictive-mount]";
    const searchInput = this.#searchInput;
    const searchModal = this.#searchModal;
    const mount = this.refs.mount;

    if (mount) mount.setAttribute("aria-busy", "true");

    try {
      const result = Tagalys.UIWidgets.ShopifySearchSuggestions.init(inputSelector, {
        templates: {
          widget: {
            options: {
              selector: mountSelector,
              alignToSelector: false,
              inheritAlignmentElementWidth: true,
              canBindSearchSubmitActionToNearestFormElement: false,
              minimumCharactersToShowSuggestions: minChars,
              /**
               * Closes the modal and navigates to the search results page.
               * @param {string} query - The submitted search query.
               * @returns {void}
               */
              onSearchSubmit(query) {
                const dialogComponent =
                  searchModal?.closest("dialog-component") || searchModal;
                dialogComponent?.dispatchEvent?.(
                  new CustomEvent("dialog:close"),
                );
                window.location.href = `/search?q=${encodeURIComponent(query || searchInput?.value || "")}`;
              },
            },
          },
        },
        searchResultsURL: "/search",
        callbacks: {
          afterInitialRender: () => {
            if (this.#initTimeoutId) clearTimeout(this.#initTimeoutId);
            if (searchModal) searchModal.dataset.searchProvider = "tagalys";
            this.refs.mount?.setAttribute("aria-busy", "false");
          },
          afterEveryRender: () => {
            this.refs.mount?.setAttribute("aria-busy", "false");
            /* Prefer afterInitialRender for the provider flip; some SDK paths
             render suggestions without firing it — unblock CSS gates anyway. */
            if (
              searchModal &&
              searchModal.dataset.searchProvider === "loading"
            ) {
              searchModal.dataset.searchProvider = "tagalys";
            }
          },
          /**
           * @param {TagalysSDKCallbackPayload} event - SDK pre-API-call event payload.
           * @returns {TagalysSDKCallbackPayload}
           */
          beforeAPICall: (event) => {
            this.refs.mount?.setAttribute("aria-busy", "true");
            return event;
          },
          onFailedAPICall: () => {
            this.#fallbackToNative("api-call-failed");
          },
        },
      });
      /* Drop "loading" immediately so native pane is removed from layout
         (visibility:hidden still reserved space) and modal overflow fixes apply. */
      if (searchModal) searchModal.dataset.searchProvider = "tagalys";

      // SDK may return a Promise — catch async rejections so they don't go unhandled
      if (result && typeof result.then === "function") {
        result.catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          this.#fallbackToNative(`init-promise-rejected: ${message}`);
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      this.#fallbackToNative(`init-threw: ${message}`);
    }
  }

  /**
   * Tears down all pending init work and flips the search modal's provider
   * state to `native`, which causes the native predictive flow to resume.
   * Idempotent — subsequent calls are no-ops.
   * @param {string} reason - Short identifier for logging.
   * @returns {void}
   */
  #fallbackToNative(reason) {
    if (this.#initFailed) return;
    this.#initFailed = true;
    if (this.#initTimeoutId) clearTimeout(this.#initTimeoutId);
    if (this.#pollIntervalId) clearInterval(this.#pollIntervalId);
    if (this.#searchModal) {
      this.#searchModal.dataset.searchProvider = "native";
    }
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        `[tagalys-predictive-search] falling back to native: ${reason}`,
      );
    }
  }
}

if (!customElements.get("tagalys-predictive-search")) {
  customElements.define("tagalys-predictive-search", TagalysPredictiveSearch);
}

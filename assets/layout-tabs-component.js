/**
 * layout-tabs-component.js
 *
 * A tabbed content layout primitive implementing the WAI-ARIA Authoring
 * Practices tabs pattern (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
 *
 * Extends Horizon's Component base class. Tab trigger buttons are
 * generated at runtime from child panel elements (ref="panels[]") so
 * the Liquid template only needs to render panels — the JS handles the
 * full ARIA contract including roving tabindex, keyboard navigation,
 * and mobile breakpoint mode switching (scroll / accordion / dropdown).
 *
 * Source: extension-layouts v0.1
 * Licence: proprietary — The Working Party
 */

import { Component } from '@theme/component';
import { mediaQueryLarge } from '@theme/utilities';

/**
 * Generate a unique ID for ARIA relationships.
 * @param {string} prefix
 * @param {number} index
 * @returns {string}
 */
function generateId(prefix, index) {
  return `${prefix}-${index}`;
}

/**
 * @typedef {'desktop' | 'scroll' | 'accordion' | 'dropdown'} ActiveMode
 */

export class LayoutTabsComponent extends Component {
  requiredRefs = ['tablist', 'panels'];

  /** @type {HTMLButtonElement[]} */
  #tabButtons = [];

  /** @type {number} */
  #activeIndex = 0;

  /** @type {ActiveMode} */
  #currentMode = 'desktop';

  /** @type {AbortController | null} */
  #controller = null;

  /** @type {HTMLButtonElement[]} Accordion disclosure buttons (mobile) */
  #accordionButtons = [];

  /** @type {HTMLSelectElement | null} Dropdown select (mobile) */
  #selectElement = null;

  // ── Getters for data attributes ───────────────────────────────────

  get #tabStyle() {
    return this.dataset.tabStyle || 'underline';
  }

  get #tabAlignment() {
    return this.dataset.tabAlignment || 'start';
  }

  get #mobileBehaviour() {
    return this.dataset.mobileBehaviour || 'scroll';
  }

  get #defaultTabIndex() {
    const val = parseInt(this.dataset.defaultTabIndex || '0', 10);
    return isNaN(val) ? 0 : val;
  }

  get #rememberLastTab() {
    return this.dataset.rememberLastTab === 'true';
  }

  get #storageKey() {
    return `layout-tabs-${this.id}`;
  }

  /** @returns {HTMLElement[]} */
  get #panels() {
    const panels = this.refs.panels;
    if (!panels) return [];
    return Array.isArray(panels) ? panels : [panels];
  }

  /** @returns {HTMLElement} */
  get #tablist() {
    return /** @type {HTMLElement} */ (this.refs.tablist);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  connectedCallback() {
    super.connectedCallback();

    // Runtime ref guard
    if (!this.refs.tablist) {
      console.error('LayoutTabsComponent: required ref "tablist" not found.');
      return;
    }

    this.#controller = new AbortController();

    // Determine initial active tab
    this.#activeIndex = this.#resolveInitialTab();

    // Build the desktop tabs UI
    this.#buildTabButtons();
    this.#wireAria();
    this.#selectTab(this.#activeIndex);

    // Set current mode based on viewport
    this.#applyMode(mediaQueryLarge.matches ? 'desktop' : this.#mobileBehaviour);

    // Listen for breakpoint changes
    mediaQueryLarge.addEventListener('change', this.#handleBreakpointChange, {
      signal: this.#controller.signal,
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.#controller) {
      this.#controller.abort();
      this.#controller = null;
    }

    this.#cleanupTabButtons();
    this.#cleanupMobileUI();
  }

  updatedCallback() {
    super.updatedCallback();

    // Re-enumerate panels (tabs may have been added/removed in the editor)
    this.#cleanupTabButtons();
    this.#cleanupMobileUI();
    this.#buildTabButtons();
    this.#wireAria();

    // Clamp active index
    const panels = this.#panels;
    if (this.#activeIndex >= panels.length) {
      this.#activeIndex = Math.max(0, panels.length - 1);
    }

    this.#selectTab(this.#activeIndex);
    this.#applyMode(this.#currentMode);
  }

  // ── Tab building ──────────────────────────────────────────────────

  /**
   * Create tab buttons from panel labels and inject into the tablist.
   */
  #buildTabButtons() {
    const panels = this.#panels;
    const tablist = this.#tablist;
    if (!tablist || panels.length === 0) return;

    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-orientation', 'horizontal');

    this.#tabButtons = [];

    const idPrefix = this.id || `layout-tabs-${Date.now()}`;

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const label = panel.dataset.tabLabel || `Tab ${i + 1}`;

      const button = document.createElement('button');
      button.setAttribute('role', 'tab');
      button.setAttribute('type', 'button');
      button.id = generateId(`${idPrefix}-tab`, i);
      button.textContent = label;

      // Event listeners via AbortController
      button.addEventListener('click', () => this.#handleTabClick(i), {
        signal: this.#controller?.signal,
      });
      button.addEventListener('keydown', (e) => this.#handleTabKeydown(e, i), {
        signal: this.#controller?.signal,
      });

      tablist.appendChild(button);
      this.#tabButtons.push(button);
    }
  }

  /**
   * Wire ARIA attributes between tab buttons and panels.
   */
  #wireAria() {
    const panels = this.#panels;
    const idPrefix = this.id || `layout-tabs-${Date.now()}`;

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const tab = this.#tabButtons[i];
      if (!tab || !panel) continue;

      const tabId = generateId(`${idPrefix}-tab`, i);
      const panelId = generateId(`${idPrefix}-panel`, i);

      tab.id = tabId;
      tab.setAttribute('aria-controls', panelId);

      panel.id = panelId;
      panel.setAttribute('aria-labelledby', tabId);
    }
  }

  /**
   * Remove injected tab buttons.
   */
  #cleanupTabButtons() {
    for (const btn of this.#tabButtons) {
      btn.remove();
    }
    this.#tabButtons = [];
  }

  // ── Tab selection ─────────────────────────────────────────────────

  /**
   * Activate a tab by index.
   * @param {number} index
   */
  #selectTab(index) {
    const panels = this.#panels;
    if (panels.length === 0) return;

    // Clamp to valid range
    if (index < 0 || index >= panels.length) {
      index = 0;
    }

    this.#activeIndex = index;

    // Update tab buttons
    for (let i = 0; i < this.#tabButtons.length; i++) {
      const tab = this.#tabButtons[i];
      const isActive = i === index;
      tab.setAttribute('aria-selected', String(isActive));
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    }

    // Update panels — use the hidden attribute (not display:none)
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      if (i === index) {
        panel.removeAttribute('hidden');
        panel.hidden = false;
      } else {
        panel.setAttribute('hidden', '');
        panel.hidden = true;
      }
    }

    // Update accordion buttons if in accordion mode
    for (let i = 0; i < this.#accordionButtons.length; i++) {
      this.#accordionButtons[i].setAttribute('aria-expanded', String(i === index));
    }

    // Update select if in dropdown mode
    if (this.#selectElement && this.#selectElement.selectedIndex !== index) {
      this.#selectElement.selectedIndex = index;
    }

    // Persist to localStorage if enabled
    if (this.#rememberLastTab && this.id) {
      try {
        localStorage.setItem(this.#storageKey, String(index));
      } catch {
        // localStorage may be unavailable — fail silently
      }
    }
  }

  /**
   * Resolve which tab should be active on initial mount.
   * @returns {number}
   */
  #resolveInitialTab() {
    const panels = this.#panels;
    if (panels.length === 0) return 0;

    // Check localStorage first (if enabled)
    if (this.#rememberLastTab && this.id) {
      try {
        const stored = localStorage.getItem(this.#storageKey);
        if (stored !== null) {
          const storedIndex = parseInt(stored, 10);
          if (!isNaN(storedIndex) && storedIndex >= 0 && storedIndex < panels.length) {
            return storedIndex;
          }
        }
      } catch {
        // localStorage may be unavailable
      }
    }

    // Fall back to data-default-tab-index
    const defaultIndex = this.#defaultTabIndex;
    if (defaultIndex >= 0 && defaultIndex < panels.length) {
      return defaultIndex;
    }

    return 0;
  }

  // ── Event handlers ────────────────────────────────────────────────

  /**
   * Handle click on a tab button.
   * @param {number} index
   */
  #handleTabClick(index) {
    this.#selectTab(index);
    this.#tabButtons[index]?.focus();
  }

  /**
   * Handle keyboard navigation on tab buttons.
   * Per WAI-ARIA APG: arrows move focus, Enter/Space activates.
   * @param {KeyboardEvent} event
   * @param {number} currentIndex
   */
  #handleTabKeydown(event, currentIndex) {
    const count = this.#tabButtons.length;
    if (count === 0) return;

    let targetIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        targetIndex = (currentIndex + 1) % count;
        this.#tabButtons[targetIndex].focus();
        return;

      case 'ArrowLeft':
        event.preventDefault();
        targetIndex = (currentIndex - 1 + count) % count;
        this.#tabButtons[targetIndex].focus();
        return;

      case 'Home':
        event.preventDefault();
        this.#tabButtons[0].focus();
        return;

      case 'End':
        event.preventDefault();
        this.#tabButtons[count - 1].focus();
        return;

      case 'Enter':
      case ' ':
        event.preventDefault();
        this.#selectTab(currentIndex);
        return;

      default:
        return;
    }
  }

  // ── Mobile breakpoint switching ───────────────────────────────────

  /**
   * Handle the mediaQueryLarge change event.
   * @param {MediaQueryListEvent} event
   */
  #handleBreakpointChange = (event) => {
    if (event.matches) {
      // Crossed to desktop
      this.#applyMode('desktop');
    } else {
      // Crossed to mobile
      this.#applyMode(this.#mobileBehaviour);
    }
  };

  /**
   * Apply the given UI mode (desktop, scroll, accordion, dropdown).
   * @param {ActiveMode} mode
   */
  #applyMode(mode) {
    // Clean up previous mobile UI before switching
    if (this.#currentMode !== mode) {
      this.#cleanupMobileUI();
    }

    this.#currentMode = mode;

    const tablist = this.#tablist;
    if (!tablist) return;

    switch (mode) {
      case 'desktop':
      case 'scroll':
        // Desktop and scroll mode both use the standard tablist
        tablist.hidden = false;
        tablist.setAttribute('role', 'tablist');
        // Show tab buttons
        for (const btn of this.#tabButtons) {
          btn.hidden = false;
        }
        // Re-select to ensure panels are correct
        this.#selectTab(this.#activeIndex);
        break;

      case 'accordion':
        this.#enterAccordionMode();
        break;

      case 'dropdown':
        this.#enterDropdownMode();
        break;
    }
  }

  /**
   * Enter accordion mode — convert ARIA from tablist+tab+tabpanel to
   * disclosure buttons. This is NOT just a visual restyle; the ARIA
   * pattern must change as per the spec's accessibility notes.
   */
  #enterAccordionMode() {
    const tablist = this.#tablist;
    const panels = this.#panels;

    // Hide the tablist
    tablist.hidden = true;
    tablist.removeAttribute('role');

    // Create a disclosure button before each panel
    this.#accordionButtons = [];

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const label = panel.dataset.tabLabel || `Tab ${i + 1}`;
      const isActive = i === this.#activeIndex;

      const button = document.createElement('button');
      button.setAttribute('type', 'button');
      button.setAttribute('aria-expanded', String(isActive));
      button.setAttribute('aria-controls', panel.id);
      button.classList.add('layout-tabs-accordion-trigger');
      button.textContent = label;

      button.addEventListener('click', () => {
        const wasActive = this.#activeIndex === i;
        if (!wasActive) {
          this.#selectTab(i);
        }
      }, { signal: this.#controller?.signal });

      // Insert the button before the panel
      panel.parentNode?.insertBefore(button, panel);
      this.#accordionButtons.push(button);

      // In accordion mode, panels keep their tabpanel role removed
      // and use plain visibility instead
      panel.removeAttribute('role');
      panel.removeAttribute('aria-labelledby');
    }

    // Re-apply visibility
    this.#selectTab(this.#activeIndex);
  }

  /**
   * Enter dropdown mode — replace the tablist with a <select> element.
   */
  #enterDropdownMode() {
    const tablist = this.#tablist;
    const panels = this.#panels;

    // Hide the tablist
    tablist.hidden = true;
    tablist.removeAttribute('role');

    // Create a select element
    const select = document.createElement('select');
    select.classList.add('layout-tabs-dropdown');
    select.setAttribute('aria-label', 'Tab selection');

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const label = panel.dataset.tabLabel || `Tab ${i + 1}`;
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = label;
      if (i === this.#activeIndex) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      const index = parseInt(select.value, 10);
      if (!isNaN(index)) {
        this.#selectTab(index);
      }
    }, { signal: this.#controller?.signal });

    // Insert select after tablist
    tablist.parentNode?.insertBefore(select, tablist.nextSibling);
    this.#selectElement = select;

    // Re-apply visibility
    this.#selectTab(this.#activeIndex);
  }

  /**
   * Clean up mobile-specific UI elements.
   */
  #cleanupMobileUI() {
    // Remove accordion buttons
    for (const btn of this.#accordionButtons) {
      btn.remove();
    }
    this.#accordionButtons = [];

    // Remove dropdown select
    if (this.#selectElement) {
      this.#selectElement.remove();
      this.#selectElement = null;
    }

    // Restore tablist role and panel ARIA attributes
    const tablist = this.#tablist;
    if (tablist) {
      tablist.hidden = false;
      tablist.setAttribute('role', 'tablist');
      tablist.setAttribute('aria-orientation', 'horizontal');
    }

    // Restore panel ARIA attributes
    const panels = this.#panels;
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      panel.setAttribute('role', 'tabpanel');
      if (this.#tabButtons[i]) {
        panel.setAttribute('aria-labelledby', this.#tabButtons[i].id);
      }
    }
  }
}

// Register the custom element
if (!customElements.get('layout-tabs-component')) {
  customElements.define('layout-tabs-component', LayoutTabsComponent);
}

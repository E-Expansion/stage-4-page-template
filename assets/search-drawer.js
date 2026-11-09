import { DialogComponent } from '@theme/dialog';
import { sectionRenderer } from '@theme/section-renderer';
import { debounce } from '@theme/utilities';
// Results contain product rows whose swatches need the product tile component
import '@theme/product-tile';

/** Shortest query that is sent to predictive search. */
const MIN_QUERY_LENGTH = 2;

/** Results per resource type (Shopify's maximum is 10). */
const RESULTS_LIMIT = '10';

/**
 * Search drawer: a dialog that slides in from the right with live search results.
 *
 * Opens when an input with [data-search-drawer-trigger] (the header search fields) gets
 * focus, carrying over what was typed there. While typing it fetches
 * sections/search-drawer-results.liquid through the Section Rendering API from Shopify's
 * predictive search, and keeps the chosen tab (products, collections, blog posts) across
 * searches. Submitting the form goes to the full search page.
 *
 * @typedef {object} Refs
 * @property {HTMLDialogElement} dialog - The drawer.
 * @property {HTMLInputElement} input - The search field.
 * @property {HTMLButtonElement} [clear] - Clears the search field.
 * @property {HTMLElement} results - Holds the rendered results.
 */
class SearchDrawerComponent extends DialogComponent {
  requiredRefs = ['dialog', 'input', 'results'];

  /** @type {AbortController | null} */
  #controller = null;

  /** Query of the results that are shown (or being fetched). */
  #terms = '';

  /** Tab the shopper picked; the first tab with results when unset or empty. */
  #tab = '';

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('focusin', this.#handleTriggerFocus);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('focusin', this.#handleTriggerFocus);
    this.#controller?.abort();
  }

  /**
   * Opens the drawer from a header search field.
   *
   * @param {FocusEvent} event
   */
  #handleTriggerFocus = (event) => {
    const trigger = event.target;
    if (!(trigger instanceof HTMLInputElement) || !trigger.matches('[data-search-drawer-trigger]')) return;

    // Leave the trigger first, so closing the dialog does not hand focus back to it and reopen it
    trigger.blur();
    this.open(trigger.value);
  };

  /**
   * Opens the drawer, optionally with a query, and focuses the search field.
   *
   * @param {string} [query]
   */
  open(query = '') {
    const { input } = this.refs;
    if (query && query !== input.value) input.value = query;

    this.showDialog();

    // showDialog opens on the next frame; focus once the dialog is shown
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      });
    });

    this.#update();
  }

  /**
   * Runs a search while typing.
   */
  search = debounce(() => this.#update(), 200);

  /**
   * Empties the search field and the results.
   */
  clear() {
    this.refs.input.value = '';
    this.#update();
    this.refs.input.focus();
  }

  /**
   * Shows the panel of the tab that was clicked.
   *
   * @param {Event} event
   */
  selectTab(event) {
    const tab = /** @type {HTMLElement | null} */ (event.target instanceof Element ? event.target.closest('[data-tab]') : null);
    if (!tab?.dataset.tab) return;

    this.#tab = tab.dataset.tab;
    this.#showTab();
  }

  /**
   * Fetches results for the current query, unless they are already shown.
   */
  async #update() {
    const { input, clear, results } = this.refs;
    const terms = input.value.trim();
    if (clear) clear.hidden = terms === '';

    if (terms === this.#terms) return;
    this.#terms = terms;
    this.#controller?.abort();

    if (terms.length < MIN_QUERY_LENGTH) {
      this.#controller = null;
      this.removeAttribute('loading');
      results.replaceChildren();
      return;
    }

    const controller = new AbortController();
    this.#controller = controller;
    this.setAttribute('loading', '');

    const url = new URL(Theme.routes.predictive_search_url, location.origin);
    url.searchParams.set('q', terms);
    url.searchParams.set('resources[type]', 'product,collection,article');
    url.searchParams.set('resources[limit]', RESULTS_LIMIT);
    url.searchParams.set('resources[limit_scope]', 'each');
    url.searchParams.set('resources[options][prefix]', 'last');

    try {
      const html = await sectionRenderer.getSectionHTML(this.dataset.sectionId ?? '', true, url, controller.signal);
      if (controller.signal.aborted) return;

      const content = new DOMParser().parseFromString(html, 'text/html').querySelector('.search-drawer-results');
      results.replaceChildren(...(content ? Array.from(content.childNodes) : []));
      results.scrollTop = 0;
      this.#showTab();
    } catch (error) {
      if (controller.signal.aborted) return;
      // Allow the same query to be retried, e.g. after a network error
      this.#terms = '';
      console.error(error);
    } finally {
      if (this.#controller === controller) this.removeAttribute('loading');
    }
  }

  /**
   * Marks the chosen tab and shows its panel; falls back to the first tab with results.
   */
  #showTab() {
    const { results } = this.refs;
    const tabs = Array.from(results.querySelectorAll('[data-tab]'));
    if (tabs.length === 0) return;

    const active = tabs.find((tab) => tab instanceof HTMLElement && tab.dataset.tab === this.#tab) ?? tabs[0];
    const activeName = active instanceof HTMLElement ? active.dataset.tab : '';

    for (const tab of tabs) {
      tab.setAttribute('aria-pressed', String(tab === active));
    }

    for (const panel of results.querySelectorAll('[data-panel]')) {
      if (panel instanceof HTMLElement) panel.hidden = panel.dataset.panel !== activeName;
    }
  }
}

if (!customElements.get('search-drawer-component')) {
  customElements.define('search-drawer-component', SearchDrawerComponent);
}

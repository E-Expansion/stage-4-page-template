import { Component } from '@theme/component';
import { formatMoney } from '@theme/money-formatting';
import { lockScroll, mediaQueryLarge, unlockScroll } from '@theme/utilities';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])';

/**
 * Collection products: submits the filter form on change (desktop), runs the mobile filter
 * panel and the price slider, and appends the next page for "Load more" on mobile.
 * Filters, sorting and pagination are plain links and GET forms, so the page also works
 * without this script.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} [panel] - Filter panel (card on desktop, side panel on mobile).
 * @property {HTMLFormElement} [form] - Filter form.
 * @property {HTMLButtonElement} [filterButton] - Mobile button that opens the panel.
 * @property {HTMLElement} [grid] - Product grid.
 * @property {HTMLAnchorElement} [loadMore] - Mobile "Load more" link to the next page.
 *
 * @extends {Component<Refs>}
 */
class CollectionFiltersComponent extends Component {
  /** @type {AbortController | undefined} */
  #abortController;

  get isPanelOpen() {
    return this.hasAttribute('data-filters-open');
  }

  connectedCallback() {
    super.connectedCallback();

    // Desktop hides the apply button once filters submit on change
    this.setAttribute('data-enhanced', '');

    this.#abortController = new AbortController();
    const { signal } = this.#abortController;
    document.addEventListener('keydown', this.#handleKeydown, { signal });
    mediaQueryLarge.addEventListener('change', this.#handleBreakpointChange, { signal });
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#abortController?.abort();
    unlockScroll(this);
  }

  /**
   * Submits the form when a filter changes on desktop. On mobile the panel's apply button
   * submits, so shoppers can pick several filters first.
   */
  handleChange() {
    if (!mediaQueryLarge.matches) return;
    this.refs.form?.requestSubmit();
  }

  /**
   * Leaves the price filter out of the URL while the slider covers the full range.
   */
  handleSubmit() {
    const inputs = this.refs.form?.querySelectorAll('.price-range__input') ?? [];

    for (const input of inputs) {
      if (!(input instanceof HTMLInputElement)) continue;

      const atBound = input.dataset.bound === 'min' ? input.value === input.min : input.value === input.max;
      if (atBound) input.disabled = true;
    }
  }

  /**
   * Applies a new sort order, keeping the active filters.
   *
   * @param {Event} event
   */
  handleSortChange(event) {
    const { form } = this.refs;
    if (form) {
      form.requestSubmit();
      return;
    }

    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;

    const url = new URL(window.location.href);
    url.searchParams.set('sort_by', select.value);
    url.searchParams.delete('page');
    window.location.assign(url.toString());
  }

  /**
   * Keeps the two price thumbs from crossing and updates the track fill and labels.
   *
   * @param {Event} event
   */
  updatePriceRange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const range = input.closest('.price-range');
    if (!(range instanceof HTMLElement)) return;

    const minInput = range.querySelector('[data-bound="min"]');
    const maxInput = range.querySelector('[data-bound="max"]');
    if (!(minInput instanceof HTMLInputElement) || !(maxInput instanceof HTMLInputElement)) return;

    if (Number(minInput.value) > Number(maxInput.value)) {
      if (input === minInput) minInput.value = maxInput.value;
      else maxInput.value = minInput.value;
    }

    const max = Number(maxInput.max) || 1;
    minInput.toggleAttribute('data-raised', Number(minInput.value) > max / 2);
    range.style.setProperty('--price-range-start', `${(Number(minInput.value) / max) * 100}%`);
    range.style.setProperty('--price-range-end', `${(Number(maxInput.value) / max) * 100}%`);

    const format = this.dataset.moneyFormat ?? '';
    const currency = this.dataset.currency ?? '';
    const minLabel = range.querySelector('[data-price-label="min"]');
    const maxLabel = range.querySelector('[data-price-label="max"]');
    if (minLabel) minLabel.textContent = this.#formatWhole(minInput.value, format, currency);
    if (maxLabel) maxLabel.textContent = this.#formatWhole(maxInput.value, format, currency);
  }

  /**
   * Opens the mobile filter panel.
   */
  openFilters() {
    const { panel, filterButton } = this.refs;
    if (!panel || this.isPanelOpen) return;

    this.setAttribute('data-filters-open', '');
    filterButton?.setAttribute('aria-expanded', 'true');
    lockScroll(this);

    const firstFocusable = panel.querySelector(FOCUSABLE_SELECTOR);
    if (firstFocusable instanceof HTMLElement) firstFocusable.focus();
  }

  /**
   * Closes the mobile filter panel and returns focus to its button.
   */
  closeFilters() {
    if (!this.isPanelOpen) return;

    this.removeAttribute('data-filters-open');
    this.refs.filterButton?.setAttribute('aria-expanded', 'false');
    unlockScroll(this);
    this.refs.filterButton?.focus();
  }

  /**
   * Appends the next page of products to the grid instead of navigating.
   *
   * @param {MouseEvent} event
   */
  async loadMore(event) {
    const { grid, loadMore } = this.refs;
    if (!grid || !loadMore) return;

    event.preventDefault();
    if (loadMore.getAttribute('aria-busy') === 'true') return;

    loadMore.setAttribute('aria-busy', 'true');

    try {
      const url = new URL(loadMore.href);
      url.searchParams.set('section_id', this.dataset.sectionId ?? '');

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Failed to load ${url}`);

      const html = new DOMParser().parseFromString(await response.text(), 'text/html');
      const nextGrid = html.querySelector('[data-collection-grid]');
      const tiles = [...(nextGrid?.querySelectorAll(':scope > .product-tile') ?? [])].map((tile) =>
        document.importNode(tile, true)
      );
      grid.append(...tiles);

      this.#syncPagination(html);

      // Move focus to the first new product so keyboard users continue where they were
      const firstLink = tiles[0]?.querySelector('a');
      if (firstLink instanceof HTMLElement) firstLink.focus({ preventScroll: true });
    } catch (error) {
      console.error(error);
      window.location.assign(loadMore.href);
    } finally {
      loadMore.removeAttribute('aria-busy');
    }
  }

  /**
   * Copies the progress text, bar and next link from a fetched page.
   *
   * @param {Document} html
   */
  #syncPagination(html) {
    const progressText = this.querySelector('[data-progress-text]');
    const nextProgressText = html.querySelector('[data-progress-text]');
    if (progressText && nextProgressText) progressText.textContent = nextProgressText.textContent;

    const progressBar = this.querySelector('[data-progress-bar]');
    const nextProgressBar = html.querySelector('[data-progress-bar]');
    if (progressBar instanceof HTMLElement && nextProgressBar instanceof HTMLElement) {
      progressBar.style.width = nextProgressBar.style.width;
    }

    const { loadMore } = this.refs;
    const nextLoadMore = html.querySelector('[data-load-more]');
    if (!loadMore) return;

    if (nextLoadMore instanceof HTMLAnchorElement) {
      loadMore.href = nextLoadMore.href;
    } else {
      loadMore.remove();
    }
  }

  /**
   * @param {string} value - Whole currency units
   * @param {string} format - The shop's money format
   * @param {string} currency - ISO currency code
   */
  #formatWhole(value, format, currency) {
    const formatted = formatMoney(Number(value) * 100, format, currency);
    return formatted.replace(/[.,]00(?=\D*$)/, '');
  }

  /** @param {KeyboardEvent} event */
  #handleKeydown = (event) => {
    if (event.key === 'Escape' && this.isPanelOpen) this.closeFilters();
  };

  #handleBreakpointChange = () => {
    if (mediaQueryLarge.matches) this.closeFilters();
  };
}

if (!customElements.get('collection-filters-component')) {
  customElements.define('collection-filters-component', CollectionFiltersComponent);
}

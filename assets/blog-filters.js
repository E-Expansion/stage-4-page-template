import { Component } from '@theme/component';

/**
 * Blog listing: sorts the articles and reveals them in batches. Shopify cannot sort a
 * blog, so the section renders every article and this component decides which show.
 * Without this script all articles show in Shopify's order.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} [grid] - Article list.
 * @property {HTMLElement} [count] - "Showing 1–6 of 44" text, with its template in data-template.
 * @property {HTMLElement} [pagination] - Progress bar and "Load more".
 * @property {HTMLElement} [progressBar] - Fill of the progress bar.
 *
 * @extends {Component<Refs>}
 */
class BlogFiltersComponent extends Component {
  /** Articles in Shopify's order, newest first. @type {HTMLElement[]} */
  #articles = [];
  #shown = 0;

  get #pageSize() {
    return Number(this.dataset.pageSize) || 6;
  }

  connectedCallback() {
    super.connectedCallback();

    const items = this.refs.grid?.children ?? [];
    this.#articles = [...items].filter((item) => item instanceof HTMLElement);
    this.#shown = this.#pageSize;
  }

  /**
   * Re-sorts all articles and goes back to the first batch.
   *
   * @param {Event} event
   */
  handleSortChange(event) {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement) || !this.refs.grid) return;

    this.refs.grid.append(...this.#sorted(select.value));
    this.refs.grid.scrollTo({ left: 0 });
    this.#shown = this.#pageSize;
    this.#update();
  }

  /**
   * Reveals the next batch and moves focus to its first article, because the button
   * goes away after the last batch.
   */
  showMore() {
    const firstNew = this.refs.grid?.children[this.#shown];
    this.#shown += this.#pageSize;
    this.#update();
    firstNew?.querySelector('a')?.focus();
  }

  /**
   * @param {string} order - 'recent', 'oldest' or 'title'
   * @returns {HTMLElement[]}
   */
  #sorted(order) {
    const articles = [...this.#articles];

    if (order === 'oldest') {
      return articles.sort((a, b) => Number(a.dataset.published) - Number(b.dataset.published));
    }

    if (order === 'title') {
      const locale = document.documentElement.lang || undefined;
      return articles.sort((a, b) => (a.dataset.title ?? '').localeCompare(b.dataset.title ?? '', locale));
    }

    return articles;
  }

  #update() {
    const { grid, count, pagination, progressBar } = this.refs;
    if (!grid) return;

    const total = grid.children.length;
    const shown = Math.min(this.#shown, total);

    for (const [index, item] of [...grid.children].entries()) {
      if (item instanceof HTMLElement) item.hidden = index >= shown;
    }

    if (count?.dataset.template) count.innerHTML = count.dataset.template.replace('__END__', String(shown));
    if (progressBar) progressBar.style.width = `${(shown / total) * 100}%`;
    if (pagination) pagination.style.display = shown < total ? '' : 'none';
  }
}

if (!customElements.get('blog-filters-component')) {
  customElements.define('blog-filters-component', BlogFiltersComponent);
}

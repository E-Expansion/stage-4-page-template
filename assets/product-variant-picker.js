import { Component } from '@theme/component';
import { morph } from '@theme/morph';

/**
 * Product page option picker. Choosing a value fetches the product section for the new
 * selection and morphs the information column, so stock, price, options and the buy
 * button all come from Liquid. Then it updates the URL and moves the gallery to the
 * variant's image.
 *
 * @typedef {object} Refs
 * @property {HTMLDialogElement} [guideDialog] - Size guide dialog.
 *
 * @extends {Component<Refs>}
 */
class ProductVariantPickerComponent extends Component {
  /** @type {AbortController | undefined} */
  #requestController;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('change', this.#handleChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('change', this.#handleChange);
    this.#requestController?.abort();
  }

  openGuide() {
    this.refs.guideDialog?.showModal();
  }

  closeGuide() {
    this.refs.guideDialog?.close();
  }

  /**
   * Closes the guide when its backdrop is clicked.
   *
   * @param {MouseEvent} event
   */
  handleGuideClick(event) {
    if (event.target === this.refs.guideDialog) this.closeGuide();
  }

  /** @param {Event} event */
  #handleChange = (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'radio') return;

    const optionValueIds = Array.from(this.querySelectorAll('input[type="radio"]:checked'), (input) =>
      input instanceof HTMLInputElement ? input.dataset.optionValueId : ''
    ).filter(Boolean);

    this.#render(optionValueIds);
  };

  /** @param {(string | undefined)[]} optionValueIds */
  async #render(optionValueIds) {
    const { productUrl, sectionId } = this.dataset;
    const column = this.closest('.product-main__info');
    if (!productUrl || !sectionId || !column) return;

    this.#requestController?.abort();
    this.#requestController = new AbortController();
    this.setAttribute('aria-busy', 'true');

    const url = new URL(productUrl, window.location.origin);
    url.searchParams.set('option_values', optionValueIds.join(','));
    url.searchParams.set('section_id', sectionId);

    try {
      const response = await fetch(url, { signal: this.#requestController.signal });
      const html = new DOMParser().parseFromString(await response.text(), 'text/html');
      const nextColumn = html.querySelector('.product-main__info');
      if (!nextColumn) return;

      morph(column, nextColumn);

      // The morph may have replaced this element; read the new state from the column
      const picker = column.querySelector('product-variant-picker-component');
      if (!(picker instanceof HTMLElement)) return;

      const { variantId, mediaId } = picker.dataset;
      this.#updateUrl(variantId);
      if (mediaId) this.#showMedia(column, mediaId);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error(error);
    } finally {
      this.removeAttribute('aria-busy');
    }
  }

  /** @param {string | undefined} variantId */
  #updateUrl(variantId) {
    const url = new URL(window.location.href);
    if (variantId) url.searchParams.set('variant', variantId);
    else url.searchParams.delete('variant');
    history.replaceState(history.state, '', url);
  }

  /**
   * @param {Element} column - The information column
   * @param {string} mediaId
   */
  #showMedia(column, mediaId) {
    const gallery = column.closest('.product-main')?.querySelector('product-gallery-component');
    if (gallery && 'showMedia' in gallery && typeof gallery.showMedia === 'function') gallery.showMedia(mediaId);
  }
}

if (!customElements.get('product-variant-picker-component')) {
  customElements.define('product-variant-picker-component', ProductVariantPickerComponent);
}

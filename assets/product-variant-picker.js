import { Component } from '@theme/component';
import { currentSelection, refreshProductInfo } from '@theme/product-info';

/**
 * Product page option picker. Choosing a value re-renders the information column for the
 * new variant, keeping the chosen purchase type; also opens the size guide dialog.
 *
 * @typedef {object} Refs
 * @property {HTMLDialogElement} [guideDialog] - Size guide dialog.
 *
 * @extends {Component<Refs>}
 */
class ProductVariantPickerComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('change', this.#handleChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('change', this.#handleChange);
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

    const optionValues = Array.from(this.querySelectorAll('input[type="radio"]:checked'), (input) =>
      input instanceof HTMLInputElement ? input.dataset.optionValueId ?? '' : ''
    ).filter(Boolean);

    refreshProductInfo(this, { optionValues, sellingPlanId: currentSelection(this).sellingPlanId });
  };
}

if (!customElements.get('product-variant-picker-component')) {
  customElements.define('product-variant-picker-component', ProductVariantPickerComponent);
}

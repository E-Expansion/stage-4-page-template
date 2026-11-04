import { Component } from '@theme/component';
import { currentSelection, refreshProductInfo } from '@theme/product-info';

/**
 * One-time purchase / subscription switch on the product page. Each tab and the delivery
 * frequency select carry a selling plan ID (empty for one-time); choosing one re-renders
 * the information column so price and buy button show the subscription price.
 *
 * @extends {Component}
 */
class ProductPurchaseOptionsComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('change', this.#handleChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('change', this.#handleChange);
  }

  /** @param {Event} event */
  #handleChange = (event) => {
    const { target } = event;
    let sellingPlanId = '';

    if (target instanceof HTMLSelectElement) sellingPlanId = target.value;
    else if (target instanceof HTMLInputElement && target.type === 'radio') sellingPlanId = target.value;
    else return;

    refreshProductInfo(this, { variantId: currentSelection(this).variantId, sellingPlanId });
  };
}

if (!customElements.get('product-purchase-options-component')) {
  customElements.define('product-purchase-options-component', ProductPurchaseOptionsComponent);
}

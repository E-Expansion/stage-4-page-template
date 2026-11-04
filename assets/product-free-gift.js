import { Component } from '@theme/component';
import { formatMoney } from '@theme/money-formatting';
import { StandardEvents } from '@shopify/events';

/**
 * Free gift progress card. Re-reads the cart total whenever the cart changes and updates
 * the remaining amount, the percentage and the progress bar.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} [amount] - Remaining amount in the message.
 * @property {HTMLElement} [percent] - Percentage label.
 * @property {HTMLElement} bar - Progress bar.
 *
 * @extends {Component<Refs>}
 */
class ProductFreeGiftComponent extends Component {
  requiredRefs = ['bar'];

  /** @type {AbortController | undefined} */
  #abortController;

  connectedCallback() {
    super.connectedCallback();

    this.#abortController = new AbortController();
    document.addEventListener(StandardEvents.cartLinesUpdate, this.#handleCartUpdate, {
      signal: this.#abortController.signal,
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController?.abort();
  }

  /** @param {Event} event */
  #handleCartUpdate = (event) => {
    // The event carries a promise that settles once the cart request is done
    const promise = 'promise' in event && event.promise instanceof Promise ? event.promise : Promise.resolve();
    promise
      .catch(() => {})
      .then(() => fetch(`${Theme.routes.cart_url}.js`, { headers: { Accept: 'application/json' } }))
      .then((response) => response.json())
      .then((cart) => this.#render(Number(cart.total_price) || 0))
      .catch((error) => console.error(error));
  };

  /** @param {number} total - Cart total in minor units */
  #render(total) {
    const threshold = Number(this.dataset.threshold) || 0;
    if (threshold <= 0) return;

    const remaining = Math.max(threshold - total, 0);
    const percent = Math.min(Math.floor((total * 100) / threshold), 100);
    const { moneyFormat = '{{amount}}', currency = '' } = this.dataset;

    if (this.refs.amount) this.refs.amount.textContent = formatMoney(remaining, moneyFormat, currency);
    if (this.refs.percent) this.refs.percent.textContent = `${percent}%`;
    this.refs.bar.style.setProperty('--free-gift-progress', `${percent}%`);
    this.refs.bar.setAttribute('aria-valuenow', String(percent));
    this.classList.toggle('free-gift--reached', remaining === 0);
  }
}

if (!customElements.get('product-free-gift-component')) {
  customElements.define('product-free-gift-component', ProductFreeGiftComponent);
}

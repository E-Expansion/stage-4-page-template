import { Component } from '@theme/component';
import { StandardEvents, CartLinesUpdateEvent } from '@shopify/events';
import { fetchConfig } from '@theme/utilities';

/**
 * Gift wrap option on the product page. Listens for the cart add of this section's buy form
 * (the same event the cart drawer and the cart notification use, so it covers the buy button
 * and the sticky buy bar). When the checkbox is ticked and that add succeeded, it adds the
 * gift wrap product, with the note as a line item property, and dispatches a cart update so
 * the cart drawer and the cart count follow.
 *
 * @typedef {object} Refs
 * @property {HTMLInputElement} checkbox - The gift wrap checkbox.
 * @property {HTMLTextAreaElement} [note] - The handwritten note.
 *
 * @extends {Component<Refs>}
 */
class ProductGiftWrapComponent extends Component {
  requiredRefs = ['checkbox'];

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(StandardEvents.cartLinesUpdate, this.#handleCartLinesUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(StandardEvents.cartLinesUpdate, this.#handleCartLinesUpdate);
  }

  /**
   * @param {import('@shopify/events').CartLinesUpdateEvent} event
   */
  #handleCartLinesUpdate = (event) => {
    if (event.action !== 'add' || !this.refs.checkbox.checked) return;

    // Only the add from this section's buy form, not quick add, bundles or our own update.
    // Compare elements, not form.id: the product form has an input named "id", which
    // shadows form.id and returns that input instead of the form's ID.
    const source = event.target;
    const form = this.dataset.formId ? document.getElementById(this.dataset.formId) : null;
    if (!form || !(source instanceof Node) || !source.contains(form)) return;

    event.promise
      ?.then(({ detail }) => {
        if (!detail || detail.didError) return;
        return this.#addGiftWrap();
      })
      .catch((error) => console.error('[gift-wrap]', error));
  };

  async #addGiftWrap() {
    const { variantId, noteProperty = 'Note' } = this.dataset;
    if (!variantId) return;

    const note = this.refs.note?.value.trim();
    /** @type {Record<string, string>} */
    const properties = note ? { [noteProperty]: note } : {};

    const sectionIds = Array.from(document.querySelectorAll('cart-items-component'))
      .map((element) => (element instanceof HTMLElement ? element.dataset.sectionId : ''))
      .filter(Boolean);

    const deferred = CartLinesUpdateEvent.createPromise();
    // 'update', not 'add', so the "added to cart" notification keeps showing the product itself
    this.dispatchEvent(
      new CartLinesUpdateEvent({
        action: 'update',
        context: 'product',
        // An 'update' expects cart line IDs, which the new line doesn't have until the add returns
        lines: [],
        promise: deferred.promise,
      })
    );

    try {
      const body = JSON.stringify({
        items: [{ id: Number(variantId), quantity: 1, properties }],
        sections: sectionIds.join(','),
        sections_url: window.location.pathname,
      });
      const response = await fetch(Theme.routes.cart_add_url, fetchConfig('json', { body }));
      const result = await response.json();
      if (!response.ok || result.status) {
        throw new Error(`Gift wrap could not be added (${response.status}): ${result.description ?? result.message ?? ''}`);
      }

      // The add response has the added items and sections, but not the whole cart
      const cart = await (await fetch(`${Theme.routes.cart_url}.js`, { headers: { Accept: 'application/json' } })).json();

      deferred.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
        detail: {
          sections: result.sections,
          items: cart.items,
          itemCount: cart.item_count,
          source: 'product-gift-wrap',
          didError: false,
        },
      });
    } catch (error) {
      deferred.reject(error);
      throw error;
    }
  }
}

if (!customElements.get('product-gift-wrap-component')) {
  customElements.define('product-gift-wrap-component', ProductGiftWrapComponent);
}

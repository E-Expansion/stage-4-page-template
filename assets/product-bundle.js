import { Component } from '@theme/component';
import { morph } from '@theme/morph';
import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';

/**
 * "Frequently bought together": adds every product in the bundle to the cart in one request
 * and announces it like the product form does, so the cart drawer opens and re-renders.
 * Follows the product's variant: after the information column re-renders, the bundle
 * re-renders for the variant in the URL.
 *
 * @typedef {object} Refs
 * @property {HTMLButtonElement} [addButton]
 * @property {HTMLElement} [status] - Screen reader status.
 *
 * @extends {Component<Refs>}
 */
class ProductBundleComponent extends Component {
  /** @type {AbortController | undefined} */
  #abortController;

  /** @type {AbortController | undefined} */
  #renderController;

  connectedCallback() {
    super.connectedCallback();
    this.#abortController = new AbortController();
    document.addEventListener('product-info:render', this.#rerender, { signal: this.#abortController.signal });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController?.abort();
    this.#renderController?.abort();
  }

  async addAll() {
    const button = this.refs.addButton;
    const ids = (button?.dataset.items ?? '').split(',').filter(Boolean);
    if (!button || ids.length === 0) return;

    const items = ids.map((id) => ({ id: Number(id), quantity: 1 }));
    const sections = Array.from(document.querySelectorAll('cart-items-component'), (element) =>
      element instanceof HTMLElement ? element.dataset.sectionId : ''
    ).filter(Boolean);

    const deferred = CartLinesUpdateEvent.createPromise();
    this.dispatchEvent(
      new CartLinesUpdateEvent({
        action: 'add',
        context: 'product',
        lines: items.map((item) => ({ merchandiseId: String(item.id), quantity: 1 })),
        promise: deferred.promise,
      })
    );

    button.disabled = true;
    this.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(Theme.routes.cart_add_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items, sections: sections.join(',') }),
      });
      const result = await response.json();
      const cart = await fetch(`${Theme.routes.cart_url}.js`, { headers: { Accept: 'application/json' } }).then(
        (cartResponse) => cartResponse.json()
      );

      if (result.status) {
        this.dispatchEvent(
          new CartErrorEvent({ error: result.message || 'Add to cart failed', code: 'INVALID' })
        );
        if (this.refs.status) this.refs.status.textContent = result.message ?? '';
      } else if (this.refs.status) {
        this.refs.status.textContent = Theme.translations.added ?? '';
      }

      deferred.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
        detail: {
          didError: Boolean(result.status),
          items: cart.items,
          source: 'product-bundle-component',
          itemCount: items.length,
          sections: result.sections,
        },
      });
    } catch (error) {
      deferred.reject(error);
      console.error(error);
    } finally {
      button.disabled = false;
      this.removeAttribute('aria-busy');
    }
  }

  /** Re-renders the bundle for the variant now in the URL. */
  #rerender = async () => {
    const content = this.querySelector('[data-bundle-content][id]');
    const { sectionId } = this.dataset;
    if (!content || !sectionId) return;

    this.#renderController?.abort();
    this.#renderController = new AbortController();

    const url = new URL(window.location.href);
    url.searchParams.set('section_id', sectionId);

    try {
      const response = await fetch(url, { signal: this.#renderController.signal });
      const html = new DOMParser().parseFromString(await response.text(), 'text/html');
      const nextContent = html.getElementById(content.id);
      if (nextContent) morph(content, nextContent);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error(error);
    }
  };
}

if (!customElements.get('product-bundle-component')) {
  customElements.define('product-bundle-component', ProductBundleComponent);
}

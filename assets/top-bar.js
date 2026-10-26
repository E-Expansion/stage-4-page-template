import { Component } from '@theme/component';
import { sectionRenderer } from '@theme/section-renderer';
import { StandardEvents } from '@shopify/events';

/**
 * Re-renders the top bar when the cart changes so the free shipping
 * message reflects the new cart total (money is formatted server-side).
 *
 * @extends {Component}
 */
class TopBarComponent extends Component {
  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(StandardEvents.cartLinesUpdate, this.onCartUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(StandardEvents.cartLinesUpdate, this.onCartUpdate);
  }

  /**
   * Handles the cart update event.
   * @param {import('@shopify/events').CartLinesUpdateEvent} event - The cart update event.
   */
  onCartUpdate = (event) => {
    const { sectionId } = this.dataset;
    if (!sectionId) return;

    Promise.resolve(event.promise)
      .then(() => sectionRenderer.renderSection(sectionId, { cache: false }))
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[top-bar] Cart update failed:', error);
      });
  };
}

if (!customElements.get('top-bar-component')) {
  customElements.define('top-bar-component', TopBarComponent);
}

import { Component } from '@theme/component';
import { StandardEvents } from '@shopify/events';
import { onAnimationEnd } from '@theme/utilities';

/** How long the notification stays visible. */
const DISPLAY_DURATION = 5000;

/**
 * "Added to cart" notification at the top right of the page
 * (snippets/cart-notification.liquid).
 *
 * Listens for the theme's cart add event, so it works for every add-to-cart form. It is a
 * manual popover, so it sits in the top layer above the page; while a modal dialog is open
 * (e.g. the search drawer) it moves into that dialog, because everything outside an open
 * modal is inert and could not be clicked.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} panel - The popover.
 * @property {HTMLElement} status - Live region that announces the add.
 * @property {HTMLImageElement} image - Item image.
 * @property {HTMLElement} title - Product title.
 * @property {HTMLElement} variant - Variant title.
 *
 * @extends {Component<Refs>}
 */
class CartNotificationComponent extends Component {
  requiredRefs = ['panel', 'status', 'image', 'title', 'variant'];

  /** @type {number | undefined} */
  #timer;

  /** Where the component lives when no modal dialog is open. */
  #home = /** @type {ParentNode | null} */ (null);

  connectedCallback() {
    super.connectedCallback();
    this.#home ??= this.parentNode;
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
    if (event.action !== 'add') return;

    const variantId = String(event.lines?.[0]?.merchandiseId ?? '');

    event.promise
      ?.then(({ detail }) => {
        if (!detail || detail.didError) return;

        /** @type {any[]} */
        const items = detail.items ?? [];
        const item = items.find((line) => String(line.variant_id) === variantId) ?? items[0];
        if (!item) return;

        // Wait a frame so a cart drawer that auto-opens for this add has opened; it already shows the item
        requestAnimationFrame(() => {
          if (document.querySelector('#cart-drawer[open]')) return;
          this.#show(item);
        });
      })
      .catch(() => {
        // Failed adds are reported by the product form itself
      });
  };

  /**
   * Fills in the item and shows the notification.
   *
   * @param {any} item - Line item from the Ajax cart.
   */
  #show(item) {
    const { panel, status, image, title, variant } = this.refs;

    const imageUrl = item.image ?? item.featured_image?.url;
    if (imageUrl) {
      const url = new URL(imageUrl, location.origin);
      url.searchParams.set('width', '160');
      image.src = url.toString();
      image.hidden = false;
    } else {
      image.hidden = true;
    }

    title.textContent = item.product_title ?? item.title ?? '';
    variant.textContent = item.product_has_only_default_variant ? '' : item.variant_title ?? '';
    status.textContent = `${panel.querySelector('.cart-notification__heading')?.textContent?.trim() ?? ''}: ${title.textContent}`;

    // Inside an open modal dialog the popover must be a descendant of it to stay clickable
    const modal = document.querySelector('dialog:modal');
    if (modal) {
      if (this.parentNode !== modal) {
        modal.append(this);
        modal.addEventListener('close', this.#returnHome, { once: true });
      }
    } else {
      this.#returnHome();
    }

    panel.classList.remove('cart-notification--closing');
    if (panel.matches(':popover-open')) panel.hidePopover();
    panel.showPopover();
    this.resume();
  }

  /**
   * Hides the notification.
   */
  hide = async () => {
    const { panel } = this.refs;
    window.clearTimeout(this.#timer);
    if (!panel.matches(':popover-open')) return;

    panel.classList.add('cart-notification--closing');
    await onAnimationEnd(panel, undefined, { subtree: false });
    if (!panel.classList.contains('cart-notification--closing')) return; // shown again meanwhile

    panel.hidePopover();
    panel.classList.remove('cart-notification--closing');
    this.#returnHome();
  };

  /**
   * Moves the component back out of a dialog (e.g. when that dialog closes), keeping the
   * notification visible if it was.
   */
  #returnHome = () => {
    if (!this.#home || this.parentNode === this.#home) return;

    const { panel } = this.refs;
    const wasOpen = panel.matches(':popover-open');
    this.#home.append(this); // moving it hides the popover
    if (wasOpen && !panel.classList.contains('cart-notification--closing')) panel.showPopover();
  };

  /**
   * Keeps the notification open while the pointer is on it.
   */
  pause() {
    window.clearTimeout(this.#timer);
  }

  /**
   * Starts the countdown to hiding.
   */
  resume() {
    window.clearTimeout(this.#timer);
    this.#timer = window.setTimeout(this.hide, DISPLAY_DURATION);
  }

  /**
   * Opens the cart drawer instead of the cart page when the store uses one.
   *
   * @param {MouseEvent} event
   */
  openCart(event) {
    const cartDrawer = /** @type {(HTMLElement & { open?: () => void }) | null} */ (document.getElementById('cart-drawer'));
    if (!cartDrawer?.open) return;

    event.preventDefault();

    // Close an open modal dialog first (e.g. the search drawer), so the cart drawer is usable
    const modal = document.querySelector('dialog:modal');
    let owner = modal?.parentElement ?? null;
    while (owner && !('closeDialog' in owner)) owner = owner.parentElement;
    const closeDialog = /** @type {{ closeDialog?: () => unknown } | null} */ (owner)?.closeDialog;
    if (typeof closeDialog === 'function') closeDialog();

    this.hide();
    cartDrawer.open();
  }
}

if (!customElements.get('cart-notification-component')) {
  customElements.define('cart-notification-component', CartNotificationComponent);
}

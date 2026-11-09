import { Component } from '@theme/component';
import { StandardEvents, CartLinesUpdateEvent } from '@shopify/events';
import { debounce, fetchConfig, onAnimationEnd } from '@theme/utilities';

/** How long the notification stays visible. */
const DISPLAY_DURATION = 5000;

/**
 * "Added to cart" notification at the top right of the page
 * (snippets/cart-notification.liquid).
 *
 * Listens for the theme's cart add event, so it works for every add-to-cart form. The
 * stepper and remove button change that cart line through /cart/change and dispatch the
 * same cart update event as the cart drawer, so the cart count and the drawer follow.
 *
 * It is a manual popover, so it sits in the top layer above the page; while a modal dialog
 * is open (e.g. the search drawer) it moves into that dialog, because everything outside
 * an open modal is inert and could not be clicked.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} panel - The popover.
 * @property {HTMLElement} status - Live region that announces the add.
 * @property {HTMLImageElement} image - Item image.
 * @property {HTMLElement} title - Product title.
 * @property {HTMLElement} variant - Variant title.
 * @property {HTMLInputElement} quantity - Quantity of the cart line.
 * @property {HTMLButtonElement} decrease - Lowers the quantity (disabled at 1).
 *
 * @extends {Component<Refs>}
 */
class CartNotificationComponent extends Component {
  requiredRefs = ['panel', 'status', 'image', 'title', 'variant', 'quantity', 'decrease'];

  /** @type {number | undefined} */
  #timer;

  /** Where the component lives when no modal dialog is open. */
  #home = /** @type {ParentNode | null} */ (null);

  /**
   * The cart line shown, from the Ajax cart.
   * @type {{ key: string, quantity: number } | null}
   */
  #line = null;

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
    this.#setLine(item);
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
   * Remembers the cart line and shows its quantity.
   *
   * @param {{ key: string, quantity: number }} line
   */
  #setLine(line) {
    this.#line = { key: line.key, quantity: line.quantity };
    this.refs.quantity.value = String(line.quantity);
    this.refs.decrease.disabled = line.quantity <= 1;
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
   * Keeps the notification open while the pointer or focus is on it.
   */
  pause() {
    window.clearTimeout(this.#timer);
  }

  /**
   * Starts the countdown to hiding, unless the shopper is still using the notification.
   */
  resume() {
    window.clearTimeout(this.#timer);
    const { panel } = this.refs;
    if (panel.matches(':hover') || panel.contains(document.activeElement)) return;
    this.#timer = window.setTimeout(this.hide, DISPLAY_DURATION);
  }

  /**
   * Raises the quantity by one.
   */
  increase() {
    this.#stepTo(this.#currentValue() + 1);
  }

  /**
   * Lowers the quantity by one, down to 1 (the remove button takes it out).
   */
  decrease() {
    this.#stepTo(Math.max(1, this.#currentValue() - 1));
  }

  /**
   * Applies a typed quantity; 0 removes the line.
   */
  setQuantity() {
    const value = Math.max(0, Math.floor(Number(this.refs.quantity.value) || 0));
    this.#stepTo(value, true);
  }

  /**
   * Takes the line out of the cart. Not named `remove`, which would shadow Element.remove().
   */
  removeLine() {
    this.#changeLine(0);
  }

  /** @returns {number} */
  #currentValue() {
    return Math.max(1, Math.floor(Number(this.refs.quantity.value) || this.#line?.quantity || 1));
  }

  /**
   * Shows the new quantity at once and sends it after a short pause, so quick clicks on
   * +/- become one request.
   *
   * @param {number} quantity
   * @param {boolean} [immediate]
   */
  #stepTo(quantity, immediate = false) {
    this.refs.quantity.value = String(quantity);
    this.refs.decrease.disabled = quantity <= 1;
    this.pause();

    if (immediate) {
      this.#sendQuantity.cancel?.();
      this.#changeLine(quantity);
    } else {
      this.#sendQuantity();
    }
  }

  #sendQuantity = debounce(() => {
    this.#changeLine(this.#currentValue());
  }, 350);

  /**
   * Changes the cart line and tells the rest of the theme (cart count, cart drawer).
   *
   * @param {number} quantity - New quantity; 0 removes the line.
   */
  async #changeLine(quantity) {
    const line = this.#line;
    if (!line || quantity === line.quantity) return;

    const sectionIds = Array.from(document.querySelectorAll('cart-items-component'))
      .map((element) => (element instanceof HTMLElement ? element.dataset.sectionId : ''))
      .filter(Boolean);

    const deferred = CartLinesUpdateEvent.createPromise();
    this.dispatchEvent(
      new CartLinesUpdateEvent({
        action: quantity > 0 ? 'update' : 'remove',
        context: 'cart',
        lines: [{ id: line.key, quantity }],
        promise: deferred.promise,
      })
    );

    this.setAttribute('busy', '');

    try {
      const body = JSON.stringify({
        id: line.key,
        quantity,
        sections: sectionIds.join(','),
        sections_url: window.location.pathname,
      });
      const response = await fetch(Theme.routes.cart_change_url, fetchConfig('json', { body }));
      const cart = await response.json();
      if (!response.ok || cart.errors || cart.status) {
        throw new Error(cart.description || cart.message || cart.errors || 'Cart update failed');
      }

      deferred.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
        detail: {
          sections: cart.sections,
          items: cart.items,
          itemCount: cart.item_count,
          source: 'cart-notification',
          didError: false,
        },
      });

      /** @type {any} */
      const updated = cart.items?.find((/** @type {any} */ item) => item.key === line.key);
      if (updated) {
        this.#setLine(updated);
        this.resume();
      } else {
        this.#line = null;
        this.hide();
      }
    } catch (error) {
      deferred.reject(error);
      console.error(error);
      // Show the quantity that is really in the cart again
      this.#setLine(line);
    } finally {
      this.removeAttribute('busy');
    }
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

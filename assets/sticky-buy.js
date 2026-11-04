import { Component } from '@theme/component';

/**
 * Sticky add to cart bar. Slides in once the main buy form's add to cart button has
 * scrolled above the viewport, and its button submits that form, so every choice made in
 * the information column (variant, purchase option, quantity, gift wrap) applies.
 *
 * @extends {Component}
 */
class StickyBuyComponent extends Component {
  /** @type {IntersectionObserver | undefined} */
  #observer;

  /** @type {AbortController | undefined} */
  #abortController;

  connectedCallback() {
    super.connectedCallback();

    this.#abortController = new AbortController();
    this.#observer = new IntersectionObserver(([entry]) => {
      // Only once the button is above the viewport, not while the visitor has yet to reach it
      if (entry) this.#setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    this.#observeButton();

    // A variant change can rebuild the buy form; watch the new button
    document.addEventListener('product-info:render', () => this.#observeButton(), {
      signal: this.#abortController.signal,
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#abortController?.abort();
    document.documentElement.style.removeProperty('--sticky-buy-height');
  }

  /** Submits the main buy form, as if its own add to cart button was pressed. */
  addToCart() {
    const form = this.#form();
    if (!form) return;

    const button = this.#mainButton();
    form.requestSubmit(button instanceof HTMLButtonElement && !button.disabled ? button : undefined);
  }

  #observeButton() {
    const button = this.#mainButton();
    if (!this.#observer || !button) return;
    this.#observer.disconnect();
    this.#observer.observe(button);
  }

  #form() {
    const form = document.getElementById(this.dataset.formId ?? '');
    return form instanceof HTMLFormElement ? form : null;
  }

  #mainButton() {
    return this.#form()?.querySelector('[type="submit"][name="add"]') ?? null;
  }

  /** @param {boolean} visible */
  #setVisible(visible) {
    this.toggleAttribute('data-visible', visible);
    this.toggleAttribute('inert', !visible);
    this.setAttribute('aria-hidden', String(!visible));

    // Lets the page reserve room at the bottom, so the bar never covers the footer
    if (visible) document.documentElement.style.setProperty('--sticky-buy-height', `${this.offsetHeight}px`);
    else document.documentElement.style.removeProperty('--sticky-buy-height');
  }
}

if (!customElements.get('sticky-buy-component')) {
  customElements.define('sticky-buy-component', StickyBuyComponent);
}

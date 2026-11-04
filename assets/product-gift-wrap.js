import { Component } from '@theme/component';

/**
 * Gift wrap option on the product page. When it is ticked, a submit of the buy form first
 * adds the gift wrap product (with the note as a line item property), then lets the buy
 * form's own submit run, so Horizon's cart drawer opens with both lines.
 *
 * @typedef {object} Refs
 * @property {HTMLInputElement} checkbox - The gift wrap checkbox.
 * @property {HTMLTextAreaElement} [note] - The handwritten note.
 *
 * @extends {Component<Refs>}
 */
class ProductGiftWrapComponent extends Component {
  requiredRefs = ['checkbox'];

  /** @type {AbortController | undefined} */
  #abortController;

  /** True while the buy form is resubmitted after adding the gift wrap */
  #resubmitting = false;

  connectedCallback() {
    super.connectedCallback();

    this.#abortController = new AbortController();
    // Capture phase runs before the product form's own submit handler
    document.addEventListener('submit', this.#handleSubmit, { capture: true, signal: this.#abortController.signal });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController?.abort();
  }

  /** @param {SubmitEvent} event */
  #handleSubmit = async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== this.dataset.formId) return;
    if (this.#resubmitting || !this.refs.checkbox.checked) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      await this.#addGiftWrap();
    } catch (error) {
      // Still add the product itself; only the wrap is missing
      console.error(error);
    }

    this.#resubmitting = true;
    try {
      form.requestSubmit(event.submitter instanceof HTMLElement ? event.submitter : undefined);
    } finally {
      this.#resubmitting = false;
    }
  };

  async #addGiftWrap() {
    const { variantId, noteProperty = 'Note' } = this.dataset;
    if (!variantId) return;

    const note = this.refs.note?.value.trim();
    /** @type {Record<string, string>} */
    const properties = note ? { [noteProperty]: note } : {};

    const response = await fetch(Theme.routes.cart_add_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1, properties }] }),
    });

    if (!response.ok) throw new Error(`Gift wrap could not be added (${response.status})`);
  }
}

if (!customElements.get('product-gift-wrap-component')) {
  customElements.define('product-gift-wrap-component', ProductGiftWrapComponent);
}

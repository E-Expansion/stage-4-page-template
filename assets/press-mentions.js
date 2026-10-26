import { Component } from '@theme/component';

/**
 * Collapses press mention cards beyond the mobile limit behind a "Read more" button.
 * The collapse is applied here so all cards stay visible when JavaScript is unavailable.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} grid - The card list.
 * @property {HTMLButtonElement} [moreButton] - Button that reveals the remaining cards.
 *
 * @extends {Component<Refs>}
 */
class PressMentionsComponent extends Component {
  requiredRefs = ['grid'];

  connectedCallback() {
    super.connectedCallback();

    const { grid, moreButton } = this.refs;
    if (!moreButton || grid.hasAttribute('data-expanded')) return;

    grid.setAttribute('data-collapsed', '');
    moreButton.setAttribute('aria-expanded', 'false');
    moreButton.hidden = false;
  }

  /**
   * Reveals every card and moves focus to the first newly shown one.
   */
  expand() {
    const { grid, moreButton } = this.refs;
    const firstRevealed = grid.querySelector('.press-mention--overflow figure');

    grid.removeAttribute('data-collapsed');
    grid.setAttribute('data-expanded', '');
    moreButton?.setAttribute('aria-expanded', 'true');
    if (moreButton) moreButton.hidden = true;

    if (firstRevealed instanceof HTMLElement) {
      firstRevealed.setAttribute('tabindex', '-1');
      firstRevealed.focus({ preventScroll: true });
    }
  }
}

if (!customElements.get('press-mentions-component')) {
  customElements.define('press-mentions-component', PressMentionsComponent);
}

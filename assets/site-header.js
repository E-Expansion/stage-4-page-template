import { Component } from '@theme/component';
import { calculateHeaderGroupHeight, isClickedOutside, lockScroll, mediaQueryLarge, unlockScroll } from '@theme/utilities';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Site header: mega menu submenus, the mobile navigation sidebar, and the
 * `--header-height` / `--header-group-height` custom properties used by sticky content.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} panel - Navigation panel (inline row on desktop, sidebar on mobile).
 * @property {HTMLButtonElement} [menuButton] - Mobile button that opens the sidebar.
 *
 * @extends {Component<Refs>}
 */
class SiteHeaderComponent extends Component {
  requiredRefs = ['panel'];

  /** @type {AbortController | undefined} */
  #abortController;

  /** @type {ResizeObserver | undefined} */
  #resizeObserver;

  get isDrawerOpen() {
    return this.hasAttribute('data-drawer-open');
  }

  connectedCallback() {
    super.connectedCallback();

    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    document.addEventListener('click', this.#handleDocumentClick, { signal });
    document.addEventListener('keydown', this.#handleDocumentKeydown, { signal });
    document.addEventListener('focusin', this.#handleDocumentFocusin, { signal });
    mediaQueryLarge.addEventListener('change', this.#handleBreakpointChange, { signal });

    this.#resizeObserver = new ResizeObserver(this.#updateHeaderHeights);
    this.#resizeObserver.observe(this);
    const headerGroup = document.getElementById('header-group');
    if (headerGroup) this.#resizeObserver.observe(headerGroup);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#abortController?.abort();
    this.#resizeObserver?.disconnect();
    unlockScroll(this);
  }

  /**
   * Opens the mobile navigation sidebar.
   */
  openDrawer() {
    if (this.isDrawerOpen) return;

    this.setAttribute('data-drawer-open', '');
    this.refs.menuButton?.setAttribute('aria-expanded', 'true');
    lockScroll(this);

    const firstFocusable = this.refs.panel.querySelector(FOCUSABLE_SELECTOR);
    if (firstFocusable instanceof HTMLElement) firstFocusable.focus();
  }

  /**
   * Closes the mobile navigation sidebar and returns focus to the menu button.
   */
  closeDrawer = () => {
    if (!this.isDrawerOpen) return;

    this.removeAttribute('data-drawer-open');
    this.refs.menuButton?.setAttribute('aria-expanded', 'false');
    unlockScroll(this);
    this.closeSubmenus();
    this.refs.menuButton?.focus();
  };

  /**
   * Toggles the submenu owned by the clicked nav button. On desktop only one submenu
   * stays open; in the mobile sidebar submenus behave as independent accordions.
   * @param {MouseEvent} event - The click event, targeted at the nav button.
   */
  toggleSubmenu(event) {
    const button = event.target;
    if (!(button instanceof HTMLButtonElement)) return;

    const item = button.closest('.site-nav__item');
    if (!(item instanceof HTMLElement)) return;

    const willOpen = button.getAttribute('aria-expanded') !== 'true';

    if (mediaQueryLarge.matches) this.closeSubmenus();

    item.toggleAttribute('data-open', willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
  }

  /**
   * Closes every open submenu.
   * @param {HTMLElement} [except] - A nav item to leave untouched.
   */
  closeSubmenus(except) {
    for (const item of this.querySelectorAll('.site-nav__item[data-open]')) {
      if (item === except) continue;

      item.removeAttribute('data-open');
      item.querySelector('[aria-expanded]')?.setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Keeps keyboard focus inside the open mobile sidebar.
   * @param {KeyboardEvent} event - The keydown event.
   */
  handlePanelKeydown(event) {
    if (event.key !== 'Tab' || !this.isDrawerOpen) return;

    const focusable = [...this.refs.panel.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
      (element) => element instanceof HTMLElement && element.offsetParent !== null
    );
    const first = focusable.at(0);
    const last = focusable.at(-1);
    if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /**
   * @param {MouseEvent} event - The document click event.
   */
  #handleDocumentClick = (event) => {
    if (!mediaQueryLarge.matches) return;

    const openItem = this.querySelector('.site-nav__item[data-open]');
    if (openItem && isClickedOutside(event, openItem)) this.closeSubmenus();
  };

  /**
   * Closes a desktop submenu once keyboard focus moves outside of it.
   * @param {FocusEvent} event - The document focusin event.
   */
  #handleDocumentFocusin = (event) => {
    if (!mediaQueryLarge.matches || !(event.target instanceof Node)) return;

    const openItem = this.querySelector('.site-nav__item[data-open]');
    if (openItem && !openItem.contains(event.target)) this.closeSubmenus();
  };

  /**
   * @param {KeyboardEvent} event - The document keydown event.
   */
  #handleDocumentKeydown = (event) => {
    if (event.key !== 'Escape') return;

    if (this.isDrawerOpen) {
      this.closeDrawer();
      return;
    }

    const openItem = this.querySelector('.site-nav__item[data-open]');
    if (!openItem) return;

    this.closeSubmenus();
    const button = openItem.querySelector('button[aria-controls]');
    if (button instanceof HTMLElement) button.focus();
  };

  #handleBreakpointChange = () => {
    this.closeSubmenus();
    if (mediaQueryLarge.matches) this.closeDrawer();
  };

  #updateHeaderHeights = () => {
    document.body.style.setProperty('--header-height', `${this.offsetHeight}px`);
    document.body.style.setProperty('--header-group-height', `${calculateHeaderGroupHeight(this)}px`);
  };
}

if (!customElements.get('site-header-component')) {
  customElements.define('site-header-component', SiteHeaderComponent);
}

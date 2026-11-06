import { Component } from '@theme/component';
import { getScrollEventTarget, scrollContainerMediaQuery } from '@theme/scroll-container';

/**
 * Marks the heading the reader is on in the list of article headings, and closes the
 * collapsible version after a link is chosen. The links work without this script.
 *
 * @typedef {object} Refs
 * @property {HTMLAnchorElement[]} links - One link per heading.
 *
 * @extends {Component<Refs>}
 */
class ArticleTocComponent extends Component {
  requiredRefs = ['links'];

  /** @type {AbortController | undefined} */
  #abortController;
  /** @type {EventTarget | undefined} */
  #scrollTarget;
  #frame = 0;

  connectedCallback() {
    super.connectedCallback();

    this.#abortController = new AbortController();
    scrollContainerMediaQuery.addEventListener('change', this.#listenToScroll, {
      signal: this.#abortController.signal,
    });
    this.#listenToScroll();
    this.#update();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#abortController?.abort();
    this.#scrollTarget?.removeEventListener('scroll', this.#scheduleUpdate);
    cancelAnimationFrame(this.#frame);
  }

  handleLinkClick() {
    this.closest('details')?.removeAttribute('open');
  }

  /**
   * The page scrolls in .page-wrapper from 990px and in the document below that, so the
   * listener moves along when the screen crosses that width.
   */
  #listenToScroll = () => {
    this.#scrollTarget?.removeEventListener('scroll', this.#scheduleUpdate);
    this.#scrollTarget = getScrollEventTarget();
    this.#scrollTarget.addEventListener('scroll', this.#scheduleUpdate, { passive: true });
  };

  #scheduleUpdate = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#update());
  };

  /**
   * The current heading is the last one that has passed the upper part of the screen.
   */
  #update() {
    const { links } = this.refs;
    const line = window.innerHeight * 0.3;

    let current = links[0];
    for (const link of links) {
      const heading = document.getElementById(link.hash.slice(1));
      if (heading && heading.getBoundingClientRect().top <= line) current = link;
    }

    for (const link of links) {
      link.toggleAttribute('aria-current', link === current);
    }
  }
}

if (!customElements.get('article-toc-component')) {
  customElements.define('article-toc-component', ArticleTocComponent);
}

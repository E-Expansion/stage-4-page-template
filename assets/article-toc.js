import { Component } from '@theme/component';

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
  #frame = 0;

  connectedCallback() {
    super.connectedCallback();

    this.#abortController = new AbortController();
    window.addEventListener('scroll', this.#scheduleUpdate, {
      passive: true,
      signal: this.#abortController.signal,
    });
    this.#update();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#abortController?.abort();
    cancelAnimationFrame(this.#frame);
  }

  handleLinkClick() {
    this.closest('details')?.removeAttribute('open');
  }

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

import { Component } from '@theme/component';

/**
 * Product tile colour swatches: hovering, focusing or tapping a swatch shows that colour's
 * variant image in the tile and points the title and cart links at that variant. The
 * swatch images are preloaded when the pointer first reaches the swatch row, so the
 * swap is instant. Without this script the tile shows its default image and links.
 *
 * @typedef {object} Refs
 * @property {HTMLImageElement} [image] - The tile image.
 * @property {HTMLAnchorElement} [link] - Title link (stretched over the tile).
 * @property {HTMLAnchorElement} [cartLink] - Cart button that links to the product page.
 * @property {HTMLButtonElement[]} [swatches] - Colour swatches.
 *
 * @extends {Component<Refs>}
 */
class ProductTileComponent extends Component {
  #preloaded = false;

  /**
   * Shows the colour of the swatch that was hovered, focused or tapped.
   *
   * @param {Event} event
   */
  preview(event) {
    const swatch = event.target;
    if (!(swatch instanceof HTMLButtonElement)) return;
    if (swatch.getAttribute('aria-pressed') === 'true') return;

    for (const other of this.refs.swatches ?? []) {
      other.setAttribute('aria-pressed', String(other === swatch));
    }

    const { image, link, cartLink } = this.refs;
    const { src, srcset, url } = swatch.dataset;

    if (image && src) {
      if (srcset) image.srcset = srcset;
      image.src = src;
    }

    if (url) {
      if (link) link.href = url;
      if (cartLink) cartLink.href = url;
    }
  }

  /**
   * Fetches every swatch image once, at the tile's rendered size, before the first swap.
   */
  preload() {
    if (this.#preloaded) return;
    this.#preloaded = true;

    const sizes = this.refs.image?.sizes ?? '';
    for (const swatch of this.refs.swatches ?? []) {
      const { src, srcset } = swatch.dataset;
      if (!src) continue;

      const preloader = new Image();
      if (sizes) preloader.sizes = sizes;
      if (srcset) preloader.srcset = srcset;
      preloader.src = src;
    }
  }
}

if (!customElements.get('product-tile-component')) {
  customElements.define('product-tile-component', ProductTileComponent);
}

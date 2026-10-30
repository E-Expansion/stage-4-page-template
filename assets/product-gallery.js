import { Component } from '@theme/component';

/**
 * Product media gallery: keeps the counter and active thumbnail in step with the
 * swipeable stage, scrolls the stage to a thumbnail, and shows images full screen in a
 * zoom dialog with previous/next and arrow-key navigation.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} track - The scrollable stage.
 * @property {HTMLElement[]} [slides] - One slide per media item.
 * @property {HTMLButtonElement[]} [thumbs] - Thumbnail buttons.
 * @property {HTMLElement} [current] - Counter number.
 * @property {HTMLDialogElement} [zoomDialog] - Full-screen zoom dialog.
 * @property {HTMLImageElement} [zoomImage] - Image inside the zoom dialog.
 *
 * @extends {Component<Refs>}
 */
class ProductGalleryComponent extends Component {
  requiredRefs = ['track'];

  /** @type {AbortController | undefined} */
  #abortController;

  #index = 0;

  #zoomIndex = 0;

  connectedCallback() {
    super.connectedCallback();

    this.#abortController = new AbortController();
    const { signal } = this.#abortController;
    this.refs.track.addEventListener('scroll', this.#handleScroll, { passive: true, signal });
    this.refs.zoomDialog?.addEventListener('keydown', this.#handleZoomKeydown, { signal });
    // Escape closes the dialog natively; leave the stage on the image that was last viewed
    this.refs.zoomDialog?.addEventListener('close', () => this.select(this.#zoomIndex, 'instant'), { signal });

    const startIndex = Number(this.dataset.startIndex) || 0;
    if (startIndex > 0) this.select(startIndex, 'instant');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController?.abort();
  }

  /**
   * Thumbnail click handler.
   *
   * @param {number} index - Zero-based media index
   */
  selectThumb(index) {
    this.select(Number(index));
  }

  /**
   * Scrolls the stage to a media item.
   *
   * @param {number} index - Zero-based media index
   * @param {ScrollBehavior} [behavior]
   */
  select(index, behavior = 'smooth') {
    if (!this.refs.slides?.[index]) return;

    // Slides are full width; scrollLeft runs negative in right-to-left layouts
    const { track } = this.refs;
    const direction = getComputedStyle(track).direction === 'rtl' ? -1 : 1;
    track.scrollTo({ left: direction * index * track.clientWidth, behavior });
    this.#setIndex(index);
  }

  /**
   * Shows the slide holding a media item, e.g. a variant's image after a variant change.
   *
   * @param {string | number} mediaId
   */
  showMedia(mediaId) {
    const index = this.refs.slides?.findIndex((slide) => slide.dataset.mediaId === String(mediaId)) ?? -1;
    if (index >= 0) this.select(index);
  }

  /**
   * Opens the zoom dialog on an image.
   *
   * @param {number} index - Zero-based media index
   */
  openZoom(index) {
    const { zoomDialog } = this.refs;
    if (!zoomDialog) return;

    this.#showZoomImage(Number(index));
    zoomDialog.showModal();
  }

  closeZoom() {
    this.refs.zoomDialog?.close();
  }

  /**
   * Moves the zoom dialog to the previous or next image.
   *
   * @param {number} step - -1 or 1
   */
  zoomStep(step) {
    const zoomable = this.#zoomableIndexes();
    if (zoomable.length === 0) return;

    const position = zoomable.indexOf(this.#zoomIndex);
    const next = zoomable[(position + Number(step) + zoomable.length) % zoomable.length];
    if (next !== undefined) this.#showZoomImage(next);
  }

  /**
   * Closes the zoom dialog when its backdrop is clicked.
   *
   * @param {MouseEvent} event
   */
  handleZoomClick(event) {
    if (event.target === this.refs.zoomDialog) this.closeZoom();
  }

  /** @param {number} index */
  #showZoomImage(index) {
    const trigger = this.refs.slides?.[index]?.querySelector('[data-zoom-src]');
    const { zoomImage } = this.refs;
    if (!(trigger instanceof HTMLElement) || !zoomImage) return;

    const { zoomSrc = '', zoomAlt = '', zoomWidth, zoomHeight } = trigger.dataset;
    if (zoomWidth) zoomImage.width = Number(zoomWidth);
    if (zoomHeight) zoomImage.height = Number(zoomHeight);
    zoomImage.src = zoomSrc;
    zoomImage.alt = zoomAlt;
    this.#zoomIndex = index;
  }

  /** Indexes of slides that hold a zoomable image. */
  #zoomableIndexes() {
    return (this.refs.slides ?? []).flatMap((slide, index) => (slide.querySelector('[data-zoom-src]') ? [index] : []));
  }

  /** @param {number} index */
  #setIndex(index) {
    if (index === this.#index) return;
    this.#index = index;

    if (this.refs.current) this.refs.current.textContent = String(index + 1);
    this.refs.thumbs?.forEach((thumb, thumbIndex) => {
      if (thumbIndex === index) thumb.setAttribute('aria-current', 'true');
      else thumb.removeAttribute('aria-current');
    });

    // Keep the active thumbnail visible in a scrolling thumbnail list
    this.refs.thumbs?.[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  #handleScroll = () => {
    const { track } = this.refs;
    if (track.clientWidth === 0) return;

    // Math.abs keeps this right for right-to-left layouts, where scrollLeft is negative
    this.#setIndex(Math.round(Math.abs(track.scrollLeft) / track.clientWidth));
  };

  /** @param {KeyboardEvent} event */
  #handleZoomKeydown = (event) => {
    const isRtl = getComputedStyle(this).direction === 'rtl';
    if (event.key === 'ArrowRight') this.zoomStep(isRtl ? -1 : 1);
    if (event.key === 'ArrowLeft') this.zoomStep(isRtl ? 1 : -1);
  };
}

if (!customElements.get('product-gallery-component')) {
  customElements.define('product-gallery-component', ProductGalleryComponent);
}

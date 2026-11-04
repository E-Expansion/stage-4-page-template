import { morph } from '@theme/morph';

/** @type {AbortController | undefined} */
let requestController;

/**
 * Re-renders the product information column (sections/product-main.liquid) for a new
 * selection, so stock, price, options and the buy button all come from Liquid. Then it
 * updates the URL and moves the gallery to the variant's image. Used by the variant picker
 * and the purchase options; a newer call cancels a pending one.
 *
 * @param {Element} source - Any element inside the information column
 * @param {object} selection
 * @param {string[]} [selection.optionValues] - Option value IDs; wins over variantId
 * @param {string} [selection.variantId]
 * @param {string} [selection.sellingPlanId] - Empty for a one-time purchase
 */
export async function refreshProductInfo(source, { optionValues, variantId, sellingPlanId = '' }) {
  const column = source.closest('.product-main__info');
  if (!(column instanceof HTMLElement)) return;

  const { productUrl, sectionId } = column.dataset;
  if (!productUrl || !sectionId) return;

  requestController?.abort();
  requestController = new AbortController();

  const url = new URL(productUrl, window.location.origin);
  if (optionValues?.length) url.searchParams.set('option_values', optionValues.join(','));
  else if (variantId) url.searchParams.set('variant', variantId);
  if (sellingPlanId) url.searchParams.set('selling_plan', sellingPlanId);
  url.searchParams.set('section_id', sectionId);

  column.setAttribute('aria-busy', 'true');

  try {
    const response = await fetch(url, { signal: requestController.signal });
    const html = new DOMParser().parseFromString(await response.text(), 'text/html');
    const nextColumn = html.querySelector('.product-main__info');
    if (!nextColumn) return;

    morph(column, nextColumn);

    const { variantId: newVariantId, sellingPlanId: newSellingPlanId, mediaId } = column.dataset;
    updateUrl(newVariantId, newSellingPlanId);

    const gallery = column.closest('.product-main')?.querySelector('product-gallery-component');
    if (mediaId && gallery && 'showMedia' in gallery && typeof gallery.showMedia === 'function') {
      gallery.showMedia(mediaId);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    console.error(error);
  } finally {
    column.removeAttribute('aria-busy');
  }
}

/**
 * Reads the current variant and purchase type from the information column.
 *
 * @param {Element} source - Any element inside the information column
 * @returns {{ variantId: string, sellingPlanId: string }}
 */
export function currentSelection(source) {
  const column = source.closest('.product-main__info');
  const { variantId = '', sellingPlanId = '' } = column instanceof HTMLElement ? column.dataset : {};
  return { variantId, sellingPlanId };
}

/**
 * @param {string | undefined} variantId
 * @param {string | undefined} sellingPlanId
 */
function updateUrl(variantId, sellingPlanId) {
  const url = new URL(window.location.href);
  if (variantId) url.searchParams.set('variant', variantId);
  else url.searchParams.delete('variant');
  if (sellingPlanId) url.searchParams.set('selling_plan', sellingPlanId);
  else url.searchParams.delete('selling_plan');
  history.replaceState(history.state, '', url);
}

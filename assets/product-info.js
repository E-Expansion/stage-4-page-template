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

    // Choices that only live in the browser (quantity tier, gift wrap and its note) survive the re-render
    const keptChoices = Array.from(column.querySelectorAll('input[data-keep-checked]:checked'), (input) =>
      input instanceof HTMLInputElement ? [input.name, input.value] : []
    );

    const keptValues = Array.from(column.querySelectorAll('[data-keep-value][id]'), (field) =>
      field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement ? [field.id, field.value] : []
    );

    morph(column, nextColumn);

    // morph only updates the column's children; the selected variant, selling plan and
    // media live on the column itself, so copy those over too
    for (const { name, value } of nextColumn.attributes) {
      if (name.startsWith('data-') && column.getAttribute(name) !== value) column.setAttribute(name, value);
    }

    for (const [id, value] of keptValues) {
      const field = id ? document.getElementById(id) : null;
      if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) field.value = value ?? '';
    }

    for (const [name, value] of keptChoices) {
      const input = column.querySelector(
        `input[data-keep-checked][name="${CSS.escape(name ?? '')}"][value="${CSS.escape(value ?? '')}"]`
      );
      if (input instanceof HTMLInputElement) input.checked = true;
    }

    // Parts outside the column that also follow the variant, e.g. the sticky add to cart bar
    for (const part of column.closest('.shopify-section')?.querySelectorAll('[data-variant-refresh][id]') ?? []) {
      const nextPart = html.getElementById(part.id);
      if (nextPart) morph(part, nextPart);
    }

    column.dispatchEvent(new CustomEvent('product-info:render', { bubbles: true }));

    const { variantId: newVariantId, sellingPlanId: newSellingPlanId, mediaId, mediaFile } = column.dataset;
    updateUrl(newVariantId, newSellingPlanId);

    const gallery = column.closest('.product-main')?.querySelector('product-gallery-component');
    if ((mediaId || mediaFile) && gallery && 'showMedia' in gallery && typeof gallery.showMedia === 'function') {
      gallery.showMedia(mediaId, mediaFile);
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

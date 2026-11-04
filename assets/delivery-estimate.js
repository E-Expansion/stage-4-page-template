/**
 * Replaces "Delivery in 2-4 working days" with the actual window, e.g.
 * "Delivery Tue 15 - Thu 17 Sep", counted from today in the visitor's browser, with day and
 * month names in the page language. Working days skip Saturday and Sunday.
 */
class DeliveryEstimateComponent extends HTMLElement {
  connectedCallback() {
    const minDays = Number(this.dataset.minDays) || 0;
    const maxDays = Math.max(Number(this.dataset.maxDays) || 0, minDays);
    const workingDays = this.dataset.workingDays === 'true';
    const label = this.dataset.label ?? '';

    const start = addDays(new Date(), minDays, workingDays);
    const end = addDays(new Date(), maxDays, workingDays);
    const locale = document.documentElement.lang || undefined;

    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const month = new Intl.DateTimeFormat(locale, { month: 'short' });
    /** "Tue 15", plus " Sep" when withMonth */
    const format = (/** @type {Date} */ date, /** @type {boolean} */ withMonth) =>
      `${weekday.format(date)} ${date.getDate()}${withMonth ? ` ${month.format(date)}` : ''}`;

    let range;
    if (start.toDateString() === end.toDateString()) range = format(end, true);
    else range = `${format(start, start.getMonth() !== end.getMonth())} - ${format(end, true)}`;

    this.textContent = label ? `${label} ${range}` : range;
  }
}

/**
 * @param {Date} date
 * @param {number} days
 * @param {boolean} workingDays - Skip Saturdays and Sundays
 * @returns {Date}
 */
function addDays(date, days, workingDays) {
  const result = new Date(date);
  let remaining = days;

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const weekday = result.getDay();
    if (!workingDays || (weekday !== 0 && weekday !== 6)) remaining -= 1;
  }

  return result;
}

if (!customElements.get('delivery-estimate-component')) {
  customElements.define('delivery-estimate-component', DeliveryEstimateComponent);
}

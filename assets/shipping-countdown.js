import { Component } from '@theme/component';

/**
 * Same-day shipping countdown. Counts down to the next order cut-off on a shipping day,
 * in the shop's time zone (passed as a UTC offset such as "+0100"), and says whether that
 * shipment goes out today, tomorrow or on a named weekday.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} hours
 * @property {HTMLElement} minutes
 * @property {HTMLElement} seconds
 * @property {HTMLElement} [status] - "ships today / tomorrow / Monday" text.
 *
 * @extends {Component<Refs>}
 */
class ShippingCountdownComponent extends Component {
  requiredRefs = ['hours', 'minutes', 'seconds'];

  /** @type {number | undefined} */
  #interval;

  connectedCallback() {
    super.connectedCallback();
    this.#tick();
    this.#interval = window.setInterval(this.#tick, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearInterval(this.#interval);
  }

  #tick = () => {
    const next = this.#nextCutoff(Date.now());
    if (!next) return;

    const totalSeconds = Math.max(Math.floor((next.time - Date.now()) / 1000), 0);
    const pad = (/** @type {number} */ value) => String(value).padStart(2, '0');

    this.refs.hours.textContent = pad(Math.floor(totalSeconds / 3600));
    this.refs.minutes.textContent = pad(Math.floor((totalSeconds % 3600) / 60));
    this.refs.seconds.textContent = pad(totalSeconds % 60);

    const status = this.#statusText(next.daysAhead, next.weekday);
    if (this.refs.status && this.refs.status.textContent !== status) this.refs.status.textContent = status;
  };

  /**
   * Finds the next cut-off moment on a shipping day.
   *
   * @param {number} now - Current time in milliseconds
   * @returns {{ time: number, daysAhead: number, weekday: number } | null}
   */
  #nextCutoff(now) {
    const shipDays = (this.dataset.shipDays ?? '').split(',').filter(Boolean).map(Number);
    if (shipDays.length === 0) return null;

    const cutoffHour = Number(this.dataset.cutoffHour) || 0;
    const cutoffMinute = Number(this.dataset.cutoffMinute) || 0;
    const offset = parseOffset(this.dataset.utcOffset ?? '');

    // Shop wall-clock time, read with the UTC getters
    const shopNow = new Date(now + offset);

    for (let daysAhead = 0; daysAhead <= 7; daysAhead += 1) {
      const day = new Date(
        Date.UTC(shopNow.getUTCFullYear(), shopNow.getUTCMonth(), shopNow.getUTCDate() + daysAhead, cutoffHour, cutoffMinute)
      );
      const time = day.getTime() - offset;
      if (shipDays.includes(day.getUTCDay()) && time > now) return { time, daysAhead, weekday: day.getUTCDay() };
    }

    return null;
  }

  /**
   * @param {number} daysAhead
   * @param {number} weekday - 0 = Sunday
   */
  #statusText(daysAhead, weekday) {
    const { todayText = '', tomorrowText = '', dayText = '' } = this.dataset;
    if (daysAhead === 0) return todayText;
    if (daysAhead === 1) return tomorrowText;

    // 2023-01-01 was a Sunday, so day 1 + weekday gives that weekday's name
    const dayName = new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2023, 0, 1 + weekday)));
    return dayText.replace('[day]', dayName);
  }
}

/**
 * Converts "+0100" or "-0530" to milliseconds.
 *
 * @param {string} value
 * @returns {number}
 */
function parseOffset(value) {
  const match = /^([+-])(\d{2})(\d{2})$/.exec(value.trim());
  if (!match) return 0;
  const [, sign, hours, minutes] = match;
  return (sign === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes)) * 60_000;
}

if (!customElements.get('shipping-countdown-component')) {
  customElements.define('shipping-countdown-component', ShippingCountdownComponent);
}

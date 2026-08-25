/*
 * StandVirtual (standvirtual.com) parser.  Confidence: HIGH.
 *
 * Primary source: __NEXT_DATA__ -> props.pageProps.advert
 *   - price.value                                   (raw, e.g. "6900")
 *   - parametersDict[key].values[0].{value,label}   for make/model/fuel/year/
 *     mileage/engine_capacity/engine_power/gearbox
 * Fallback: per-field data-testid blocks where the value is the last <p>.
 *
 * Verified against a real advert (Peugeot 308 SW, 2019) captured 2026-08.
 */
(function () {
  'use strict';
  if (!window.__TC) return;
  var TC = window.__TC, U = TC.util;

  function isListingPage() {
    // Advert detail pages live under /carros/anuncio/... ; the advert testids
    // (ad-price) only exist on a detail page, so we also gate on that below.
    return /\/anuncio\//.test(location.pathname) ||
      !!document.querySelector('[data-testid="ad-price"]');
  }

  // Read parametersDict[key].values[0], preferring raw .value, else .label.
  function pd(dict, key, useLabel) {
    var p = dict && dict[key] && dict[key].values && dict[key].values[0];
    if (!p) return null;
    return useLabel ? (p.label != null ? p.label : p.value)
                    : (p.value != null ? p.value : p.label);
  }

  function fromNextData() {
    var nd = U.readNextData();
    var ad = nd && nd.props && nd.props.pageProps && nd.props.pageProps.advert;
    if (!ad) return null;
    var d = ad.parametersDict || {};
    var out = {
      make: pd(d, 'make', true),
      model: pd(d, 'model', true),
      year: U.year(pd(d, 'first_registration_year')),
      km: U.digits(pd(d, 'mileage')),
      price: U.digits(ad.price && ad.price.value),
      fuel: U.fuel(pd(d, 'fuel_type', true)),
      gearbox: U.gearbox(pd(d, 'gearbox')),
      cc: U.digits(pd(d, 'engine_capacity')),
      hp: U.digits(pd(d, 'engine_power')),
      co2: null // StandVirtual does not expose CO2 in parametersDict
    };
    return out;
  }

  // Fallback: each field is a <div data-testid="KEY"> with a label <p> and a
  // value <p>; the value is the LAST <p> in the block.
  function testidValue(key) {
    var el = document.querySelector('[data-testid="' + key + '"]');
    if (!el) return null;
    var ps = el.querySelectorAll('p');
    if (ps.length) return U.text(ps[ps.length - 1]);
    return U.text(el);
  }

  function fromDom() {
    var priceEl = document.querySelector('[data-testid="ad-price"]');
    return {
      make: testidValue('make'),
      model: testidValue('model'),
      year: U.year(testidValue('first_registration_year')),
      km: U.digits(testidValue('mileage')),
      price: U.digits(priceEl && priceEl.textContent),
      fuel: U.fuel(testidValue('fuel_type')),
      gearbox: U.gearbox(testidValue('gearbox')),
      cc: U.digits(testidValue('engine_capacity')),
      hp: U.digits(testidValue('engine_power')),
      co2: null
    };
  }

  // Merge: take DOM value only where NEXT_DATA left a field null.
  function merge(a, b) {
    if (!a) return b;
    if (!b) return a;
    var out = {}, keys = ['make', 'model', 'year', 'km', 'price', 'fuel', 'gearbox', 'cc', 'hp', 'co2'];
    keys.forEach(function (k) { out[k] = (a[k] != null && a[k] !== '') ? a[k] : b[k]; });
    return out;
  }

  TC.registerParser({
    id: 'standvirtual',
    label: 'StandVirtual',
    match: function (host) { return /(^|\.)standvirtual\.com$/.test(host); },
    isListingPage: isListingPage,
    parse: function () {
      if (!isListingPage()) return null;
      return merge(fromNextData(), fromDom());
    }
  });
})();

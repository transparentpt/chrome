/*
 * OLX Portugal (olx.pt) parser.  Confidence: MEDIUM.
 *
 * olx.pt hard-blocks server-side fetching (DataDome 403), so these selectors
 * could NOT be verified against a captured page — they are built on OLX-Group's
 * well-known runtime DOM shape, with several independent fallbacks so a change
 * to any one hook degrades gracefully instead of crashing. Verify live once
 * (see TESTING.md "OLX verification") and tighten the selectors that hit.
 *
 * Strategy, best -> last:
 *   1. JSON-LD Product/Car/Vehicle (make/model/year/fuel/price/km) when present.
 *   2. window.__PRERENDERED_STATE__ inline-script blob (ad.params array).
 *   3. DOM scan of the parameters list, matching Portuguese labels.
 *   4. price from data-testid price containers.
 */
(function () {
  'use strict';
  if (!window.__TC) return;
  var TC = window.__TC, U = TC.util;

  function isListingPage() {
    // OLX item pages live under /d/anuncio/ (or legacy /anuncio/).
    return /\/(d\/)?anuncio\//.test(location.pathname) ||
      !!document.querySelector('[data-testid="ad-price-container"], [data-testid="main-price"]');
  }

  var EMPTY = { make: null, model: null, year: null, km: null, price: null,
                fuel: null, gearbox: null, cc: null, hp: null, co2: null };

  // ---- 1. JSON-LD -----------------------------------------------------------
  function fromLdJson() {
    var blocks = U.readLdJson();
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var t = String(b['@type'] || '').toLowerCase();
      var car = null, price = null;
      if (b.offers) price = (Array.isArray(b.offers) ? b.offers[0] : b.offers).price;
      if (/car|vehicle/.test(t)) car = b;
      else if (b.offers && b.offers.itemOffered) car = b.offers.itemOffered;
      else if (/product/.test(t) && (b.brand || b.model)) car = b;
      if (!car && price == null) continue;
      car = car || {};
      var o = Object.assign({}, EMPTY, {
        make: car.brand && (car.brand.name || car.brand) || null,
        model: car.model || null,
        year: U.year(car.vehicleModelDate || car.dateVehicleFirstRegistered || car.modelDate),
        km: U.digits(car.mileageFromOdometer && (car.mileageFromOdometer.value || car.mileageFromOdometer.minValue) || car.mileageFromOdometer),
        price: U.digits(price),
        fuel: U.fuel(car.fuelType),
        gearbox: U.gearbox(car.vehicleTransmission)
      });
      if (o.make || o.model || o.price != null) return o;
    }
    return null;
  }

  // ---- 2. __PRERENDERED_STATE__ inline blob ---------------------------------
  function fromPrerenderedState() {
    var scripts = document.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      var txt = scripts[i].textContent;
      if (!txt || txt.indexOf('__PRERENDERED_STATE__') < 0) continue;
      var m = txt.match(/__PRERENDERED_STATE__\s*=\s*("(?:[^"\\]|\\.)*")/);
      if (!m) continue;
      var inner = U.parseJSON(m[1]);          // unwrap the quoted string
      var state = typeof inner === 'string' ? U.parseJSON(inner) : inner;
      if (!state) continue;
      var ad = deepFindAd(state);
      if (ad) return adToFields(ad);
    }
    return null;
  }

  // Walk a decoded state object for something that looks like the ad (has a
  // params array of {key,value,name,normalizedValue}).
  function deepFindAd(root) {
    var seen = 0, stack = [root];
    while (stack.length && seen < 5000) {
      var o = stack.pop(); seen++;
      if (!o || typeof o !== 'object') continue;
      if (Array.isArray(o.params) && o.params.length &&
          (o.params[0].key || o.params[0].name)) return o;
      for (var k in o) { if (o[k] && typeof o[k] === 'object') stack.push(o[k]); }
    }
    return null;
  }

  function adToFields(ad) {
    var out = Object.assign({}, EMPTY);
    out.price = U.digits(ad.price && (ad.price.value && ad.price.value.value || ad.price.value) || ad.price);
    (ad.params || []).forEach(function (p) {
      var key = U.norm(p.key || p.name);
      var val = p.normalizedValue != null ? p.normalizedValue
              : (p.value && (p.value.label || p.value.key || p.value)) != null
                ? (p.value.label || p.value.key || p.value) : p.value;
      assignLabelled(out, key, val);
    });
    return out;
  }

  // ---- 3. DOM parameter scan ------------------------------------------------
  function fromDom() {
    var out = Object.assign({}, EMPTY);
    var container = document.querySelector(
      '[data-testid="ad-parameters-container"], [data-testid="ad-parameters"], [data-cy="ad-parameters"]'
    );
    var nodes = (container || document).querySelectorAll('p, li, div');
    var count = 0;
    for (var i = 0; i < nodes.length && count < 400; i++) {
      var el = nodes[i];
      // only leaf-ish nodes (avoid huge containers)
      if (el.children.length > 3) continue;
      var t = U.text(el);
      if (!t || t.length > 80) continue;
      count++;
      var label, value;
      var idx = t.indexOf(':');
      if (idx > 0) { label = t.slice(0, idx); value = t.slice(idx + 1); }
      else { label = t; value = t; } // label-only cells; matcher still keys off label words
      assignLabelled(out, U.norm(label), value, t);
    }
    return out;
  }

  // Map a Portuguese label to a field, filling only empty slots.
  function assignLabelled(out, label, value, whole) {
    function set(k, v) { if (out[k] == null || out[k] === '') out[k] = v; }
    if (/marca/.test(label)) set('make', clean(value));
    else if (/modelo/.test(label)) set('model', clean(value));
    else if (/combustivel/.test(label)) set('fuel', U.fuel(value));
    else if (/caixa|velocidade|transmiss/.test(label)) set('gearbox', U.gearbox(value));
    else if (/cilindrada/.test(label)) set('cc', U.digits(value));
    else if (/potencia|\bcv\b|\bcavalos\b/.test(label)) set('hp', U.digits(value));
    else if (/co2|emiss/.test(label)) set('co2', U.digits(value));
    else if (/quilometr|\bkm\b|quilometragem/.test(label)) set('km', U.digits(value));
    else if (/\bano\b|registo|matricula/.test(label)) set('year', U.year(value || whole));
  }

  function clean(v) { return v == null ? null : String(v).replace(/\s+/g, ' ').trim() || null; }

  // ---- price fallback -------------------------------------------------------
  function domPrice() {
    var el = document.querySelector(
      '[data-testid="ad-price-container"], [data-testid="main-price"], [data-testid="ad-price"]'
    );
    return el ? U.digits(el.textContent) : null;
  }

  function merge() {
    var out = Object.assign({}, EMPTY);
    var sources = [fromLdJson(), fromPrerenderedState(), fromDom()];
    var keys = Object.keys(EMPTY);
    sources.forEach(function (s) {
      if (!s) return;
      keys.forEach(function (k) {
        if ((out[k] == null || out[k] === '') && s[k] != null && s[k] !== '') out[k] = s[k];
      });
    });
    if (out.price == null) out.price = domPrice();
    return out;
  }

  TC.registerParser({
    id: 'olx',
    label: 'OLX',
    match: function (host) { return /(^|\.)olx\.pt$/.test(host); },
    isListingPage: isListingPage,
    parse: function () {
      if (!isListingPage()) return null;
      return merge();
    }
  });
})();

/*
 * CustoJusto (custojusto.pt) parser.  Confidence: HIGH.
 *
 * Primary source: JSON-LD Product -> offers.itemOffered (schema.org/Car)
 *   brand.name, model, fuelType, vehicleModelDate / dateVehicleFirstRegistered,
 *   vehicleTransmission, mileageFromOdometer {minValue,maxValue}, offers.price.
 * Enriched from __NEXT_DATA__ props.pageProps.adData:
 *   .params.capacity (cc), .params.power (hp), .params.regdate (year), .price.
 *
 * Note: mileageFromOdometer is often a BUCKET (e.g. 200000-249999). We take the
 * midpoint as a best estimate; the valuation API tolerates approximate km.
 *
 * Verified against a real advert (Ford C-Max, 2004) captured 2026-08.
 */
(function () {
  'use strict';
  if (!window.__TC) return;
  var TC = window.__TC, U = TC.util;

  function isListingPage() {
    // Detail URLs end in a numeric id: /.../make-model-<digits>
    return /-\d{6,}(?:[/?#]|$)/.test(location.pathname) ||
      !!offerCar();
  }

  // Find the schema.org/Car nested in a Product offer among the JSON-LD blocks.
  function offerCar() {
    var blocks = U.readLdJson();
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var offers = b && b.offers;
      if (!offers) continue;
      var arr = Array.isArray(offers) ? offers : [offers];
      for (var j = 0; j < arr.length; j++) {
        var o = arr[j];
        var car = o && o.itemOffered;
        if (car && (/car/i.test(car['@type'] || '') || car.brand || car.mileageFromOdometer)) {
          return { car: car, price: o.price };
        }
      }
    }
    return null;
  }

  function mileageMid(m) {
    if (!m) return null;
    if (typeof m === 'string' || typeof m === 'number') return U.digits(m);
    var lo = U.digits(m.minValue), hi = U.digits(m.maxValue), v = U.digits(m.value);
    if (v != null) return v;
    if (lo != null && hi != null) return Math.round((lo + hi) / 2);
    return lo != null ? lo : hi;
  }

  function fromLdJson() {
    var oc = offerCar();
    if (!oc) return null;
    var c = oc.car;
    return {
      make: c.brand && (c.brand.name || c.brand) || null,
      model: c.model || null,
      year: U.year(c.vehicleModelDate || c.dateVehicleFirstRegistered || c.productionDate),
      km: mileageMid(c.mileageFromOdometer),
      price: U.digits(oc.price),
      fuel: U.fuel(c.fuelType),
      gearbox: U.gearbox(c.vehicleTransmission),
      cc: null,
      hp: null,
      co2: null
    };
  }

  function fromNextData() {
    var nd = U.readNextData();
    var ad = nd && nd.props && nd.props.pageProps && nd.props.pageProps.adData;
    if (!ad) return null;
    var p = ad.params || {};
    return {
      make: null,
      model: null,
      year: U.year(p.regdate),
      km: null,
      price: U.digits(ad.price),
      fuel: null,
      gearbox: null,
      cc: U.digits(p.capacity),
      hp: U.digits(p.power),
      co2: U.digits(p.co2 || p.co2_emissions)
    };
  }

  function merge(a, b) {
    if (!a) return b;
    if (!b) return a;
    var out = {}, keys = ['make', 'model', 'year', 'km', 'price', 'fuel', 'gearbox', 'cc', 'hp', 'co2'];
    keys.forEach(function (k) { out[k] = (a[k] != null && a[k] !== '') ? a[k] : b[k]; });
    return out;
  }

  TC.registerParser({
    id: 'custojusto',
    label: 'CustoJusto',
    match: function (host) { return /(^|\.)custojusto\.pt$/.test(host); },
    isListingPage: isListingPage,
    parse: function () {
      if (!isListingPage()) return null;
      // LD-JSON carries make/model/fuel/year/km; NEXT_DATA adds cc/hp.
      return merge(fromLdJson(), fromNextData());
    }
  });
})();

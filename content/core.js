/*
 * Orchestrator (runs last). Picks the parser for this host, parses the listing,
 * mounts the panel, and fills the two API-backed sections via the background
 * worker. Handles SPA navigation (all three sites are Next.js) by re-running
 * when the URL path changes.
 */
(function () {
  'use strict';
  if (!window.__TC) return;
  var TC = window.__TC, U = TC.util;

  var PANEL_ID = 'tc-transparentcars-panel';
  var lastPath = null;

  function pickParser() {
    var host = location.hostname;
    var ids = Object.keys(TC.parsers);
    for (var i = 0; i < ids.length; i++) {
      var p = TC.parsers[ids[i]];
      if (p.match(host)) return p;
    }
    return null;
  }

  function removePanel() {
    var ex = document.getElementById(PANEL_ID);
    if (ex && ex.parentNode) ex.parentNode.removeChild(ex);
  }

  // Enough parsed to be worth showing anything at all?
  function hasCar(car) {
    return !!(car && ((car.make && car.model) || car.price != null));
  }

  function computeVerdict(car, v) {
    var ask = car.price;
    if (ask == null || v.low == null || v.high == null) {
      return { verdict: null, verdictClass: 'tc-v-muted', ask: ask };
    }
    var verdict, cls;
    if (ask < v.low) { verdict = 'Abaixo do mercado'; cls = 'tc-v-below'; }
    else if (ask > v.high) { verdict = 'Acima do mercado'; cls = 'tc-v-above'; }
    else { verdict = 'Preço justo'; cls = 'tc-v-fair'; }
    return { verdict: verdict, verdictClass: cls, ask: ask };
  }

  function runValuation(car, panel) {
    if (!(car.make && car.model && car.year)) {
      panel.setValuation({ status: 'skip', message: 'Faltam dados do carro para estimar o preço.' });
      return;
    }
    var params = { make: car.make, model: car.model, year: car.year };
    if (car.km != null) params.km = car.km;
    if (car.fuel) params.fuel = car.fuel;
    if (car.gearbox) params.gearbox = car.gearbox;
    if (car.hp != null) params.hp = car.hp;

    U.bg({ type: 'valuation', params: params }).then(function (resp) {
      if (!resp.ok || !resp.data || !resp.data.found) {
        panel.setValuation({ status: 'unavailable', message: 'Sem comparáveis suficientes.' });
        return;
      }
      var d = resp.data;
      var vr = computeVerdict(car, d);
      panel.setValuation({
        status: 'ok', low: d.low, median: d.median, high: d.high,
        rough: !!d.rough, verdict: vr.verdict, verdictClass: vr.verdictClass, ask: vr.ask
      });
    });
  }

  function runIuc(car, panel) {
    if (!car.year) {
      panel.setIuc({ status: 'skip', message: 'Faltam dados para o IUC.' });
      return;
    }
    // NOTE: never send co2 when unknown — an empty co2 param 400s the endpoint.
    var params = { year: car.year, used: true };
    if (car.cc != null) params.cc = car.cc;
    if (car.fuel) params.fuel = car.fuel;
    if (car.co2 != null) params.co2 = car.co2;

    U.bg({ type: 'isv', params: params }).then(function (resp) {
      if (!resp.ok || !resp.data || !resp.data.iuc || resp.data.iuc.iuc == null) {
        panel.setIuc({ status: 'unavailable' });
        return;
      }
      // We deliberately read ONLY iuc — never surface isv/import cost.
      panel.setIuc({ status: 'ok', iuc: resp.data.iuc.iuc });
    });
  }

  /*
   * ---- Phase 2 seam: neutral "this contact appears on N listings" ----
   * DISABLED via TC.FLAGS.SELLER_LISTINGS. When the backend ships
   *   GET https://transparent.pt/api/public/seller-listings-count?phone=<e164>
   * returning { count: <int> }, flip the flag and have the site parsers expose a
   * `phone` field (normalised E.164). Rules baked in here on purpose:
   *   - a phone is passed ONLY to that endpoint, never stored or sent elsewhere;
   *   - render is a NEUTRAL FACT only (panel.setSeller) — never "dealer"/"fraud";
   *   - any 404/error hides the block entirely (setSeller ignores non-ok).
   * See background.js sellerListingsCount() and TESTING.md.
   */
  function runSeller(car, panel) {
    if (!TC.FLAGS.SELLER_LISTINGS) return;        // dormant in Phase 1
    if (!car.phone) return;                        // no phone parsed -> nothing
    U.bg({ type: 'seller-listings', phone: car.phone }).then(function (resp) {
      if (!resp.ok || !resp.data || typeof resp.data.count !== 'number') return; // hide on error/404
      panel.setSeller({ status: 'ok', count: resp.data.count });
    });
  }

  function run() {
    var parser = pickParser();
    if (!parser) return;
    removePanel();

    var car;
    try { car = parser.parse(); }
    catch (e) { car = null; /* never crash the host page */ }

    if (!hasCar(car)) return;

    var panel = TC.buildPanel(car);
    (document.body || document.documentElement).appendChild(panel.el);

    runValuation(car, panel);
    runIuc(car, panel);
    runSeller(car, panel);
  }

  function maybeRun() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    // let the SPA settle its DOM/__NEXT_DATA__ before parsing
    setTimeout(run, 600);
  }

  // initial + SPA navigation polling (cheap; path-change gated)
  maybeRun();
  setInterval(maybeRun, 1000);
})();

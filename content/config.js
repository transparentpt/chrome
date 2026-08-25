/*
 * TransparentCars extension — shared config + utilities.
 * Loaded first into the content-script isolated world; everything hangs off
 * window.__TC so the later scripts (parsers, panel, core) can share state.
 *
 * TransparentCars (transparent.pt) is a LOCAL Portuguese used-car brand.
 * This extension NEVER shows import cost / ISV — only fair price, yearly
 * running cost (IUC road tax) and an educational red-flag checklist.
 */
(function () {
  'use strict';
  if (window.__TC) return; // idempotent — content scripts can be injected twice on SPA nav

  var TC = (window.__TC = {
    // ---- brand ----
    ACCENT: '#3a5bd0',
    SITE_URL: 'https://transparent.pt',
    API_BASE: 'https://transparent.pt/api/public',

    // ---- feature flags ----
    FLAGS: {
      // Phase 2 seam. Keep DISABLED until transparent.pt ships
      // GET /api/public/seller-listings-count. When true, core.js will ask the
      // background worker to hit that endpoint and render a single NEUTRAL FACT
      // ("this contact appears on N active listings"). If the endpoint 404s or
      // errors, the block is hidden entirely (never guessed, never labelled).
      // See background.js sellerListingsCount() and TESTING.md ("Phase-2 seam").
      SELLER_LISTINGS: false
    },

    // parser registry, keyed by a short site id; each parser self-registers.
    parsers: {},

    registerParser: function (parser) {
      TC.parsers[parser.id] = parser;
    }
  });

  // ---------------------------------------------------------------- utilities
  var util = (TC.util = {});

  // Pull the first integer out of a messy string ("124 912 km" -> 124912,
  // "1 199 cm3" -> 1199). Returns null when there is no digit at all.
  util.digits = function (s) {
    if (s == null) return null;
    var m = String(s).replace(/[ \s.,]/g, '').match(/-?\d+/);
    return m ? parseInt(m[0], 10) : null;
  };

  // 4-digit year out of a string ("2019", "03/2004", "Março/2004" -> 2004).
  util.year = function (s) {
    if (s == null) return null;
    var m = String(s).match(/\b(19|20)\d{2}\b/);
    return m ? parseInt(m[0], 10) : null;
  };

  // Accent-strip + lowercase, for tolerant label matching across PT sites.
  util.norm = function (s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip combining diacritics
      .toLowerCase()
      .trim();
  };

  // Normalise a fuel label/code to a token the transparent.pt API understands.
  // The API is lenient, but we send a clean value anyway. Returns null if unknown.
  util.fuel = function (raw) {
    var s = util.norm(raw);
    if (!s) return null;
    if (/eletric|electric|\bev\b/.test(s)) return 'electric';
    if (/hibrid|hybrid/.test(s)) return 'hybrid';
    if (/gpl|\blpg\b|glp/.test(s)) return 'lpg';
    if (/gas.?leo|diesel|gazole/.test(s)) return 'diesel';
    if (/gasolina|petrol|benzin|\bgaz\b/.test(s)) return 'petrol';
    return null;
  };

  // Normalise gearbox to manual|automatic (or null).
  util.gearbox = function (raw) {
    var s = util.norm(raw);
    if (!s) return null;
    if (/autom/.test(s)) return 'automatic';
    if (/manual/.test(s)) return 'manual';
    return null;
  };

  // Safe JSON.parse.
  util.parseJSON = function (txt) {
    try { return JSON.parse(txt); } catch (e) { return null; }
  };

  // Read + parse every <script type="application/ld+json"> on the page.
  // Returns a flat array of objects (unwrapping @graph and arrays).
  util.readLdJson = function () {
    var out = [];
    var nodes = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < nodes.length; i++) {
      var j = util.parseJSON(nodes[i].textContent);
      if (!j) continue;
      var arr = Array.isArray(j) ? j : (j['@graph'] && Array.isArray(j['@graph']) ? j['@graph'] : [j]);
      for (var k = 0; k < arr.length; k++) if (arr[k]) out.push(arr[k]);
    }
    return out;
  };

  // Read the Next.js __NEXT_DATA__ blob from the DOM (works from the isolated
  // world because it is a <script> element, not a JS global).
  util.readNextData = function () {
    var el = document.getElementById('__NEXT_DATA__');
    return el ? util.parseJSON(el.textContent) : null;
  };

  // Clean, trimmed textContent of an element (collapse whitespace).
  util.text = function (el) {
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  };

  // Ask the background worker to run an API call (keeps us off the page's CORS).
  util.bg = function (message) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(message, function (resp) {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(resp || { ok: false, error: 'no response' });
        });
      } catch (e) {
        resolve({ ok: false, error: String(e && e.message || e) });
      }
    });
  };
})();

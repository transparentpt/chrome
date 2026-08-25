/*
 * MV3 background service worker.
 * All transparent.pt API calls run here (not in the content script) so requests
 * carry the extension's origin and are never subject to the listing page's CORS.
 * host_permissions grants access to https://transparent.pt/*.
 *
 * Endpoints (all GET, public):
 *   /api/public/valuation  -> { found, low, median, high, rough, ... }
 *   /api/public/isv        -> { isv:{...}, iuc:{ iuc, ... } }   (we read iuc only)
 *   /api/public/seller-listings-count -> { count }  (Phase 2, not yet live)
 */
'use strict';

var API_BASE = 'https://transparent.pt/api/public';
var TIMEOUT_MS = 12000;

function buildUrl(path, params) {
  var u = new URL(API_BASE + path);
  Object.keys(params || {}).forEach(function (k) {
    var v = params[k];
    // Drop null/undefined/'' so we never send e.g. co2= (which 400s the API).
    if (v == null || v === '') return;
    u.searchParams.set(k, v);
  });
  return u.toString();
}

function fetchJson(url) {
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
  return fetch(url, { signal: ctrl.signal, credentials: 'omit' })
    .then(function (r) {
      clearTimeout(timer);
      if (!r.ok) return { ok: false, error: 'HTTP ' + r.status, status: r.status };
      return r.json().then(function (data) { return { ok: true, data: data }; });
    })
    .catch(function (e) {
      clearTimeout(timer);
      return { ok: false, error: String(e && e.message || e) };
    });
}

function handle(msg) {
  switch (msg && msg.type) {
    case 'valuation':
      return fetchJson(buildUrl('/valuation', msg.params));
    case 'isv':
      return fetchJson(buildUrl('/isv', msg.params));
    case 'seller-listings':
      // Phase 2 seam. Endpoint returns 404 today -> fetchJson resolves ok:false,
      // and the content script hides the block. Only a phone is ever sent, and
      // only to this endpoint.
      return fetchJson(buildUrl('/seller-listings-count', { phone: msg.phone }));
    default:
      return Promise.resolve({ ok: false, error: 'unknown message type' });
  }
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  handle(msg).then(sendResponse);
  return true; // keep the message channel open for the async response
});

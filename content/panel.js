/*
 * Injected panel UI. Self-contained inside a shadow root so the host page's CSS
 * can never touch it (and vice-versa). buildPanel(car) mounts the shell with the
 * red-flag checklist + skeletons, and returns setters the orchestrator calls as
 * each async API result arrives.
 */
(function () {
  'use strict';
  if (!window.__TC) return;
  var TC = window.__TC;
  var ACCENT = TC.ACCENT;

  var CSS = [
    ':host{all:initial;}',
    '*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}',
    '.tc-wrap{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:320px;max-width:calc(100vw - 32px);',
    '  background:#fff;color:#1a1d24;border:1px solid #e4e7ee;border-radius:12px;',
    '  box-shadow:0 8px 28px rgba(20,25,40,.18);font-size:13px;line-height:1.45;overflow:hidden;}',
    '.tc-head{display:flex;align-items:center;gap:8px;padding:10px 12px;background:' + ACCENT + ';color:#fff;cursor:pointer;user-select:none;}',
    '.tc-head img{height:18px;width:auto;display:block;}',
    '.tc-head .tc-title{font-weight:600;font-size:13px;flex:1;}',
    '.tc-head .tc-toggle{font-size:15px;line-height:1;opacity:.9;transition:transform .15s;}',
    '.tc-body{max-height:70vh;overflow-y:auto;}',
    '.tc-sec{padding:12px;border-top:1px solid #eef0f5;}',
    '.tc-sec:first-child{border-top:none;}',
    '.tc-sec h4{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;margin-bottom:6px;font-weight:600;}',
    '.tc-car{font-size:12px;color:#374151;}',
    '.tc-range{display:flex;justify-content:space-between;gap:6px;margin:8px 0 6px;}',
    '.tc-range .c{flex:1;text-align:center;background:#f4f6fb;border-radius:8px;padding:6px 4px;}',
    '.tc-range .c b{display:block;font-size:13px;color:#111827;}',
    '.tc-range .c.mid{background:#eaeefb;}',
    '.tc-range .c span{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.03em;}',
    '.tc-verdict{display:inline-block;font-weight:600;font-size:12px;padding:3px 9px;border-radius:999px;}',
    '.tc-v-fair{background:#e7f6ec;color:#177245;}',
    '.tc-v-above{background:#fdecec;color:#b42318;}',
    '.tc-v-below{background:#eaf1fd;color:#1d4ed8;}',
    '.tc-v-muted{background:#f1f2f5;color:#6b7280;}',
    '.tc-ask{font-size:12px;color:#374151;margin-top:6px;}',
    '.tc-ask b{color:#111827;}',
    '.tc-iuc{font-size:15px;font-weight:600;color:#111827;}',
    '.tc-iuc small{font-weight:400;color:#6b7280;font-size:12px;}',
    '.tc-muted{color:#9aa1ac;font-size:12px;}',
    '.tc-flags{list-style:none;}',
    '.tc-flags li{padding:6px 0;border-top:1px dashed #eef0f5;}',
    '.tc-flags li:first-child{border-top:none;padding-top:0;}',
    '.tc-flags .ft{font-weight:600;color:#111827;font-size:12px;display:flex;gap:6px;align-items:baseline;}',
    '.tc-flags .ft::before{content:"\\26A0\\FE0F";font-size:11px;}',
    '.tc-flags .fb{color:#4b5563;font-size:12px;margin-top:2px;}',
    '.tc-seller{font-size:12px;color:#374151;background:#f4f6fb;border-radius:8px;padding:8px 10px;}',
    '.tc-foot{padding:8px 12px;border-top:1px solid #eef0f5;font-size:11px;color:#6b7280;display:flex;justify-content:space-between;align-items:center;}',
    '.tc-foot a{color:' + ACCENT + ';text-decoration:none;font-weight:600;}',
    '.tc-skel{height:12px;border-radius:6px;background:linear-gradient(90deg,#eef0f5 25%,#e2e6ee 37%,#eef0f5 63%);background-size:400% 100%;animation:tc-sh 1.2s ease infinite;}',
    '@keyframes tc-sh{0%{background-position:100% 0}100%{background-position:-100% 0}}',
    '.tc-collapsed .tc-body,.tc-collapsed .tc-foot{display:none;}',
    '.tc-collapsed .tc-toggle{transform:rotate(180deg);}'
  ].join('');

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function fmtEur(n) {
    if (n == null || isNaN(n)) return '—';
    return '€' + Math.round(n).toLocaleString('pt-PT');
  }

  function carLine(car) {
    var bits = [];
    if (car.make || car.model) bits.push([car.make, car.model].filter(Boolean).join(' '));
    if (car.year) bits.push(car.year);
    if (car.km != null) bits.push(car.km.toLocaleString('pt-PT') + ' km');
    if (car.fuel) bits.push(car.fuel);
    return bits.join(' · ');
  }

  TC.buildPanel = function (car) {
    var assetUrl = (chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('assets/wordmark.png') : '';

    var host = el('div');
    host.id = 'tc-transparentcars-panel';
    host.style.cssText = 'all:initial;';
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    var wrap = el('div', 'tc-wrap');

    // header
    var head = el('div', 'tc-head');
    head.appendChild(el('span', 'tc-title', 'TransparentCars'));
    var toggle = el('span', 'tc-toggle', '–');
    head.appendChild(toggle);
    wrap.appendChild(head);

    var body = el('div', 'tc-body');

    // parsed car summary
    var secCar = el('div', 'tc-sec');
    secCar.appendChild(el('div', 'tc-car', carLine(car) || 'Car listing'));
    body.appendChild(secCar);

    // fair-price section
    var secVal = el('div', 'tc-sec');
    secVal.appendChild(el('h4', null, 'Fair price'));
    var valBody = el('div');
    valBody.appendChild(el('div', 'tc-skel', ''));
    secVal.appendChild(valBody);
    body.appendChild(secVal);

    // running-cost section
    var secIuc = el('div', 'tc-sec');
    secIuc.appendChild(el('h4', null, 'Yearly cost'));
    var iucBody = el('div');
    iucBody.appendChild(el('div', 'tc-skel', ''));
    secIuc.appendChild(iucBody);
    body.appendChild(secIuc);

    // seller (phase 2) — hidden until setSeller() reveals it
    var secSeller = el('div', 'tc-sec');
    secSeller.style.display = 'none';
    secSeller.appendChild(el('h4', null, 'This contact'));
    var sellerBody = el('div');
    secSeller.appendChild(sellerBody);
    body.appendChild(secSeller);

    // red flags
    var secFlags = el('div', 'tc-sec');
    secFlags.appendChild(el('h4', null, 'Check before you buy'));
    var ul = el('ul', 'tc-flags');
    (TC.REDFLAGS || []).forEach(function (f) {
      var li = el('li');
      li.appendChild(el('div', 'ft', escapeHtml(f.title)));
      li.appendChild(el('div', 'fb', escapeHtml(f.body)));
      ul.appendChild(li);
    });
    secFlags.appendChild(ul);
    body.appendChild(secFlags);

    wrap.appendChild(body);

    // footer
    var foot = el('div', 'tc-foot');
    var brand = el('span', null, 'Powered by ');
    var a = el('a', null, 'TransparentCars');
    a.href = TC.SITE_URL; a.target = '_blank'; a.rel = 'noopener noreferrer';
    brand.appendChild(a);
    foot.appendChild(brand);
    if (assetUrl) {
      var img = el('img'); img.src = assetUrl; img.alt = 'TransparentCars';
      img.style.cssText = 'height:14px;width:auto;';
      foot.appendChild(img);
    }
    wrap.appendChild(foot);

    root.appendChild(wrap);

    // collapse behaviour
    var collapsed = false;
    head.addEventListener('click', function () {
      collapsed = !collapsed;
      wrap.classList.toggle('tc-collapsed', collapsed);
      toggle.textContent = collapsed ? '+' : '–';
    });

    return {
      el: host,

      setValuation: function (v) {
        valBody.innerHTML = '';
        if (!v || v.status !== 'ok') {
          valBody.appendChild(el('div', 'tc-muted',
            (v && v.message) || 'Not enough data to estimate the price.'));
          return;
        }
        var range = el('div', 'tc-range');
        [['Min', v.low], ['Median', v.median], ['Max', v.high]].forEach(function (c, i) {
          var cell = el('div', 'c' + (i === 1 ? ' mid' : ''));
          cell.appendChild(el('b', null, fmtEur(c[1])));
          cell.appendChild(el('span', null, c[0]));
          range.appendChild(cell);
        });
        valBody.appendChild(range);
        if (v.verdict) {
          var vd = el('span', 'tc-verdict ' + v.verdictClass, escapeHtml(v.verdict));
          valBody.appendChild(vd);
        }
        if (v.ask != null) {
          valBody.appendChild(el('div', 'tc-ask',
            'Asking: <b>' + fmtEur(v.ask) + '</b>' +
            (v.rough ? ' · rough estimate' : '')));
        }
      },

      setIuc: function (r) {
        iucBody.innerHTML = '';
        if (!r || r.status !== 'ok' || r.iuc == null) {
          iucBody.appendChild(el('div', 'tc-muted',
            (r && r.message) || 'IUC unavailable for this vehicle.'));
          return;
        }
        iucBody.appendChild(el('div', 'tc-iuc',
          '≈ ' + fmtEur(r.iuc) + '<small> /year road tax (IUC)</small>'));
      },

      // Phase 2: NEUTRAL FACT only. Never renders unless given a count >= 1.
      setSeller: function (s) {
        if (!s || s.status !== 'ok' || s.count == null) { secSeller.style.display = 'none'; return; }
        sellerBody.innerHTML = '';
        secSeller.style.display = '';
        sellerBody.appendChild(el('div', 'tc-seller',
          'ℹ️ This contact appears on <b>' + s.count +
          '</b> active listing' + (s.count === 1 ? '' : 's') + '.'));
      }
    };
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();

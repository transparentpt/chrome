# TransparentCars extension — testing & notes

Chrome MV3 extension (Phase 1). On a Portuguese used-car listing it injects a
compact panel with three things:

1. **Fair-price check** — `GET transparent.pt/api/public/valuation` → low / median /
   high range + a verdict vs the asking price.
2. **Yearly running cost** — `GET transparent.pt/api/public/isv` → the `iuc` field
   only, shown as "≈ €N/ano de imposto de circulação (IUC)". **ISV / import cost is
   never surfaced.**
3. **Red-flag checklist** — a static educational list (no data processing).

The panel lives in a shadow root (its CSS can't clash with the host page) and is
collapsible (click the header). Footer: "Powered by TransparentCars" → transparent.pt.

## Load unpacked

1. Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right).
3. **Load unpacked** → select `tc-oss/chrome/`.
4. Open a car listing on StandVirtual / OLX / CustoJusto — the panel appears
   bottom-right after the page settles (~0.6 s).
5. Click the toolbar icon for the popup (brand + explainer + site link).

The three sites are Next.js SPAs; the content script re-runs on in-page navigation
(URL-path polling), so moving between adverts refreshes the panel.

## API calls

All fetches run in the **background service worker** (not the content script), so
they carry the extension origin and are never subject to the listing page's CORS.
`host_permissions` grants `https://transparent.pt/*`.

Verified live shapes (2026-08):

```
GET /api/public/valuation?make=Peugeot&model=308%20SW&year=2019&km=124912&fuel=petrol&gearbox=automatic&hp=130
-> {"found":true,"comps":8,"match_level":3,"days_sell":31,"rough":false,"low":11350,"median":13025,"high":14490}

GET /api/public/isv?year=2019&used=true&cc=1199&fuel=petrol
-> {"isv":{...},"iuc":{"iuc":111.46,"category":"B",...}}   # extension reads iuc.iuc ONLY
```

**Gotcha (handled):** the isv endpoint 400s if `co2=` is sent empty
(`int_parsing` error). The background worker drops any null/empty query param, so
`co2` is simply omitted when the listing doesn't expose it. Do not "fix" this by
sending `co2=0`.

Verdict logic: `ask < low` → *Abaixo do mercado*; `ask > high` → *Acima do mercado*;
otherwise *Preço justo*. If `found` is false or the range is missing, the price
section shows "Sem comparáveis suficientes." and nothing is guessed.

## Expected behaviour per site & parser confidence

Parsers prefer stable hooks (JSON-LD, `__NEXT_DATA__`, `data-testid`) over brittle
CSS, with independent fallbacks; a missing field hides only its part and never
crashes the page. Tested with jsdom against captured real pages.

### StandVirtual — confidence: **HIGH** (verified on a real advert)
- Primary: `__NEXT_DATA__ → props.pageProps.advert`
  - `price.value`, and `parametersDict[k].values[0].{value,label}` for
    make / model / fuel_type / first_registration_year / mileage /
    engine_capacity / engine_power / gearbox.
- Fallback: per-field `data-testid` blocks (make, model, mileage, fuel_type,
  engine_capacity, engine_power, gearbox, first_registration_year, ad-price);
  the value is the **last `<p>`** in each block.
- Sample parse (Peugeot 308 SW): `make=Peugeot model="308 SW" year=2019 km=124912
  price=6900 fuel=petrol gearbox=automatic cc=1199 hp=130`. CO2 not exposed → omitted.

### CustoJusto — confidence: **HIGH** (verified on a real advert)
- Primary: JSON-LD `Product.offers.itemOffered` (schema.org/Car): brand.name,
  model, fuelType, vehicleModelDate / dateVehicleFirstRegistered,
  vehicleTransmission, mileageFromOdometer, offers.price.
- Enrich: `__NEXT_DATA__ → props.pageProps.adData.params` for `capacity` (cc),
  `power` (hp), `regdate` (year), plus `adData.price`.
- Note: `mileageFromOdometer` is often a **bucket** (e.g. 200000–249999); the
  parser uses the **midpoint** (valuation tolerates approximate km).
- Sample parse (Ford C-Max): `make=Ford model=C-Max year=2004 km=225000 price=3250
  fuel=diesel gearbox=manual cc=1600 hp=109`.

### OLX Portugal — confidence: **MEDIUM** (selectors NOT verified live)
olx.pt hard-blocks server-side fetching (DataDome 403), so selectors could not be
checked against a captured page. They are built on OLX-Group's known runtime DOM
with several fallbacks, and pass a synthetic-DOM smoke test.
- Strategy, best → last:
  1. JSON-LD Product/Car/Vehicle (make/model/year/fuel/price/km).
  2. `window.__PRERENDERED_STATE__` inline-script blob (`ad.params` array), read
     from the DOM script text (works from the isolated world).
  3. DOM scan of the parameters list, matching Portuguese labels (Marca, Modelo,
     Ano, Combustível, Caixa de velocidades, Quilómetros, Cilindrada, Potência).
  4. Price from `[data-testid=ad-price-container|main-price|ad-price]`.

  **OLX verification TODO:** open a real olx.pt car advert with the extension
  loaded, and confirm/adjust in `content/parsers/olx.js`:
  - the parameters container selector (`data-testid="ad-parameters-container"`),
  - whether params render as `Label: value` or split label/value nodes,
  - the price container `data-testid`,
  - whether `__PRERENDERED_STATE__` (or an equivalent state blob) is present.

## Phase-2 seam — "this contact appears on N listings"

**Disabled** in Phase 1 via `TC.FLAGS.SELLER_LISTINGS = false` (in
`content/config.js`). It is a clean drop-in, wired but dormant.

What the backend needs to provide for Phase 2:

- **Endpoint:** `GET https://transparent.pt/api/public/seller-listings-count`
- **Query:** `?phone=<E.164>` (e.g. `351912345678`).
- **Response:** JSON `{ "count": <integer> }`. Any other 2xx shape is treated as
  "no data".
- **404 / error / non-numeric count → the block is hidden entirely.** (Confirmed:
  the endpoint 404s today, and the panel shows nothing.)

To turn it on later:
1. Ship the endpoint above.
2. In the site parsers, expose a normalised `phone` (E.164) on the parsed car
   object. **A phone is passed only to that one endpoint — never stored, never
   sent anywhere else** (see `content/core.js runSeller()` and
   `background.js` `seller-listings` case).
3. Set `TC.FLAGS.SELLER_LISTINGS = true`.

Rendering is a **NEUTRAL FACT only**: "ℹ️ Este contacto aparece em N anúncios
ativos." It **never** labels a seller "dealer" or "fraud".

## Files

```
manifest.json              MV3: host_permissions + content scripts (3 sites) + SW + popup
background.js              service worker — all transparent.pt API fetches (off page CORS)
content/config.js          window.__TC namespace, config, FLAGS, shared util (fuel/gearbox/
                           digits/year normalisers, LD-JSON + __NEXT_DATA__ readers, bg msg)
content/redflags.js        static red-flag checklist (PT)
content/parsers/standvirtual.js   HIGH
content/parsers/olx.js            MEDIUM (needs live verification)
content/parsers/custojusto.js     HIGH
content/panel.js           shadow-DOM UI (skeletons + setters filled as API results arrive)
content/core.js            orchestrator: pick parser → parse → mount → fill sections; SPA-aware
popup/popup.html           brand + one-paragraph explainer + transparent.pt link
assets/                    logo-blue.png, wordmark.png, icon16/48/128.png
```

## Re-running the parser tests

The jsdom harness used during development (`harness.js`) loads the real content
scripts against captured pages and prints the parsed fields. Requires `jsdom`
(`npm i jsdom`). Captured samples: `sv_detail.html`, `cj_detail.html`
(in the dev scratchpad). OLX has no captured sample (server-blocked) — use the
synthetic-DOM smoke test or a live page.

# Chrome Web Store — submission pack (TransparentCars extension v0.1.0)

Everything you paste into the CWS Developer Dashboard, plus how to tie the extension to transparent.pt
**without needing email verification**. Copy the fields as-is.

---

## 1. The domain ↔ extension link (do this to look official)

CWS "domain verification" is **not email** — it's **Google Search Console** ownership of `transparent.pt`
(DNS TXT or HTML-file/meta-tag). You almost certainly already have transparent.pt in Search Console.

- **In CWS Dashboard → Account → verify your site** → add `https://transparent.pt` → it hands the
  verification to Google Search Console (the same DNS/HTML check you already used for SEO). No new email.
- Machine-readable link is already baked in: `manifest.homepage_url = https://transparent.pt`.
- **Listing "Website" field:** `https://transparent.pt`
- **Privacy policy URL:** `https://transparent.pt/en/privacy`
- After the item is published you'll get a CWS item ID — then add a reciprocal link on transparent.pt
  (e.g. a footer/"browser extension" mention pointing at the store URL). Reciprocal link = strongest
  "this domain owns this extension" signal. (Ask me and I'll add that page once you have the ID.)

**Only these steps touch email** (leave for later if you want): the one-time developer-account
registration ($5, uses your existing Google login) and, if the listing form insists, a contact email.
Everything above (domain association, homepage, privacy) needs **no email**.

---

## 2. Listing copy (paste)

**Item name:** TransparentCars — Fair-price & running-cost check

**Summary (132 char max):**
See if a used-car price is fair, its yearly road tax (IUC) and buyer red flags — right on Portuguese car listings.

**Category:** Shopping

**Language:** Portuguese (Portugal) — primary; also usable in English/RU/UA copy on the site.

**Detailed description:**
```
TransparentCars adds a small panel to used-car listings on the Portuguese marketplaces you already
use — StandVirtual, OLX and CustoJusto — so you can judge a car in seconds:

• Fair price — the range comparable cars actually sell for, and whether this asking price is fair,
  high or low.
• Yearly cost — the annual road tax (IUC) for that car, so "cheap to buy" doesn't surprise you later.
• Buyer checklist — the common red flags on cheap used cars (clocked mileage, hidden damage, debts
  that follow the car, fake "private" sellers, surprise fees) and how to check each before you pay.

It reads only the car details shown on the page (make, model, year, mileage, price) to look up the
figures. It does not collect your personal data. Free, no account.

Made by TransparentCars — https://transparent.pt — honest used cars for the local Portuguese market.
```

**Single purpose (required):**
```
Show a fair-price estimate, yearly road tax (IUC) and a buyer red-flag checklist on Portuguese
used-car listing pages.
```

---

## 3. Permission justifications (CWS asks for each)

- **host_permissions (standvirtual.com, olx.pt, custojusto.pt):** the extension only runs on car
  listing pages of these three Portuguese marketplaces, to read the visible car details and show the
  panel there.
- **host_permissions (transparent.pt):** to call our public API (`/api/public/valuation`, `/api/public/isv`)
  for the fair-price range and the IUC figure.
- **storage:** to remember the user's panel preferences (collapsed/expanded) locally. No data leaves the device.
- **Remote code:** none. No externally-hosted scripts; all code ships in the package.

---

## 4. Data safety / privacy disclosures (paste into the Privacy tab)

- **Does the extension collect or use user data?** No personal or user data is collected.
- **What is sent off-device?** Only the car's public listing attributes (make, model, year, mileage,
  price, engine specs) are sent to transparent.pt to fetch the price range and road tax. These are
  not personal data and are not stored against a user.
- **No** authentication, **no** cookies set, **no** analytics, **no** selling/sharing of data.
- **Privacy policy:** https://transparent.pt/en/privacy

(Note: a future version may add a neutral "this contact appears on N listings" signal — that will be
a separate, reviewed release with its own privacy disclosure; it is NOT in this version.)

---

## 5. Graphics you still need to capture (I can't screenshot the live panel for you)

- **Screenshots (1280×800 or 640×400), 1–5:** the panel open on a StandVirtual advert; same on OLX and
  CustoJusto; the checklist expanded. (Load unpacked, open a listing, screenshot.)
- **Store icon:** 128×128 — already in the package (`assets/icon128.png`).
- **Small promo tile 440×280** (optional but recommended) — can be made from the wordmark on the dark
  brand background; ask me and I'll generate it.

---

## 6. Upload artifact
Upload `transparentcars-chrome-0.1.0.zip` (built alongside this file — extension files only, no .git/docs).

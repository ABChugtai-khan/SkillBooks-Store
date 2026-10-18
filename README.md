# SkillBooks Store

Premium dark 3D store for eBooks and wallpapers. Node.js + Express backend, vanilla JS frontend, `data/products.json` storage, Gumroad checkout links.

> Checkout, payment and file delivery are handled by **Gumroad**. This site has no payment system of its own and never sees card details.

---

## ۱. Node.js انسٹال کریں

1. براؤزر میں https://nodejs.org کھولیں اور **LTS** ورژن ڈاؤن لوڈ کریں (ورژن 18 یا اس سے نیا)۔
2. انسٹالر چلائیں اور ہر جگہ **Next** دباتے جائیں۔
3. نیا Terminal کھول کر چیک کریں:

```
node -v
npm -v
```

اگر دونوں کے ورژن نمبر نظر آئیں تو انسٹالیشن ٹھیک ہے۔

## ۲. پروجیکٹ کو VS Code میں کھولیں

1. VS Code کھولیں۔
2. **File → Open Folder** پر جائیں اور `SkillBooks-Store` فولڈر منتخب کریں۔

## ۳. Terminal صحیح فولڈر میں کھولیں

VS Code میں **Terminal → New Terminal** دبائیں۔ Terminal خود بخود پروجیکٹ فولڈر میں کھلتا ہے۔ تصدیق کے لیے:

```
dir        (Windows)
ls         (Mac / Linux)
```

آپ کو `package.json` اور `server.js` نظر آنی چاہئیں۔ اگر نظر نہ آئیں تو `cd SkillBooks-Store` چلائیں۔

## ۴. `npm install` چلائیں

```
npm install
```

انٹرنیٹ ضروری ہے۔ اس سے `node_modules` فولڈر بنے گا۔

## ۵. Environment variables سیٹ کریں

1. `.env.example` فائل کی کاپی بنائیں اور اس کا نام `.env` رکھ دیں۔
2. پاس ورڈ ہیش اور سیکرٹ بنائیں:

```
npm run hash-password
```

3. آپ سے نیا پاس ورڈ مانگا جائے گا (کم از کم 12 حروف)۔ ٹائپ کرتے وقت ستارے `*` نظر آئیں گے۔
4. Terminal میں دو لائنیں چھپیں گی: `ADMIN_PASSWORD_HASH='...'` اور `SESSION_SECRET=...`۔ دونوں کو `.env` فائل میں پیسٹ کریں۔

اہم variables:

| Variable | مطلب |
|---|---|
| `PORT` | سرور کا پورٹ (3000) |
| `NODE_ENV` | `development` یا `production` |
| `BASE_URL` | ویب سائٹ کا ایڈریس (sitemap اور Open Graph کے لیے) |
| `SESSION_SECRET` | کم از کم 32 حروف کا خفیہ متن |
| `ADMIN_USERNAME` | ایڈمن یوزر نیم |
| `ADMIN_PASSWORD_HASH` | پاس ورڈ کا bcrypt hash (اصل پاس ورڈ کبھی نہ لکھیں) |
| `ALLOWED_GUMROAD_HOSTS` | وہ ہوسٹ جن کے HTTPS لنک قبول ہوں گے |
| `SUPPORT_EMAIL` | سپورٹ ای میل (اختیاری) |

## ۶. ایڈمن اکاؤنٹ بنانا

ایڈمن اکاؤنٹ `.env` میں `ADMIN_USERNAME` اور `ADMIN_PASSWORD_HASH` سے بنتا ہے۔ عوام کے لیے کوئی registration صفحہ نہیں ہے۔ پاس ورڈ بدلنا ہو تو `npm run hash-password` دوبارہ چلائیں، نیا hash `.env` میں لگائیں اور سرور ری اسٹارٹ کریں۔

## ۷. سرور چلائیں

```
npm start
```

ڈیولپمنٹ کے دوران (فائل بدلنے پر خود ری اسٹارٹ):

```
npm run dev
```

## ۸. ویب سائٹ براؤزر میں کھولیں

http://localhost:3000 کھولیں۔ سرور بند کرنے کے لیے Terminal میں `Ctrl + C` دبائیں۔

## ۹. eBook اپ لوڈ کرنا

1. http://localhost:3000/login.html پر جا کر لاگ اِن کریں (یا ہیڈر میں **Upload** دبائیں)۔
2. **Upload eBook** بٹن دبائیں۔
3. کور تصویر، نام، تفصیل، قیمت (USD)، کیٹیگری اور Gumroad لنک بھریں۔
4. **Publish Product** دبائیں۔ eBook فوراً `ebooks.html` پر نظر آئے گا۔
5. ڈرافٹ کے طور پر رکھنا ہو تو Status میں **Draft** چنیں۔ بعد میں فہرست سے **Publish** دبائیں۔

## ۱۰. Wallpaper اپ لوڈ کرنا

اسی طرح **Upload Wallpaper** بٹن دبائیں۔ یہاں preview تصویر اور اختیاری resolution (مثلاً `3840x2160`) دیں۔ صرف preview تصویر سائٹ پر عوام کو نظر آتی ہے۔ اصل فائل Gumroad پر رکھیں تاکہ خریداری کے بعد ہی ملے۔

## ۱۱. Gumroad لنک لگانا

1. Gumroad اکاؤنٹ میں پروڈکٹ بنائیں اور اس کی اصل فائل وہیں اپ لوڈ کریں۔
2. پروڈکٹ کا لنک کاپی کریں، مثلاً `https://yourname.gumroad.com/l/ebook1`۔
3. اسے upload فارم کے **Gumroad product URL** میں پیسٹ کریں۔
4. ہر پروڈکٹ کا اپنا الگ لنک ہونا چاہیے۔ سرور صرف `https://` اور `ALLOWED_GUMROAD_HOSTS` والے ہوسٹ قبول کرتا ہے۔

## ۱۲. عام مسائل اور حل

| مسئلہ | حل |
|---|---|
| `'node' is not recognized` | Node.js انسٹال نہیں ہوا۔ انسٹال کر کے VS Code بند کر کے دوبارہ کھولیں۔ |
| `Cannot find module 'express'` | `npm install` نہیں چلایا گیا، یا غلط فولڈر میں ہیں۔ صحیح فولڈر میں `npm install` چلائیں۔ |
| `[CONFIG ERROR] SESSION_SECRET ...` | `.env` فائل نہیں بنی یا `SESSION_SECRET` خالی ہے۔ سیکشن ۵ دیکھیں۔ |
| `[CONFIG ERROR] ADMIN_PASSWORD_HASH ...` | `npm run hash-password` چلائیں اور hash کو single quotes `'...'` میں `.env` میں رکھیں۔ |
| `EADDRINUSE` (پورٹ مصروف) | `.env` میں `PORT=3001` کر دیں، یا پرانا سرور بند کریں۔ |
| لاگ اِن نہیں ہو رہا | یوزر نیم اور پاس ورڈ چیک کریں۔ 15 منٹ میں 10 سے زیادہ غلط کوشش پر عارضی پابندی لگتی ہے۔ |
| "Security token missing or expired" | صفحہ ریفریش کریں (F5) اور دوبارہ کوشش کریں۔ |
| "Host not allowed" | آپ کا لنک `ALLOWED_GUMROAD_HOSTS` میں نہیں۔ لنک `https://` سے شروع ہو اور ہوسٹ فہرست میں ہو۔ |
| تصویر اپ لوڈ نہیں ہو رہی | صرف JPG، PNG، WEBP اور زیادہ سے زیادہ 5 MB۔ |
| صفحے پر 3D نظر نہیں آ رہا | انٹرنیٹ چیک کریں (Three.js cdnjs سے آتا ہے) اور براؤزر میں WebGL آن ہو۔ ویب سائٹ 3D کے بغیر بھی کام کرتی ہے۔ |
| مصنوعات غائب | `data/products.json` کو ہاتھ سے نہ بدلیں۔ فائل خراب ہو جائے تو بیک اپ لے کر `{"products": []}` لکھ دیں۔ |

## ۱۳. محفوظ طریقے سے Production پر ڈپلائے کرنا

1. `.env` میں `NODE_ENV=production`، اصل `BASE_URL` (HTTPS) اور مضبوط `SESSION_SECRET` رکھیں۔
2. ہوسٹ پر **HTTPS لازمی** ہے، ورنہ production میں Secure cookie کام نہیں کرے گی اور لاگ اِن نہیں ہو گا۔
3. اگر سائٹ reverse proxy کے پیچھے ہے (Render، Railway، Nginx وغیرہ) تو `TRUST_PROXY=1` رکھیں۔
4. `.env` کو کبھی Git میں نہ ڈالیں (`.gitignore` اسے روکتا ہے)۔
5. `uploads/` اور `data/` فولڈر ایسی persistent disk پر رکھیں جو ری اسٹارٹ پر مٹ نہ جائے۔ بہت سے مفت ہوسٹ فائلیں مٹا دیتے ہیں۔
6. **ڈیٹا بیس بہتر ہے:** `products.json` ایک ڈیولپمنٹ حل ہے۔ ایک سے زیادہ سرور یا زیادہ ٹریفک پر SQLite/PostgreSQL استعمال کریں۔ فائل اسٹور کی جگہ `lib/jsonStore.js` کو ڈیٹا بیس سے بدلا جا سکتا ہے۔
7. ایڈمن لاگ اِن کے sessions memory میں رہتے ہیں۔ سرور ری اسٹارٹ پر دوبارہ لاگ اِن کرنا ہو گا۔ production میں Redis جیسا session store لگائیں۔
8. قانونی صفحات (Privacy، Terms، Refund) عمومی مسودے ہیں۔ انہیں اپنے کاروبار کے مطابق جانچ لیں۔

---

## Technical notes (English)

### Security summary
- Admin password stored only as a bcrypt hash; login is rate limited; session id is regenerated on login.
- Cookie: `HttpOnly`, `SameSite=Strict`, `Secure` in production.
- CSRF: synchronizer token returned by `GET /api/admin/session` or login, sent as `X-CSRF-Token` on every write request.
- `upload.html` redirects to login without a session; all write endpoints return 401 without a session (page protection alone is not security).
- Uploads: memory storage, 5 MB limit, MIME check plus magic-byte check, random 128-bit filenames, no client filename is ever used.
- Helmet with a strict CSP (scripts only from self and cdnjs). Only whitelisted pages and folders are served; `.env`, `server.js` and `data/` are not reachable.
- Gumroad URLs are validated on save (server) and again before rendering (browser): HTTPS only, no credentials or port, host must match `ALLOWED_GUMROAD_HOSTS`.
- The home page loads Three.js r128 from cdnjs without an SRI hash. For stricter security, download `three.min.js` into `assets/` and change the script tag.

### API
| Method | Path | Auth |
|---|---|---|
| GET | `/api/products?type=&limit=` | public (published only) |
| GET | `/api/products/:id` | public (published only) |
| GET | `/api/config`, POST `/api/newsletter` | public |
| POST | `/api/admin/login`, `/api/admin/logout` | login rate limited |
| GET | `/api/admin/session` | public (reports state) |
| GET | `/api/admin/products` | admin |
| POST | `/api/admin/products` (multipart) | admin + CSRF |
| PUT | `/api/admin/products/:id` (multipart) | admin + CSRF |
| PATCH | `/api/admin/products/:id/status` | admin + CSRF |
| DELETE | `/api/admin/products/:id` | admin + CSRF |
| POST | `/api/webhooks/gumroad/:secret` | secret URL (disabled by default) |

### Section 15: Gumroad verification plan
Clicking Buy Now or returning to the site does **not** prove payment, and the site never claims it does. Delivery of purchased files is done by Gumroad.

If you want server-side sale records, Gumroad offers a "Ping" webhook (Settings, Advanced). This project includes an optional endpoint:

1. Set `GUMROAD_WEBHOOK_SECRET` to a long random string, and optionally `GUMROAD_SELLER_ID`.
2. In Gumroad, set the Ping URL to `https://your-domain/api/webhooks/gumroad/<GUMROAD_WEBHOOK_SECRET>`.
3. Pings are accepted only if the secret in the URL matches (and `seller_id` matches, when configured). Duplicate `sale_id` values are ignored. Only the sale id and product permalink are stored in `data/orders.json`, never customer emails.
4. Optionally set `GUMROAD_ACCESS_TOKEN` (from a Gumroad API application) so each sale is also confirmed with Gumroad's API before it is recorded.

Gumroad's ping fields and API can change. Check Gumroad's current documentation before relying on this in production. This endpoint was not tested against live Gumroad traffic.

### Other payment providers
Nothing other than Gumroad is connected. Do not advertise another method until it is really set up.

| Provider | What you would need |
|---|---|
| Stripe | Stripe account in a supported country, API keys, webhook signing secret, server-side Checkout Session creation. Check whether your business location is supported. |
| PayPal | PayPal Business account, REST API client id and secret, webhook id for signature verification. |
| JazzCash / Easypaisa | Merchant account approved by the provider, merchant id and integrity credentials, their server-side verification callback. Requirements vary, ask the provider. |

Never collect or store card numbers yourself. Use the provider's hosted checkout.

### Currency
All price display goes through `SB.formatPrice()` in `js/main.js` and the allowed currencies live in `CURRENCIES` in `lib/validate.js`. To add PKR later, add it there and extend the form and API to store a `currency` per product.

### Data format (`data/products.json`)
```json
{ "products": [ {
  "id": "uuid", "type": "ebook", "title": "...", "description": "...",
  "price": 9.99, "currency": "USD", "category": "Programming",
  "image": "/uploads/product-images/<random>.jpg", "gumroadUrl": "https://...",
  "tags": ["python"], "status": "published",
  "createdAt": "ISO date", "updatedAt": "ISO date"
} ] }
```
Wallpapers may also have `resolution`.

### SEO
Pages have titles, descriptions and Open Graph tags. `/sitemap.xml` and `/robots.txt` are generated by the server from `BASE_URL`. No ranking or sales results are guaranteed.

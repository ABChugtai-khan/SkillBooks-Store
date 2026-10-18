'use strict';
const express = require('express');
const { orders } = require('../lib/jsonStore');
const { wrap, HttpError, safeEqual } = require('../lib/http');

const router = express.Router();

// Optional second check: ask Gumroad's API whether the sale really exists.
async function verifySale(saleId, token) {
  try {
    const url = `https://api.gumroad.com/v2/sales/${encodeURIComponent(saleId)}?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data && data.success === true;
  } catch (err) {
    return false;
  }
}

// Gumroad "Ping" endpoint. Disabled unless GUMROAD_WEBHOOK_SECRET is set.
// Authenticity: (1) the secret in the URL, (2) optional seller_id match,
// (3) optional API verification of the sale. Duplicate sale ids are ignored.
// Only minimal data is stored: no customer email, no card data.
router.post('/gumroad/:secret',
  express.urlencoded({ extended: false, limit: '20kb' }),
  wrap(async (req, res) => {
    const expected = process.env.GUMROAD_WEBHOOK_SECRET;
    if (!expected || !safeEqual(req.params.secret, expected)) throw new HttpError(404, 'Not found');

    const body = req.body || {};
    const sellerId = process.env.GUMROAD_SELLER_ID;
    if (sellerId && body.seller_id !== sellerId) throw new HttpError(400, 'Unexpected seller');

    const saleId = typeof body.sale_id === 'string' ? body.sale_id : '';
    if (!/^[A-Za-z0-9_=\-]{4,64}$/.test(saleId)) throw new HttpError(400, 'Invalid sale id');

    let verified = false;
    if (process.env.GUMROAD_ACCESS_TOKEN) {
      verified = await verifySale(saleId, process.env.GUMROAD_ACCESS_TOKEN);
      if (!verified) throw new HttpError(400, 'Sale could not be verified');
    }

    const result = await orders.update((list) => {
      if (list.some((o) => o.saleId === saleId)) return 'duplicate';
      list.push({
        saleId,
        productPermalink: String(body.product_permalink || '').slice(0, 100),
        verifiedViaApi: verified,
        receivedAt: new Date().toISOString()
      });
      return 'recorded';
    });
    res.json({ ok: true, result });
  }));

module.exports = router;

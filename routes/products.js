'use strict';
const express = require('express');
const { products } = require('../lib/jsonStore');
const { wrap, HttpError } = require('../lib/http');
const { TYPES } = require('../lib/validate');

const router = express.Router();
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public view of a product. Only published products are ever returned here.
function pub(p) {
  return {
    id: p.id, type: p.type, title: p.title, description: p.description,
    price: p.price, currency: p.currency, category: p.category, image: p.image,
    gumroadUrl: p.gumroadUrl, tags: p.tags, resolution: p.resolution || '',
    createdAt: p.createdAt, updatedAt: p.updatedAt
  };
}

router.get('/', wrap(async (req, res) => {
  let list = (await products.read()).filter((p) => p.status === 'published');
  if (req.query.type !== undefined) {
    if (typeof req.query.type !== 'string' || !TYPES.includes(req.query.type)) {
      throw new HttpError(400, 'Invalid product type');
    }
    list = list.filter((p) => p.type === req.query.type);
  }
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const limit = parseInt(req.query.limit, 10);
  if (Number.isInteger(limit) && limit > 0) list = list.slice(0, Math.min(limit, 100));
  res.json({ products: list.map(pub) });
}));

router.get('/:id', wrap(async (req, res) => {
  if (!ID_RE.test(req.params.id)) throw new HttpError(404, 'Product not found');
  const p = (await products.read()).find((x) => x.id === req.params.id && x.status === 'published');
  if (!p) throw new HttpError(404, 'Product not found');
  res.json({ product: pub(p) });
}));

module.exports = router;

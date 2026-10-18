'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const { products, subscribers } = require('../lib/jsonStore');
const { wrap, HttpError } = require('../lib/http');
const { CATEGORIES, CURRENCIES, allowedHosts } = require('../lib/validate');

const router = express.Router();
const baseUrl = () => (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');

// Public settings the browser needs (no secrets).
router.get('/api/config', (req, res) => {
  res.json({
    siteName: 'SkillBooks',
    currency: CURRENCIES[0],
    supportedCurrencies: CURRENCIES,
    allowedGumroadHosts: allowedHosts(),
    categories: CATEGORIES,
    supportEmail: process.env.SUPPORT_EMAIL || ''
  });
});

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many sign-up attempts. Please try again later.' }
});

router.post('/api/newsletter', newsletterLimiter, wrap(async (req, res) => {
  const email = typeof (req.body || {}).email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new HttpError(400, 'Enter a valid email address');
  }
  await subscribers.update((list) => {
    if (!list.some((s) => s.email === email)) list.push({ email, createdAt: new Date().toISOString() });
  });
  res.status(201).json({ ok: true });
}));

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

router.get('/sitemap.xml', wrap(async (req, res) => {
  const base = baseUrl();
  const pages = ['index.html', 'about.html', 'ebooks.html', 'wallpapers.html', 'contact.html', 'privacy.html', 'terms.html', 'refund.html'];
  const urls = pages.map((p) => `${base}/${p}`);
  (await products.read()).filter((p) => p.status === 'published')
    .forEach((p) => urls.push(`${base}/product.html?id=${p.id}`));
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`).join('\n') + '\n</urlset>\n';
  res.type('application/xml').send(xml);
}));

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /upload.html\nDisallow: /login.html\n\nSitemap: ${baseUrl()}/sitemap.xml\n`
  );
});

module.exports = router;

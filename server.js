'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const { requireAdminPage } = require('./middleware/auth');

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const ROOT = __dirname;

function fatal(message) {
  console.error(`\n[CONFIG ERROR] ${message}\nSee README.md, section "Environment variables".\n`);
  process.exit(1);
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  fatal('SESSION_SECRET must be set in .env and be at least 32 characters long. Run: npm run hash-password');
}
if (!/^\$2[aby]\$\d{2}\$.{53}$/.test(process.env.ADMIN_PASSWORD_HASH || '')) {
  fatal('ADMIN_PASSWORD_HASH is missing or is not a valid bcrypt hash. Run: npm run hash-password');
}
fs.mkdirSync(path.join(ROOT, 'uploads', 'product-images'), { recursive: true });

const app = express();
app.disable('x-powered-by');
const proxies = Number(process.env.TRUST_PROXY) || 0;
if (proxies > 0) app.set('trust proxy', proxies);

app.use(helmet({
  hsts: isProd,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null
    }
  }
}));
app.use(express.json({ limit: '20kb' }));
app.use(session({
  name: 'sb.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 }),
  cookie: { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 2 * 60 * 60 * 1000 }
}));

// ---------- API ----------
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api/products', require('./routes/products'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use(require('./routes/site')); // /api/config, /api/newsletter, /sitemap.xml, /robots.txt
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---------- Pages (explicit list: server files and .env are never served) ----------
const PAGES = ['index', 'about', 'ebooks', 'wallpapers', 'product', 'login', 'contact', 'privacy', 'terms', 'refund'];
async function sendPage(name, res, next) {
  try {
    const html = (await fs.promises.readFile(path.join(ROOT, `${name}.html`), 'utf8')).split('{{BASE_URL}}').join(BASE_URL);
    res.type('html').send(html);
  } catch (err) { next(err); }
}
app.get('/', (req, res, next) => sendPage('index', res, next));
PAGES.forEach((name) => app.get(`/${name}.html`, (req, res, next) => sendPage(name, res, next)));
// The upload dashboard page itself is admin-only (its API is protected separately too).
app.get('/upload.html', requireAdminPage, (req, res, next) => { res.set('Cache-Control', 'no-store'); sendPage('upload', res, next); });

const staticOptions = { index: false, dotfiles: 'ignore', maxAge: isProd ? '1d' : 0 };
['css', 'js', 'assets'].forEach((dir) => app.use(`/${dir}`, express.static(path.join(ROOT, dir), staticOptions)));
app.use('/uploads/product-images', express.static(path.join(ROOT, 'uploads', 'product-images'), { ...staticOptions, maxAge: '7d' }));

// ---------- 404 and errors ----------
app.use((req, res) => {
  res.status(404).type('html').send('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title><link rel="stylesheet" href="/css/styles.css"></head><body><main class="container section"><h1>Page not found</h1><p class="lead">The page you are looking for does not exist.</p><p><a class="btn btn-primary" href="/">Back to home</a></p></main></body></html>');
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  let message = err.message;
  let errors = err.errors;
  if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON body'; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Request body is too large'; }
  else if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller' : `Upload error: ${err.message}`;
    errors = { image: message };
  } else if (err.code === 'UNSUPPORTED_FILE_TYPE') { errors = { image: message }; }
  else if (!err.status) {
    console.error(err);
    status = 500; message = 'Something went wrong on the server'; errors = undefined;
  }
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: message, errors });
  res.status(status).type('text').send(message);
});

app.listen(PORT, () => {
  console.log(`SkillBooks Store running at ${BASE_URL}  (port ${PORT}, ${isProd ? 'production' : 'development'})`);
});

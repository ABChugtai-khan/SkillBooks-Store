'use strict';
const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { isAdmin, requireAdmin, requireCsrf } = require('../middleware/auth');
const { products } = require('../lib/jsonStore');
const { wrap, HttpError, safeEqual } = require('../lib/http');
const { validateProductInput, sniffImage, STATUSES, MAX_IMAGE_BYTES, ALLOWED_MIME } = require('../lib/validate');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'product-images');
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Used so a wrong username takes as long to reject as a wrong password.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(12).toString('hex'), 10);

const limiterOptions = { standardHeaders: true, legacyHeaders: false };
const loginLimiter = rateLimit({
  ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' }
});
const writeLimiter = rateLimit({
  ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 60,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 15, fieldSize: 8 * 1024, parts: 20 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      const err = new Error('Only JPG, PNG and WEBP images are allowed');
      err.code = 'UNSUPPORTED_FILE_TYPE';
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  }
});

function parseId(id) {
  if (!ID_RE.test(id)) throw new HttpError(404, 'Product not found');
  return id;
}

async function saveImage(buffer, ext) {
  const name = crypto.randomBytes(16).toString('hex') + ext;
  await fsp.writeFile(path.join(UPLOAD_DIR, name), buffer, { flag: 'wx' });
  return name;
}

async function removeImage(publicPath) {
  const name = path.basename(String(publicPath || ''));
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(name)) return;
  await fsp.unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}

// ---------- Authentication ----------
router.post('/login', loginLimiter, wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password || password.length > 200) {
    throw new HttpError(400, 'Username and password are required');
  }
  const userOk = safeEqual(username, process.env.ADMIN_USERNAME || 'admin');
  const passOk = await bcrypt.compare(password, userOk ? process.env.ADMIN_PASSWORD_HASH : DUMMY_HASH);
  if (!(userOk && passOk)) throw new HttpError(401, 'Invalid username or password');

  await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
  req.session.isAdmin = true;
  req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.json({ ok: true, csrfToken: req.session.csrfToken });
}));

router.post('/logout', (req, res, next) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('sb.sid');
    res.json({ ok: true });
  });
});

router.get('/session', (req, res) => {
  if (!isAdmin(req)) return res.json({ authenticated: false });
  res.json({ authenticated: true, csrfToken: req.session.csrfToken });
});

// ---------- Product management (admin only) ----------
router.get('/products', requireAdmin, wrap(async (req, res) => {
  const list = await products.read();
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ products: list });
}));

router.post('/products', writeLimiter, requireAdmin, requireCsrf, upload.single('image'), wrap(async (req, res) => {
  const { errors, value } = validateProductInput(req.body || {});
  let ext = null;
  if (!req.file) errors.image = 'Choose an image to upload';
  else if (!(ext = sniffImage(req.file.buffer))) errors.image = 'The file is not a valid JPG, PNG or WEBP image';
  if (Object.keys(errors).length) throw new HttpError(400, 'Fix the highlighted fields and try again', errors);

  const filename = await saveImage(req.file.buffer, ext);
  const now = new Date().toISOString();
  const product = {
    id: crypto.randomUUID(), ...value,
    image: `/uploads/product-images/${filename}`,
    createdAt: now, updatedAt: now
  };
  if (!product.resolution) delete product.resolution;
  try {
    await products.update((list) => { list.push(product); });
  } catch (err) {
    await removeImage(product.image);
    throw err;
  }
  res.status(201).json({ product });
}));

router.put('/products/:id', writeLimiter, requireAdmin, requireCsrf, upload.single('image'), wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const current = (await products.read()).find((p) => p.id === id);
  if (!current) throw new HttpError(404, 'Product not found');

  // The product type cannot be changed after creation.
  const { errors, value } = validateProductInput({ ...(req.body || {}), type: current.type });
  let ext = null;
  if (req.file && !(ext = sniffImage(req.file.buffer))) errors.image = 'The file is not a valid JPG, PNG or WEBP image';
  if (Object.keys(errors).length) throw new HttpError(400, 'Fix the highlighted fields and try again', errors);

  const newImage = req.file ? `/uploads/product-images/${await saveImage(req.file.buffer, ext)}` : null;
  let oldImage = null;
  let updated;
  try {
    await products.update((list) => {
      const i = list.findIndex((p) => p.id === id);
      if (i === -1) throw new HttpError(404, 'Product not found');
      oldImage = list[i].image;
      const next = { ...list[i], ...value, updatedAt: new Date().toISOString() };
      if (newImage) next.image = newImage;
      if (!next.resolution) delete next.resolution;
      list[i] = next;
      updated = next;
    });
  } catch (err) {
    if (newImage) await removeImage(newImage);
    throw err;
  }
  if (newImage && oldImage) await removeImage(oldImage);
  res.json({ product: updated });
}));

router.patch('/products/:id/status', writeLimiter, requireAdmin, requireCsrf, wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const status = req.body && req.body.status;
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Status must be draft or published');
  let updated;
  await products.update((list) => {
    const p = list.find((x) => x.id === id);
    if (!p) throw new HttpError(404, 'Product not found');
    p.status = status;
    p.updatedAt = new Date().toISOString();
    updated = p;
  });
  res.json({ product: updated });
}));

router.delete('/products/:id', writeLimiter, requireAdmin, requireCsrf, wrap(async (req, res) => {
  const id = parseId(req.params.id);
  let removed;
  await products.update((list) => {
    const i = list.findIndex((p) => p.id === id);
    if (i === -1) throw new HttpError(404, 'Product not found');
    [removed] = list.splice(i, 1);
  });
  await removeImage(removed.image);
  res.json({ ok: true });
}));

module.exports = router;

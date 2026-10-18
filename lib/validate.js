'use strict';

const CATEGORIES = {
  ebook: ['AI & Machine Learning', 'Programming', 'Freelancing', 'Business', 'Design', 'Productivity', 'Education'],
  wallpaper: ['Abstract', 'Futuristic', 'Space', 'Nature', 'Minimal', 'Cityscape', 'Dark']
};
const TYPES = Object.keys(CATEGORIES);
const STATUSES = ['draft', 'published'];
const CURRENCIES = ['USD']; // add 'PKR' here later and extend the price display on the client
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

function allowedHosts() {
  return (process.env.ALLOWED_GUMROAD_HOSTS || 'gumroad.com,*.gumroad.com,gum.co')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function hostAllowed(host, list) {
  return list.some((h) => (h.startsWith('*.') ? host.endsWith(h.slice(1)) : host === h));
}

function clean(value, multiline) {
  let s = typeof value === 'string' ? value : value == null ? '' : String(value);
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  s = multiline ? s.replace(/\r\n?/g, '\n') : s.replace(/\s+/g, ' ');
  return s.trim();
}

function validateGumroadUrl(raw) {
  const text = clean(raw);
  if (!text) return { error: 'Gumroad product URL is required' };
  if (text.length > 300) return { error: 'URL is too long' };
  let url;
  try {
    url = new URL(text);
  } catch (e) {
    return { error: 'Enter a full URL, for example https://yourname.gumroad.com/l/product' };
  }
  if (url.protocol !== 'https:') return { error: 'The URL must start with https://' };
  if (url.username || url.password) return { error: 'The URL must not contain a username or password' };
  if (url.port) return { error: 'The URL must not contain a port number' };
  if (!hostAllowed(url.hostname.toLowerCase(), allowedHosts())) {
    return { error: `Host not allowed. Allowed hosts: ${allowedHosts().join(', ')}` };
  }
  return { url: url.href };
}

function validateTags(raw) {
  const parts = clean(raw).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  const tags = [...new Set(parts)];
  if (tags.length > 10) return { error: 'Use at most 10 tags' };
  const bad = tags.find((t) => !/^[\p{L}\p{N}][\p{L}\p{N} \-]{1,23}$/u.test(t));
  if (bad) return { error: 'Each tag must be 2–24 characters (letters, numbers, spaces, hyphens)' };
  return { tags };
}

// Validates browser input. Returns { errors, value }. Never trust the browser.
function validateProductInput(body) {
  const errors = {};
  const value = {};

  value.type = clean(body.type);
  if (!TYPES.includes(value.type)) errors.type = 'Product type must be ebook or wallpaper';

  value.title = clean(body.title);
  if (value.title.length < 3 || value.title.length > 120) errors.title = 'Title must be 3–120 characters';

  value.description = clean(body.description, true);
  if (value.description.length < 10 || value.description.length > 2000) {
    errors.description = 'Description must be 10–2000 characters';
  }

  const priceText = clean(body.price);
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(priceText)) {
    errors.price = 'Enter a price in USD between 0 and 9999.99';
  } else {
    value.price = Math.round(parseFloat(priceText) * 100) / 100;
  }
  value.currency = CURRENCIES[0];

  value.category = clean(body.category);
  if (TYPES.includes(value.type) && !CATEGORIES[value.type].includes(value.category)) {
    errors.category = 'Choose a category from the list';
  }

  const link = validateGumroadUrl(body.gumroadUrl);
  if (link.error) errors.gumroadUrl = link.error;
  else value.gumroadUrl = link.url;

  const tags = validateTags(body.tags);
  if (tags.error) errors.tags = tags.error;
  else value.tags = tags.tags;

  value.status = clean(body.status) || 'published';
  if (!STATUSES.includes(value.status)) errors.status = 'Status must be draft or published';

  value.resolution = '';
  if (value.type === 'wallpaper') {
    const res = clean(body.resolution).toLowerCase().replace(/\s+/g, '').replace('×', 'x');
    if (res) {
      if (!/^\d{3,5}x\d{3,5}$/.test(res)) errors.resolution = 'Use the format 3840x2160';
      else value.resolution = res;
    }
  }
  return { errors, value };
}

// Checks the real file signature instead of trusting the filename or MIME type.
function sniffImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

module.exports = {
  CATEGORIES, TYPES, STATUSES, CURRENCIES, MAX_IMAGE_BYTES, ALLOWED_MIME,
  allowedHosts, validateProductInput, validateGumroadUrl, sniffImage
};

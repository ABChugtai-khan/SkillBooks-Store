'use strict';
const crypto = require('crypto');

function isAdmin(req) {
  return Boolean(req.session && req.session.isAdmin === true);
}

// API guard: returns JSON 401.
function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).json({ error: 'Administrator login required' });
}

// Page guard: redirects the browser to the login page.
function requireAdminPage(req, res, next) {
  if (isAdmin(req)) return next();
  res.redirect('/login.html?next=upload.html');
}

// CSRF protection (synchronizer token). The token lives in the session and the
// browser must send it back in the X-CSRF-Token header on every write request.
function requireCsrf(req, res, next) {
  const sent = req.get('x-csrf-token') || '';
  const expected = (req.session && req.session.csrfToken) || '';
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'Security token missing or expired. Refresh the page and try again.' });
  }
  next();
}

module.exports = { isAdmin, requireAdmin, requireAdminPage, requireCsrf };

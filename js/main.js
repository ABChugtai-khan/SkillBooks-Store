/* Shared helpers, header/footer, product cards, shop listing, home page, newsletter */
(function () {
  'use strict';
  const SB = (window.SB = {});

  // ---------- DOM helper (safe: text is always inserted as text, never as HTML) ----------
  SB.el = function (tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [key, val] of Object.entries(props)) {
        if (val == null || val === false) continue;
        if (key === 'class') node.className = val;
        else if (key === 'text') node.textContent = val;
        else if (key.startsWith('on') && typeof val === 'function') node.addEventListener(key.slice(2), val);
        else node.setAttribute(key, val === true ? '' : val);
      }
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return node;
  };

  SB.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  SB.truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

  // ---------- API ----------
  SB.api = async function (url, options = {}) {
    let res;
    try {
      res = await fetch(url, { credentials: 'same-origin', ...options });
    } catch (e) {
      throw new Error('Cannot reach the server. Check that it is running and try again.');
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* no JSON body */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      err.errors = data && data.errors;
      throw err;
    }
    return data;
  };
  let configPromise;
  SB.getConfig = () => configPromise || (configPromise = SB.api('/api/config'));

  // ---------- Currency (one place to change when PKR is added) ----------
  SB.formatPrice = function (amount, currency) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '';
    if (n === 0) return 'Free';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(n);
    } catch (e) {
      return `${currency || ''} ${n.toFixed(2)}`.trim();
    }
  };

  // ---------- Purchase link validation: HTTPS and an allowed host only ----------
  SB.safeGumroadUrl = function (raw, hosts) {
    try {
      const u = new URL(raw);
      if (u.protocol !== 'https:' || u.username || u.password) return null;
      const h = u.hostname.toLowerCase();
      const ok = (hosts || []).some((p) => (p.startsWith('*.') ? h.endsWith(p.slice(1)) : h === p));
      return ok ? u.href : null;
    } catch (e) { return null; }
  };

  // ---------- Notifications and states ----------
  SB.toast = function (message, type = 'info') {
    const host = document.getElementById('toasts');
    if (!host) return;
    const t = SB.el('div', { class: `toast toast-${type}`, role: type === 'error' ? 'alert' : 'status', text: message });
    t.addEventListener('click', () => t.remove());
    host.append(t);
    setTimeout(() => t.remove(), 5000);
  };
  SB.setState = function (container, kind, message) {
    container.replaceChildren(SB.el('div', { class: `state state-${kind}`, role: kind === 'error' ? 'alert' : 'status' },
      kind === 'loading' ? SB.el('span', { class: 'spinner', 'aria-hidden': 'true' }) : null,
      SB.el('p', { text: message })));
  };

  // ---------- Header and footer ----------
  const NAV = [['Home', 'index.html'], ['About', 'about.html'], ['eBooks', 'ebooks.html'], ['Wallpapers', 'wallpapers.html'], ['Upload', 'upload.html']];

  function buildHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    const current = location.pathname.split('/').pop() || 'index.html';
    const nav = SB.el('nav', { id: 'primary-nav', class: 'nav', 'aria-label': 'Primary' },
      SB.el('ul', { class: 'nav-list' }, NAV.map(([label, href]) =>
        SB.el('li', null, SB.el('a', { class: 'nav-link', href, text: label, 'aria-current': href === current ? 'page' : null })))));
    const toggle = SB.el('button', { class: 'nav-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'primary-nav', 'aria-label': 'Toggle menu' },
      SB.el('span', { class: 'bar' }), SB.el('span', { class: 'bar' }), SB.el('span', { class: 'bar' }));
    const brand = SB.el('a', { class: 'brand', href: 'index.html', 'aria-label': 'SkillBooks home' },
      SB.el('img', { src: 'assets/icons/logo.svg', alt: '', width: '34', height: '34' }),
      SB.el('span', null, 'Skill', SB.el('b', { text: 'Books' })));
    const header = SB.el('header', { class: 'site-header' }, SB.el('div', { class: 'container header-inner' }, brand, nav, toggle));
    host.replaceWith(header);

    const setOpen = (open) => { nav.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function buildFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;
    const links = (title, items) => SB.el('div', null, SB.el('h2', { text: title }),
      SB.el('ul', null, items.map(([t, h]) => SB.el('li', null, SB.el('a', { href: h, text: t })))));
    host.replaceWith(SB.el('footer', { class: 'site-footer' },
      SB.el('div', { class: 'container footer-grid' },
        SB.el('div', null, SB.el('h2', { text: 'SkillBooks' }),
          SB.el('p', { class: 'muted', text: 'Digital eBooks and wallpapers. Checkout and delivery are handled by Gumroad.' })),
        links('Shop', [['eBooks', 'ebooks.html'], ['Wallpapers', 'wallpapers.html']]),
        links('Company', [['About', 'about.html'], ['Contact', 'contact.html']]),
        links('Legal', [['Privacy Policy', 'privacy.html'], ['Terms', 'terms.html'], ['Refund Policy', 'refund.html'], ['Admin login', 'login.html']])),
      SB.el('div', { class: 'container footer-bottom', text: `© ${new Date().getFullYear()} SkillBooks. All rights reserved.` })));
  }

  // ---------- Product card ----------
  SB.renderCard = function (p, hosts) {
    const { el } = SB;
    const detail = `product.html?id=${encodeURIComponent(p.id)}`;
    const buy = SB.safeGumroadUrl(p.gumroadUrl, hosts);
    const wp = p.type === 'wallpaper';
    const imgOk = typeof p.image === 'string' && p.image.startsWith('/uploads/product-images/');
    return el('article', { class: `card card-${p.type}` },
      el('a', { class: 'card-media', href: detail, 'aria-label': `View details for ${p.title}` },
        imgOk ? el('img', { src: p.image, alt: wp ? `Preview of ${p.title}` : `Cover of ${p.title}`, width: wp ? 800 : 600, height: wp ? 500 : 800, loading: 'lazy', decoding: 'async' }) : null),
      el('div', { class: 'card-body' },
        el('span', { class: 'badge', text: p.category }),
        el('h3', { class: 'card-title' }, el('a', { href: detail, text: p.title })),
        el('p', { class: 'card-desc', text: SB.truncate(p.description, 140) }),
        el('div', { class: 'card-foot' },
          el('span', { class: 'price', text: SB.formatPrice(p.price, p.currency) }),
          el('div', { class: 'card-actions' },
            el('a', { class: 'btn btn-ghost btn-sm', href: detail, text: 'Details' }),
            buy ? el('a', { class: 'btn btn-primary btn-sm', href: buy, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Buy ${p.title} on Gumroad`, text: 'Buy Now' })
                : el('span', { class: 'btn btn-sm btn-disabled', 'aria-disabled': 'true', text: 'Unavailable' })))));
  };

  // ---------- Shop listing (used by ebooks.js and wallpapers.js) ----------
  SB.initShop = async function ({ type, label }) {
    const $ = (id) => document.getElementById(id);
    const grid = $('product-grid'), search = $('search'), cat = $('category'), sort = $('sort'), count = $('result-count');
    let all = [], hosts = [];
    SB.setState(grid, 'loading', `Loading ${label}…`);
    try {
      const [cfg, data] = await Promise.all([SB.getConfig(), SB.api(`/api/products?type=${type}`)]);
      hosts = cfg.allowedGumroadHosts; all = data.products;
    } catch (e) { SB.setState(grid, 'error', e.message); return; }

    const cats = [...new Set(all.map((p) => p.category))].sort();
    cats.forEach((c) => cat.append(SB.el('option', { value: c, text: c })));
    const params = new URLSearchParams(location.search);
    if (cats.includes(params.get('category'))) cat.value = params.get('category');
    search.value = (params.get('q') || '').slice(0, 100);

    function apply() {
      const q = search.value.trim().toLowerCase();
      let list = all.filter((p) => (!cat.value || p.category === cat.value) &&
        (!q || [p.title, p.description, p.category, ...(p.tags || [])].join(' ').toLowerCase().includes(q)));
      const sorters = {
        newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
        'price-asc': (a, b) => a.price - b.price,
        'price-desc': (a, b) => b.price - a.price,
        title: (a, b) => a.title.localeCompare(b.title)
      };
      list.sort(sorters[sort.value] || sorters.newest);
      count.textContent = all.length ? `${list.length} of ${all.length} ${label}` : '';
      if (!all.length) SB.setState(grid, 'empty', `No ${label} have been published yet. Please check back soon.`);
      else if (!list.length) SB.setState(grid, 'empty', 'No products match your search. Try a different word or category.');
      else grid.replaceChildren(...list.map((p) => SB.renderCard(p, hosts)));
    }
    search.addEventListener('input', SB.debounce(apply, 200));
    cat.addEventListener('change', apply);
    sort.addEventListener('change', apply);
    apply();
  };

  // ---------- Home page ----------
  async function initHome() {
    const cfg = await SB.getConfig().catch(() => null);
    const hosts = cfg ? cfg.allowedGumroadHosts : [];
    if (cfg) {
      [['ebook', 'ebooks.html'], ['wallpaper', 'wallpapers.html']].forEach(([type, page]) => {
        const box = document.getElementById(`cats-${type}`);
        if (box) box.replaceChildren(...cfg.categories[type].map((c) =>
          SB.el('a', { class: 'chip', href: `${page}?category=${encodeURIComponent(c)}`, text: c })));
      });
    }
    for (const [type, id] of [['ebook', 'featured-ebooks'], ['wallpaper', 'featured-wallpapers']]) {
      const target = document.getElementById(id);
      SB.setState(target, 'loading', 'Loading…');
      try {
        const data = await SB.api(`/api/products?type=${type}&limit=3`);
        if (!data.products.length) SB.setState(target, 'empty', `New ${type === 'ebook' ? 'eBooks' : 'wallpapers'} are coming soon.`);
        else target.replaceChildren(...data.products.map((p) => SB.renderCard(p, hosts)));
      } catch (e) { SB.setState(target, 'error', e.message); }
    }
  }

  // ---------- Newsletter ----------
  function initNewsletter() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;
    const input = document.getElementById('newsletter-email');
    const error = document.getElementById('newsletter-error');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
        error.textContent = 'Enter a valid email address.'; input.setAttribute('aria-invalid', 'true'); input.focus(); return;
      }
      error.textContent = ''; input.removeAttribute('aria-invalid');
      try {
        await SB.api('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        form.reset(); SB.toast('Thanks! You are on the list.', 'success');
      } catch (err) { error.textContent = err.message; }
    });
  }

  // ---------- Support email on About and Contact ----------
  async function fillSupportEmail() {
    const slot = document.getElementById('support-email');
    if (!slot) return;
    const cfg = await SB.getConfig().catch(() => null);
    if (cfg && cfg.supportEmail) slot.replaceChildren(SB.el('a', { href: `mailto:${cfg.supportEmail}`, text: cfg.supportEmail }));
  }

  buildHeader();
  buildFooter();
  initNewsletter();
  fillSupportEmail();
  if (document.body.dataset.page === 'home') initHome();
})();

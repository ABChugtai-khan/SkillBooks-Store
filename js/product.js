(async function () {
  'use strict';
  const { el } = SB;
  const root = document.getElementById('product-root');
  const relatedBox = document.getElementById('related');
  const relatedGrid = document.getElementById('related-grid');

  function missing(message) {
    root.replaceChildren(el('div', { class: 'state', role: 'alert' },
      el('h1', { text: 'Product not found' }), el('p', { text: message }),
      el('a', { class: 'btn btn-primary', href: 'ebooks.html', text: 'Browse eBooks' })));
    document.title = 'Product not found | SkillBooks';
  }

  const id = new URLSearchParams(location.search).get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) { missing('No product was selected.'); return; }

  SB.setState(root, 'loading', 'Loading product…');
  let cfg, product;
  try {
    const [c, d] = await Promise.all([SB.getConfig(), SB.api(`/api/products/${encodeURIComponent(id)}`)]);
    cfg = c; product = d.product;
  } catch (e) {
    if (e.status === 404) missing('This product does not exist or is not published yet.');
    else SB.setState(root, 'error', e.message);
    return;
  }

  const wp = product.type === 'wallpaper';
  const shopPage = wp ? 'wallpapers.html' : 'ebooks.html';
  const buy = SB.safeGumroadUrl(product.gumroadUrl, cfg.allowedGumroadHosts);
  document.title = `${product.title} | SkillBooks`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', SB.truncate(product.description, 155));

  const rows = [['Category', product.category], ['Type', wp ? 'Wallpaper' : 'eBook']];
  if (wp && product.resolution) rows.push(['Resolution', product.resolution]);

  root.replaceChildren(
    el('a', { class: 'back-link', href: shopPage, text: `Back to ${wp ? 'wallpapers' : 'eBooks'}` }),
    el('div', { class: 'detail' },
      el('div', { class: 'detail-media' },
        el('img', { src: product.image, alt: wp ? `Preview of ${product.title}` : `Cover of ${product.title}`, width: wp ? 800 : 600, height: wp ? 500 : 800 })),
      el('div', { class: 'detail-info' },
        el('span', { class: 'badge', text: product.category }),
        el('h1', { text: product.title }),
        el('p', { class: 'detail-price', text: SB.formatPrice(product.price, product.currency) }),
        el('p', { class: 'detail-desc', text: product.description }),
        el('dl', { class: 'meta-list' }, rows.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })]),
          product.tags && product.tags.length ? [el('dt', { text: 'Tags' }),
            el('dd', null, el('div', { class: 'tag-list' }, product.tags.map((t) => el('span', { class: 'badge', text: t }))))] : null),
        buy ? el('a', { class: 'btn btn-primary', href: buy, target: '_blank', rel: 'noopener noreferrer', text: 'Buy Now' })
            : el('span', { class: 'btn btn-disabled', 'aria-disabled': 'true', text: 'Currently unavailable' }),
        el('p', { class: 'notice', text: 'Buy Now opens Gumroad in a new tab. Payment and file delivery are handled by Gumroad.' }))));

  try {
    const d = await SB.api(`/api/products?type=${product.type}`);
    const others = d.products.filter((p) => p.id !== product.id)
      .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0, 3);
    if (others.length) {
      if (wp) relatedGrid.classList.add('grid-wide');
      relatedGrid.replaceChildren(...others.map((p) => SB.renderCard(p, cfg.allowedGumroadHosts)));
      relatedBox.hidden = false;
    }
  } catch (e) { /* related products are optional */ }
})();

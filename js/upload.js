/* Admin dashboard: create, edit, publish/unpublish and delete products */
(async function () {
  'use strict';
  const { el, api, toast } = SB;
  const $ = (id) => document.getElementById(id);
  const form = $('product-form');
  const MAX_BYTES = 5 * 1024 * 1024;
  const TYPES_OK = ['image/jpeg', 'image/png', 'image/webp'];
  const FIELDS = ['image', 'title', 'category', 'description', 'price', 'status', 'gumroadUrl', 'tags', 'resolution'];
  const COPY = {
    ebook: { heading: 'Upload eBook', image: 'Product cover image', name: 'eBook name' },
    wallpaper: { heading: 'Upload Wallpaper', image: 'Wallpaper preview image', name: 'Wallpaper name' }
  };
  const state = { type: 'ebook', editingId: null, submitting: false, products: [], csrf: '', cfg: null, previewUrl: null };

  function toLogin() { location.replace('login.html?next=upload.html'); }

  try {
    const s = await api('/api/admin/session');
    if (!s.authenticated) return toLogin();
    state.csrf = s.csrfToken;
    state.cfg = await SB.getConfig();
  } catch (e) {
    SB.setState($('admin-list'), 'error', e.message);
    return;
  }

  // ----- helpers -----
  function clearErrors() {
    FIELDS.forEach((f) => {
      const box = document.querySelector(`[data-error-for="${f}"]`);
      if (box) box.textContent = '';
      const input = form.elements[f];
      if (input) input.removeAttribute('aria-invalid');
    });
  }
  function showErrors(errors) {
    let first = null;
    Object.entries(errors || {}).forEach(([f, msg]) => {
      const box = document.querySelector(`[data-error-for="${f}"]`);
      if (box) box.textContent = msg;
      const input = form.elements[f];
      if (input) { input.setAttribute('aria-invalid', 'true'); first = first || input; }
    });
    if (first) first.focus();
  }
  function fillCategories(selected) {
    const select = form.elements.category;
    select.replaceChildren(el('option', { value: '', text: 'Choose a category' }),
      ...state.cfg.categories[state.type].map((c) => el('option', { value: c, text: c })));
    select.value = selected || '';
  }
  function updateSubmitLabel() {
    $('submit-label').textContent = state.editingId ? 'Save Changes' : (form.elements.status.value === 'draft' ? 'Save as Draft' : 'Publish Product');
  }
  function setSubmitting(on) {
    state.submitting = on;
    $('submit-btn').disabled = on;
    $('submit-btn').querySelector('.spinner').hidden = !on;
  }
  function clearPreview() {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null; $('preview').hidden = true; $('preview-img').removeAttribute('src');
  }
  function setType(type) {
    state.type = type;
    document.querySelectorAll('.type-btn').forEach((b) => {
      const on = b.dataset.type === type;
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
    $('image-label').textContent = COPY[type].image;
    $('title-label').textContent = COPY[type].name;
    $('resolution-field').hidden = type !== 'wallpaper';
    fillCategories(form.elements.category.value);
    $('form-title').textContent = state.editingId ? `Edit ${type === 'ebook' ? 'eBook' : 'wallpaper'}` : COPY[type].heading;
  }
  function resetForm() {
    form.reset(); clearErrors(); clearPreview();
    state.editingId = null; $('cancel-edit').hidden = true;
    $('image-hint').textContent = 'JPG, JPEG, PNG or WEBP, up to 5 MB.';
    fillCategories(''); setType(state.type); updateSubmitLabel();
  }

  // ----- validation (the server validates again) -----
  function validate() {
    const f = form.elements, errors = {};
    const file = f.image.files[0];
    if (!file && !state.editingId) errors.image = 'Choose an image to upload.';
    if (file && !TYPES_OK.includes(file.type)) errors.image = 'Use a JPG, PNG or WEBP image.';
    else if (file && file.size > MAX_BYTES) errors.image = 'The image must be 5 MB or smaller.';
    const title = f.title.value.trim();
    if (title.length < 3 || title.length > 120) errors.title = 'Enter a name of 3–120 characters.';
    if (!f.category.value) errors.category = 'Choose a category.';
    const desc = f.description.value.trim();
    if (desc.length < 10 || desc.length > 2000) errors.description = 'Enter a description of 10–2000 characters.';
    if (!/^\d{1,4}(\.\d{1,2})?$/.test(f.price.value.trim())) errors.price = 'Enter a price in USD, for example 9.99.';
    if (!SB.safeGumroadUrl(f.gumroadUrl.value.trim(), state.cfg.allowedGumroadHosts)) {
      errors.gumroadUrl = `Enter an https:// link on an allowed host (${state.cfg.allowedGumroadHosts.join(', ')}).`;
    }
    if (f.resolution.value.trim() && state.type === 'wallpaper' && !/^\d{3,5}\s*[x×]\s*\d{3,5}$/i.test(f.resolution.value.trim())) {
      errors.resolution = 'Use the format 3840x2160.';
    }
    return errors;
  }

  // ----- events -----
  document.querySelectorAll('.type-btn').forEach((b) => b.addEventListener('click', () => {
    if (state.editingId) resetForm();
    setType(b.dataset.type);
    updateSubmitLabel();
  }));
  form.elements.status.addEventListener('change', updateSubmitLabel);

  form.elements.image.addEventListener('change', () => {
    clearPreview();
    const file = form.elements.image.files[0];
    const box = document.querySelector('[data-error-for="image"]');
    box.textContent = '';
    if (!file) return;
    if (!TYPES_OK.includes(file.type)) { box.textContent = 'Use a JPG, PNG or WEBP image.'; form.elements.image.value = ''; return; }
    if (file.size > MAX_BYTES) { box.textContent = 'The image must be 5 MB or smaller.'; form.elements.image.value = ''; return; }
    state.previewUrl = URL.createObjectURL(file);
    $('preview-img').src = state.previewUrl;
    $('preview').hidden = false;
  });

  $('cancel-edit').addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.submitting) return;
    clearErrors();
    const errors = validate();
    if (Object.keys(errors).length) { showErrors(errors); toast('Fix the highlighted fields.', 'error'); return; }

    const fd = new FormData(form);
    fd.set('type', state.type);
    if (!form.elements.image.files[0]) fd.delete('image');
    const editing = state.editingId;
    setSubmitting(true);
    try {
      const data = await api(editing ? `/api/admin/products/${editing}` : '/api/admin/products', {
        method: editing ? 'PUT' : 'POST', headers: { 'X-CSRF-Token': state.csrf }, body: fd
      });
      const live = data.product.status === 'published';
      toast(editing ? 'Changes saved.' : (live ? 'Product published. It is now in the shop.' : 'Draft saved.'), 'success');
      resetForm();
      await loadList();
    } catch (err) {
      if (err.status === 401) return toLogin();
      if (err.errors) showErrors(err.errors);
      toast(err.message, 'error');
    } finally { setSubmitting(false); }
  });

  $('logout-btn').addEventListener('click', async () => {
    try { await api('/api/admin/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    location.assign('login.html');
  });

  // ----- delete confirmation dialog -----
  function confirmDialog(title, text) {
    return new Promise((resolve) => {
      const d = $('confirm-dialog');
      $('confirm-title').textContent = title; $('confirm-text').textContent = text;
      d.returnValue = 'cancel';
      d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
      d.showModal();
    });
  }

  // ----- product list -----
  async function loadList() {
    const box = $('admin-list');
    try {
      state.products = (await api('/api/admin/products')).products;
      renderList();
    } catch (err) {
      if (err.status === 401) return toLogin();
      SB.setState(box, 'error', err.message);
    }
  }

  function renderList() {
    const box = $('admin-list');
    const filter = $('list-filter').value;
    const list = state.products.filter((p) => !filter || p.type === filter);
    if (!list.length) { SB.setState(box, 'empty', 'No products yet. Use the form above to upload your first one.'); return; }
    box.replaceChildren(...list.map((p) => {
      const published = p.status === 'published';
      return el('div', { class: 'admin-row' },
        el('img', { src: p.image, alt: '', width: 72, height: 72, loading: 'lazy' }),
        el('div', null,
          el('h3', { text: p.title }),
          el('div', { class: 'row-meta' },
            el('span', { class: 'badge', text: p.type === 'ebook' ? 'eBook' : 'Wallpaper' }),
            el('span', { class: `badge ${published ? 'badge-live' : 'badge-draft'}`, text: published ? 'Published' : 'Draft' }),
            el('span', { text: SB.formatPrice(p.price, p.currency) }),
            el('span', { text: p.category }))),
        el('div', { class: 'row-actions' },
          el('button', { type: 'button', class: 'btn btn-ghost btn-sm', 'aria-label': `Edit ${p.title}`, text: 'Edit', onclick: () => startEdit(p) }),
          el('button', { type: 'button', class: 'btn btn-ghost btn-sm', 'aria-label': `${published ? 'Unpublish' : 'Publish'} ${p.title}`, text: published ? 'Unpublish' : 'Publish', onclick: () => setStatus(p, published ? 'draft' : 'published') }),
          el('button', { type: 'button', class: 'btn btn-danger btn-sm', 'aria-label': `Delete ${p.title}`, text: 'Delete', onclick: () => remove(p) })));
    }));
  }
  $('list-filter').addEventListener('change', renderList);

  function startEdit(p) {
    resetForm();
    state.editingId = p.id;
    setType(p.type);
    const f = form.elements;
    f.title.value = p.title; f.description.value = p.description; f.price.value = String(p.price);
    f.gumroadUrl.value = p.gumroadUrl; f.tags.value = (p.tags || []).join(', ');
    f.resolution.value = p.resolution || ''; f.status.value = p.status;
    fillCategories(p.category);
    $('preview-img').src = p.image; $('preview').hidden = false;
    $('image-hint').textContent = 'Current image shown. Choose a new file only if you want to replace it.';
    $('cancel-edit').hidden = false;
    updateSubmitLabel();
    $('form-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    f.title.focus({ preventScroll: true });
  }

  async function setStatus(p, status) {
    try {
      await api(`/api/admin/products/${p.id}/status`, {
        method: 'PATCH', headers: { 'X-CSRF-Token': state.csrf, 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
      });
      toast(status === 'published' ? 'Published. It is now visible in the shop.' : 'Moved back to draft.', 'success');
      await loadList();
    } catch (err) { if (err.status === 401) return toLogin(); toast(err.message, 'error'); }
  }

  async function remove(p) {
    if (!(await confirmDialog('Delete product?', `"${p.title}" and its image will be permanently deleted.`))) return;
    try {
      await api(`/api/admin/products/${p.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': state.csrf } });
      if (state.editingId === p.id) resetForm();
      toast('Product deleted.', 'success');
      await loadList();
    } catch (err) { if (err.status === 401) return toLogin(); toast(err.message, 'error'); }
  }

  resetForm();
  SB.setState($('admin-list'), 'loading', 'Loading products…');
  await loadList();
})();

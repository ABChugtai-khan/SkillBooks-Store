/* Lightweight 3D hero: a few floating books and a particle field.
   Skips itself if WebGL or Three.js is unavailable. Respects reduced motion. */
(function () {
  'use strict';
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || !window.THREE) return;
  const THREE = window.THREE;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: (navigator.hardwareConcurrency || 4) > 2, powerPreference: 'low-power' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  scene.add(new THREE.AmbientLight(0x9999ff, 0.9));
  const l1 = new THREE.PointLight(0x8b5cf6, 2.4, 40); l1.position.set(5, 5, 6); scene.add(l1);
  const l2 = new THREE.PointLight(0x38bdf8, 2.0, 40); l2.position.set(-6, -3, 5); scene.add(l2);

  const group = new THREE.Group();
  scene.add(group);
  const colors = [0x7c3aed, 0x2563eb, 0x9333ea, 0x0ea5e9, 0x6d28d9];
  const books = colors.map((color, i) => {
    const book = new THREE.Group();
    book.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.3),
      new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.35, emissive: color, emissiveIntensity: 0.18 })));
    const pages = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.98, 0.34), new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.9 }));
    pages.position.x = 0.06;
    book.add(pages);
    const angle = (i / colors.length) * Math.PI * 2;
    book.position.set(Math.cos(angle) * 2.6, Math.sin(angle) * 1.5, Math.sin(angle * 2) * 0.8);
    book.rotation.set(0.3 * i, 0.5 * i, 0.15 * i);
    book.userData = { phase: i * 1.3, spin: 0.2 + i * 0.05 };
    group.add(book);
    return book;
  });

  const N = 160, pos = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 16;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xa78bfa, size: 0.04, transparent: true, opacity: 0.8 }));
  scene.add(points);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    group.position.x = w / h > 1.2 ? 2.8 : 0;
    group.scale.setScalar(w / h > 1.2 ? 1 : 0.7);
  }
  window.addEventListener('resize', resize);
  resize();

  let mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

  const clock = new THREE.Clock();
  let running = false, visible = true, rafId = 0;
  function frame() {
    const t = clock.getElapsedTime();
    books.forEach((b) => {
      b.position.y += Math.sin(t + b.userData.phase) * 0.002;
      b.rotation.y += 0.004 * b.userData.spin * 4;
    });
    group.rotation.y += (mx * 0.5 - group.rotation.y) * 0.04;
    group.rotation.x += (my * 0.3 - group.rotation.x) * 0.04;
    points.rotation.y = t * 0.02;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  function update() {
    const shouldRun = visible && !document.hidden && !reduce;
    if (shouldRun && !running) { running = true; clock.start(); rafId = requestAnimationFrame(frame); }
    else if (!shouldRun && running) { running = false; cancelAnimationFrame(rafId); }
  }
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; update(); }).observe(canvas);
  document.addEventListener('visibilitychange', update);
  renderer.render(scene, camera); // first frame, also the only frame when motion is reduced
  update();
})();

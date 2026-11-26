/* minimap.js — visão geral do escopo atual no canto do mapa: estações na cor da linha,
   retângulo da janela visível; clicar ou arrastar move a vista. */
(function (root) {
  'use strict';
  let canvas, ctx, box = null, dragging = false;

  function init(el) {
    canvas = el; ctx = canvas.getContext('2d');
    const go = e => {
      if (!box) return;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left - box.ox) / box.s + box.x, y = (e.clientY - r.top - box.oy) / box.s + box.y;
      Graph.centerOn(x, y);
    };
    canvas.addEventListener('pointerdown', e => { dragging = true; canvas.setPointerCapture(e.pointerId); go(e); });
    canvas.addEventListener('pointermove', e => { if (dragging) go(e); });
    canvas.addEventListener('pointerup', () => { dragging = false; });
    canvas.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
  }

  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function draw() {
    if (!canvas || canvas.offsetParent === null) return;
    const dpr = root.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const rects = Object.values(Graph.getRects()).concat(Object.values(Graph.getPills()));
    if (!rects.length) { box = null; return; }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    rects.forEach(r => { x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y); x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h); });
    const pad = 10, s = Math.min((W - pad * 2) / (x2 - x1 || 1), (H - pad * 2) / (y2 - y1 || 1));
    box = { x: x1, y: y1, s, ox: (W - (x2 - x1) * s) / 2, oy: (H - (y2 - y1) * s) / 2 };
    rects.forEach(r => {
      ctx.fillStyle = css('--' + (r.color || 'c0')) || '#888';
      ctx.fillRect(box.ox + (r.x - x1) * s, box.oy + (r.y - y1) * s, Math.max(2, r.w * s), Math.max(2, r.h * s));
    });
    const v = Graph.getView();
    ctx.strokeStyle = css('--ink'); ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(127,127,127,.12)';
    const vx = box.ox + (v.x - x1) * s, vy = box.oy + (v.y - y1) * s;
    ctx.fillRect(vx, vy, v.w * s, v.h * s);
    ctx.strokeRect(vx, vy, v.w * s, v.h * s);
  }

  root.Minimap = { init, draw };
})(window);

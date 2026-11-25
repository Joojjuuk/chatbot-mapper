/* graph.js — o mapa: nós arrastáveis, ligações, zoom e deslocamento. */
(function (root) {
  'use strict';

  const SVG_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const ICONS = {
    message: '<svg ' + SVG_ATTR + '><path d="M4 5h16v11H9l-5 4z"/></svg>',
    menu: '<svg ' + SVG_ATTR + '><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    input: '<svg ' + SVG_ATTR + '><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 12h5"/></svg>',
    action: '<svg ' + SVG_ATTR + '><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>',
    handoff: '<svg ' + SVG_ATTR + '><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    end: '<svg ' + SVG_ATTR + '><path d="M6 3v18M6 4h12l-2 4 2 4H6"/></svg>'
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let host, world, nodesEl, svg, zoomLabel;
  let view = { x: 80, y: 60, k: 1 };
  let selected = null, activeId = null, follow = true;
  let issues = {};
  let drag = null;
  let cb = {};

  function init(opts) {
    cb = opts.callbacks || {};
    host = opts.host; world = opts.world; nodesEl = opts.nodes; svg = opts.svg; zoomLabel = opts.zoomLabel;
    svg.innerHTML = '<defs>' + ['next', 'option', 'ok', 'fail', 'invalid', 'hl'].map(k =>
      '<marker id="arr-' + k + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arr arr-' + k + '" d="M0 0L10 5L0 10z"/></marker>').join('') + '</defs><g id="edge-layer"></g><path id="temp-edge" class="edge temp" d=""/>';

    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);
    host.addEventListener('wheel', e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, view.k * Math.exp(-e.deltaY * 0.0016));
    }, { passive: false });
    host.addEventListener('dblclick', e => {
      if (e.target.closest('.node')) return;
      const p = toWorld(e.clientX, e.clientY);
      showTypeMenu(e.clientX, e.clientY, type => cb.onCreate && cb.onCreate(type, p.x, p.y, null));
    });
    applyView();
  }

  /* ---------- coordenadas ---------- */
  function toWorld(cx, cy) {
    const r = host.getBoundingClientRect();
    return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k };
  }

  function applyView() {
    world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.k + ')';
    const g = 24 * view.k;
    host.style.backgroundSize = g + 'px ' + g + 'px';
    host.style.backgroundPosition = view.x + 'px ' + view.y + 'px';
    if (zoomLabel) zoomLabel.textContent = Math.round(view.k * 100) + '%';
  }

  function zoomAt(cx, cy, k) {
    k = Math.max(0.25, Math.min(1.6, k));
    const r = host.getBoundingClientRect();
    const wx = (cx - r.left - view.x) / view.k, wy = (cy - r.top - view.y) / view.k;
    view.k = k; view.x = cx - r.left - wx * k; view.y = cy - r.top - wy * k;
    applyView();
  }

  function zoomBy(f) {
    const r = host.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, view.k * f);
  }

  function nodeRect(n) {
    const el = nodesEl.querySelector('[data-id="' + n.id + '"]');
    return { x: n.x, y: n.y, w: el ? el.offsetWidth : 248, h: el ? el.offsetHeight : 120 };
  }

  function fit() {
    const flow = Store.get();
    if (!flow || !flow.nodes.length) return;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    flow.nodes.forEach(n => {
      const r = nodeRect(n);
      x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y); x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h);
    });
    const R = host.getBoundingClientRect(), pad = 50;
    const k = Math.max(0.3, Math.min(1, (R.width - pad * 2) / (x2 - x1), (R.height - pad * 2) / (y2 - y1)));
    view.k = k;
    view.x = (R.width - (x2 - x1) * k) / 2 - x1 * k;
    view.y = (R.height - (y2 - y1) * k) / 2 - y1 * k;
    applyView();
  }

  let anim = 0;
  function focusNode(id, keepZoom, animate) {
    const flow = Store.get();
    const n = flow && flow.nodes.find(x => x.id === id);
    if (!n) return;
    const R = host.getBoundingClientRect(), r = nodeRect(n);
    const k1 = keepZoom ? view.k : Math.max(view.k, 0.85);
    const x1 = R.width / 2 - (r.x + r.w / 2) * k1;
    const y1 = R.height / 2 - (r.y + r.h / 2) * k1;
    cancelAnimationFrame(anim);
    if (!animate) { view.k = k1; view.x = x1; view.y = y1; applyView(); return; }
    const k0 = view.k, x0 = view.x, y0 = view.y, t0 = performance.now(), D = 420;
    const step = t => {
      let u = Math.min(1, (t - t0) / D); u = 1 - Math.pow(1 - u, 3);
      view.k = k0 + (k1 - k0) * u; view.x = x0 + (x1 - x0) * u; view.y = y0 + (y1 - y0) * u;
      applyView();
      if (u < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  function viewCenter() {
    const r = host.getBoundingClientRect();
    return toWorld(r.left + r.width / 2, r.top + r.height / 2);
  }

  /* ---------- desenho ---------- */
  function render(issuesMap) {
    if (issuesMap) issues = issuesMap;
    const flow = Store.get();
    if (!flow) return;
    nodesEl.innerHTML = '';
    flow.nodes.forEach(n => nodesEl.appendChild(buildNode(n, flow)));
    drawEdges();
  }

  function buildNode(n, flow) {
    const el = document.createElement('div');
    const iss = issues[n.id] || { error: 0, warn: 0 };
    el.className = 'node t-' + n.type + ' s-' + n.status + (selected === n.id ? ' sel' : '') + (activeId === n.id ? ' active' : '');
    el.dataset.id = n.id;
    el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
    const preview = n.type === 'action' ? [n.system, n.text].filter(Boolean).join(' · ') : (n.text || '');
    const ports = Flow.ports(n);
    let html = '<div class="n-head"><i class="port in" data-port="in"></i><span class="n-ico">' + ICONS[n.type] + '</span>' +
      '<span class="n-title">' + esc(n.title) + '</span>' +
      (flow.settings.startNode === n.id ? '<span class="n-start">início</span>' : '') +
      '<span class="n-dot" title="' + esc(Flow.STATUS[n.status]) + '"></span></div>';
    html += '<div class="n-text' + (preview ? '' : ' empty') + '">' + esc(preview || 'Sem texto ainda') + '</div>';
    if (ports.length) {
      html += '<div class="n-ports">' + ports.map(p =>
        '<div class="n-port k-' + p.kind + (p.to ? ' linked' : '') + '" data-port="' + esc(p.port) + '"><span>' + esc(p.label) + '</span><i class="port out" data-port="' + esc(p.port) + '"></i></div>').join('') + '</div>';
    }
    const badges = [];
    if (iss.error) badges.push('<span class="b b-err" title="Erros de canal">⛔ ' + iss.error + '</span>');
    if (iss.warn) badges.push('<span class="b b-warn" title="Avisos">⚠ ' + iss.warn + '</span>');
    if (n.notes && n.notes.trim()) badges.push('<span class="b b-q" title="Pergunta em aberto">? aberta</span>');
    if (n.comments && n.comments.length) badges.push('<span class="b" title="Comentários">💬 ' + n.comments.length + '</span>');
    if (badges.length) html += '<div class="n-foot">' + badges.join('') + '</div>';
    el.innerHTML = html;
    return el;
  }

  function center(el) {
    const r = el.getBoundingClientRect(), w = world.getBoundingClientRect();
    return { x: (r.left - w.left + r.width / 2) / view.k, y: (r.top - w.top + r.height / 2) / view.k };
  }

  function curve(a, b) {
    const dx = Math.max(50, Math.min(240, Math.abs(b.x - a.x) * 0.5));
    return 'M' + a.x + ' ' + a.y + ' C' + (a.x + dx) + ' ' + a.y + ' ' + (b.x - dx) + ' ' + b.y + ' ' + b.x + ' ' + b.y;
  }

  function drawEdges() {
    const flow = Store.get();
    const layer = svg.querySelector('#edge-layer');
    layer.innerHTML = '';
    if (!flow) return;
    const m = Flow.map(flow);
    flow.nodes.forEach(n => {
      const from = nodesEl.querySelector('[data-id="' + n.id + '"]');
      if (!from) return;
      Flow.ports(n).forEach(p => {
        if (!p.to || !m[p.to]) return;
        const outEl = from.querySelector('.port.out[data-port="' + CSS.escape(p.port) + '"]');
        const toEl = nodesEl.querySelector('[data-id="' + p.to + '"] .port.in');
        if (!outEl || !toEl) return;
        const hl = selected && (selected === n.id || selected === p.to);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', curve(center(outEl), center(toEl)));
        path.setAttribute('class', 'edge e-' + p.kind + (hl ? ' hl' : ''));
        path.setAttribute('marker-end', 'url(#arr-' + (hl ? 'hl' : p.kind) + ')');
        path.dataset.from = n.id; path.dataset.to = p.to;
        layer.appendChild(path);
      });
    });
  }

  /* ---------- seleção e destaque ---------- */
  function select(id, silent) {
    selected = id;
    nodesEl.querySelectorAll('.node.sel').forEach(e => e.classList.remove('sel'));
    if (id) { const el = nodesEl.querySelector('[data-id="' + id + '"]'); if (el) el.classList.add('sel'); }
    drawEdges();
    if (!silent && cb.onSelect) cb.onSelect(id);
  }

  function setActive(id) {
    activeId = id;
    nodesEl.querySelectorAll('.node.active').forEach(e => e.classList.remove('active'));
    const el = id && nodesEl.querySelector('[data-id="' + id + '"]');
    if (el) {
      el.classList.add('active');
      if (follow) {
        focusNode(id, false, true);
      }
    }
  }

  function setFollow(v) { follow = !!v; }
  function getSelected() { return selected; }

  /* ---------- interação ---------- */
  function onDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.type-menu')) return;
    closeTypeMenu();
    const outPort = e.target.closest('.port.out');
    const nodeEl = e.target.closest('.node');
    if (outPort && nodeEl) {
      host.setPointerCapture(e.pointerId);
      drag = { type: 'link', from: nodeEl.dataset.id, port: outPort.dataset.port };
      e.preventDefault();
      return;
    }
    if (nodeEl) {
      const flow = Store.get();
      const n = flow.nodes.find(x => x.id === nodeEl.dataset.id);
      host.setPointerCapture(e.pointerId);
      drag = { type: 'node', n, el: nodeEl, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false };
      if (selected !== n.id) select(n.id);
      return;
    }
    host.setPointerCapture(e.pointerId);
    drag = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
    host.classList.add('panning');
  }

  function onMove(e) {
    if (!drag) return;
    if (drag.type === 'pan') {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      view.x = drag.ox + dx; view.y = drag.oy + dy; applyView();
    } else if (drag.type === 'node') {
      const dx = (e.clientX - drag.sx) / view.k, dy = (e.clientY - drag.sy) / view.k;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) * 1 > 3 / view.k) { drag.moved = true; Store.checkpoint(); }
      if (drag.moved) {
        drag.n.x = Math.round(drag.ox + dx); drag.n.y = Math.round(drag.oy + dy);
        drag.el.style.left = drag.n.x + 'px'; drag.el.style.top = drag.n.y + 'px';
        drawEdges();
      }
    } else if (drag.type === 'link') {
      const src = nodesEl.querySelector('[data-id="' + drag.from + '"] .port.out[data-port="' + CSS.escape(drag.port) + '"]');
      if (!src) return;
      const a = center(src), b = toWorld(e.clientX, e.clientY);
      svg.querySelector('#temp-edge').setAttribute('d', curve(a, b));
      const over = document.elementFromPoint(e.clientX, e.clientY);
      nodesEl.querySelectorAll('.node.drop').forEach(x => x.classList.remove('drop'));
      const t = over && over.closest('.node');
      if (t && t.dataset.id !== drag.from) t.classList.add('drop');
    }
  }

  function onUp(e) {
    if (!drag) return;
    const d = drag; drag = null;
    host.classList.remove('panning');
    try { host.releasePointerCapture(e.pointerId); } catch (err) { /* ignora */ }
    if (d.type === 'pan') {
      if (!d.moved) select(null);
    } else if (d.type === 'node') {
      if (d.moved) Store.update(() => { }, { snapshot: false, source: 'graph' });
    } else if (d.type === 'link') {
      svg.querySelector('#temp-edge').setAttribute('d', '');
      nodesEl.querySelectorAll('.node.drop').forEach(x => x.classList.remove('drop'));
      const over = document.elementFromPoint(e.clientX, e.clientY);
      const t = over && over.closest('.node');
      if (t && t.dataset.id !== d.from) {
        Store.update(flow => { Flow.setLink(flow.nodes.find(x => x.id === d.from), d.port, t.dataset.id); }, { source: 'graph' });
      } else if (!t && over && host.contains(over)) {
        const p = toWorld(e.clientX, e.clientY);
        showTypeMenu(e.clientX, e.clientY, type => cb.onCreate && cb.onCreate(type, p.x + 20, p.y - 20, { from: d.from, port: d.port }));
      }
    }
  }

  /* Menu flutuante para escolher o tipo de um novo nó. */
  function showTypeMenu(cx, cy, onPick) {
    closeTypeMenu();
    const r = host.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'type-menu';
    menu.style.left = Math.min(cx - r.left, r.width - 230) + 'px';
    menu.style.top = Math.min(cy - r.top, r.height - 270) + 'px';
    menu.innerHTML = '<div class="tm-title">Novo nó</div>' + Object.keys(Flow.TYPES).map(t =>
      '<button type="button" data-type="' + t + '"><span class="n-ico t-' + t + '">' + ICONS[t] + '</span><span><b>' + esc(Flow.TYPES[t].label) + '</b><small>' + esc(Flow.TYPES[t].hint) + '</small></span></button>').join('');
    menu.addEventListener('click', e => {
      const b = e.target.closest('button[data-type]');
      if (!b) return;
      closeTypeMenu(); onPick(b.dataset.type);
    });
    host.appendChild(menu);
  }
  function closeTypeMenu() { host.querySelectorAll('.type-menu').forEach(m => m.remove()); }

  root.Graph = { init, render, drawEdges, select, setActive, setFollow, getSelected, fit, focusNode, zoomBy, viewCenter, showTypeMenu, closeTypeMenu, ICONS };
})(window);

/* graph.js — o mapa: faixas por grupo (linhas), estações (passos), ligações em traçado de metrô,
   escopo (principal ou subfluxo), seleção múltipla, laço, pan/zoom e realces (filtro, cobertura, comparação). */
(function (root) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NODE_W = 256, LANE_HEAD = 52, LANE_FOOT = 26, COLLAPSED_H = 116, PAD_X = 56;

  let host, world, lanesEl, nodesEl, svg, zoomLabel, marqueeEl = null;
  let view = { x: 80, y: 70, k: 1 };
  let scope = null;
  let sel = new Set(), activeId = null, follow = true;
  let issues = {}, filter = null, overlay = { uncovered: null, added: null, changed: null };
  let drag = null, cb = {};
  let rects = {}, portDy = {}, pills = {}, shiftFn = () => 0;

  function init(opts) {
    cb = opts.callbacks || {};
    host = opts.host; world = opts.world; lanesEl = opts.lanes; nodesEl = opts.nodes; svg = opts.svg; zoomLabel = opts.zoomLabel;
    const keys = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
    svg.innerHTML = '<defs>' + keys.map(k =>
      '<marker id="arr-' + k + '" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="4.2" markerHeight="4.2" markerUnits="strokeWidth" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z" style="fill:var(--' + k + ')"/></marker>').join('') +
      '</defs><g id="edge-layer"></g><path id="temp-edge" class="edge temp" d=""/>';

    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);
    host.addEventListener('wheel', e => {
      if (e.target.closest('#map-top,#map-hud,#bulkbar,.type-menu')) return;
      e.preventDefault();
      if (e.shiftKey) { view.x -= e.deltaY; applyView(); return; }
      zoomAt(e.clientX, e.clientY, view.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
    }, { passive: false });
    host.addEventListener('dblclick', e => {
      if (e.target.closest('#map-top,#map-hud,#bulkbar,.type-menu,.lane-pill,.lane-sign')) return;
      const nodeEl = e.target.closest('.node');
      if (nodeEl) {
        const n = Store.get().nodes.find(x => x.id === nodeEl.dataset.id);
        if (n && n.type === 'call' && n.target && cb.onOpenScope) cb.onOpenScope(n.target);
        return;
      }
      const p = toWorld(e.clientX, e.clientY);
      showTypeMenu(e.clientX, e.clientY, type => cb.onCreate && cb.onCreate(type, p.x, p.y, null));
    });
    host.addEventListener('click', e => {
      const t = e.target.closest('[data-lane-toggle]');
      if (t) { e.stopPropagation(); if (cb.onToggleGroup) cb.onToggleGroup(t.dataset.laneToggle); return; }
      const open = e.target.closest('[data-open-scope]');
      if (open) { e.stopPropagation(); if (cb.onOpenScope) cb.onOpenScope(open.dataset.openScope); }
    });
    applyView();
  }

  /* ---------- coordenadas e vista ---------- */
  function toWorld(cx, cy) {
    const r = host.getBoundingClientRect();
    return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k };
  }

  let viewRaf = 0;
  function applyView() {
    world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.k + ')';
    world.style.setProperty('--inv', Math.min(2.2, Math.max(1, 0.62 / view.k)).toFixed(3));
    if (zoomLabel) zoomLabel.textContent = Math.round(view.k * 100) + '%';
    if (cb.onViewChange && !viewRaf) viewRaf = requestAnimationFrame(() => { viewRaf = 0; cb.onViewChange(); });
  }

  function zoomAt(cx, cy, k) {
    k = Math.max(0.2, Math.min(1.8, k));
    const r = host.getBoundingClientRect();
    const wx = (cx - r.left - view.x) / view.k, wy = (cy - r.top - view.y) / view.k;
    view.k = k; view.x = cx - r.left - wx * k; view.y = cy - r.top - wy * k;
    applyView();
  }
  function zoomBy(f) { const r = host.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, view.k * f); }

  function bounds() {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    const add = r => { x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y); x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h); };
    Object.values(rects).forEach(add);
    Array.from(lanesEl.children).forEach(el => add({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
    return x1 === Infinity ? null : { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  function fit() {
    const b = bounds();
    if (!b) return;
    const top = host.querySelector('#map-top');
    const R = host.getBoundingClientRect(), padX = 40, padTop = (top ? top.offsetHeight : 40) + 26, padBottom = 70;
    const k = Math.max(0.25, Math.min(1, (R.width - padX * 2) / b.w, (R.height - padTop - padBottom) / b.h));
    view.k = k;
    view.x = (R.width - b.w * k) / 2 - b.x * k;
    view.y = padTop + (R.height - padTop - padBottom - b.h * k) / 2 - b.y * k;
    applyView();
  }

  let anim = 0;
  function animateTo(k1, x1, y1) {
    cancelAnimationFrame(anim);
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { view.k = k1; view.x = x1; view.y = y1; applyView(); return; }
    const k0 = view.k, x0 = view.x, y0 = view.y, t0 = performance.now(), D = 380;
    const step = t => {
      let u = Math.min(1, (t - t0) / D); u = 1 - Math.pow(1 - u, 3);
      view.k = k0 + (k1 - k0) * u; view.x = x0 + (x1 - x0) * u; view.y = y0 + (y1 - y0) * u;
      applyView();
      if (u < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  function focusNode(id, keepZoom, animate) {
    const r = rects[id];
    if (!r) return;
    const R = host.getBoundingClientRect();
    const k1 = keepZoom ? view.k : Math.max(view.k, 0.85);
    const x1 = R.width / 2 - (r.x + r.w / 2) * k1, y1 = R.height / 2 - (r.y + r.h / 2) * k1;
    if (animate) animateTo(k1, x1, y1); else { view.k = k1; view.x = x1; view.y = y1; applyView(); }
  }

  function centerOn(wx, wy) {
    const R = host.getBoundingClientRect();
    view.x = R.width / 2 - wx * view.k; view.y = R.height / 2 - wy * view.k;
    applyView();
  }

  function viewCenter() { const r = host.getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); }
  function getView() { const r = host.getBoundingClientRect(); return { x: -view.x / view.k, y: -view.y / view.k, w: r.width / view.k, h: r.height / view.k, k: view.k }; }

  /* ---------- desenho ---------- */
  const groupColor = (flow, gid) => { const g = (flow.groups || []).find(x => x.id === gid); return g ? g.color : 'c0'; };

  function rawLanes(nodes) {
    const lanes = {};
    nodes.forEach(n => {
      if (!n.group) return;
      const L = lanes[n.group] = lanes[n.group] || { minY: Infinity, maxY: -Infinity, count: 0 };
      L.minY = Math.min(L.minY, n.y); L.maxY = Math.max(L.maxY, n.y + Flow.estimateHeight(n)); L.count++;
    });
    return lanes;
  }

  function render(issuesMap) {
    if (issuesMap) issues = issuesMap;
    const flow = Store.get();
    if (!flow) return;
    const nodes = Flow.scopeNodes(flow, scope);
    const groups = flow.groups || [];
    const gIndex = {}; groups.forEach((g, i) => { gIndex[g.id] = i; });
    const collapsed = new Set(groups.filter(g => g.collapsed).map(g => g.id));
    const raw = rawLanes(nodes);

    /* faixas recolhidas encolhem: o que está abaixo delas sobe */
    const cuts = Object.keys(raw).filter(gid => collapsed.has(gid)).map(gid => {
      const L = raw[gid];
      return { bottom: L.maxY, cut: Math.max(0, (L.maxY - L.minY + LANE_HEAD + LANE_FOOT) - COLLAPSED_H - 40) };
    });
    shiftFn = y => cuts.reduce((s, c) => s + (y >= c.bottom ? c.cut : 0), 0);

    nodesEl.innerHTML = ''; lanesEl.innerHTML = '';
    rects = {}; portDy = {}; pills = {};
    const visible = nodes.filter(n => !(n.group && collapsed.has(n.group)));
    const frag = document.createDocumentFragment();
    const els = visible.map(n => { const el = buildNode(n, flow); frag.appendChild(el); return el; });
    nodesEl.appendChild(frag);
    visible.forEach((n, i) => {
      const el = els[i];
      rects[n.id] = { x: n.x, y: n.y - shiftFn(n.y), w: el.offsetWidth, h: el.offsetHeight, color: groupColor(flow, n.group) };
      const pd = {};
      el.querySelectorAll('.n-port[data-port]').forEach(p => { pd[p.dataset.port] = p.offsetTop + p.offsetHeight / 2; });
      portDy[n.id] = pd;
    });

    /* faixas com largura comum */
    let minX = Infinity, maxX = -Infinity;
    nodes.forEach(n => { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x + NODE_W); });
    const left = minX - PAD_X, width = maxX - minX + PAD_X * 2;
    Object.keys(raw).sort((a, b) => (gIndex[a] || 0) - (gIndex[b] || 0)).forEach(gid => {
      const g = groups.find(x => x.id === gid);
      if (!g) return;
      const num = gIndex[gid] + 1, color = g.color, L = raw[gid], isCol = collapsed.has(gid);
      const lane = document.createElement('div');
      lane.className = 'lane' + (isCol ? ' collapsed' : '');
      lane.style.setProperty('--lc', 'var(--' + color + ')');
      let top, height;
      if (isCol) {
        top = L.minY - shiftFn(L.minY) - LANE_HEAD; height = COLLAPSED_H;
      } else {
        const mine = visible.filter(n => n.group === gid).map(n => rects[n.id]);
        top = Math.min(...mine.map(r => r.y)) - LANE_HEAD;
        height = Math.max(...mine.map(r => r.y + r.h)) - top + LANE_FOOT;
      }
      lane.style.left = left + 'px'; lane.style.top = top + 'px'; lane.style.width = width + 'px'; lane.style.height = height + 'px';
      lane.dataset.group = gid;
      const rd = '<span class="roundel' + (color === 'c4' ? ' dark-ink' : '') + '">' + num + '</span>';
      lane.innerHTML = '<div class="lane-sign">' + rd + '<b>' + esc(g.name) + '</b><small>' + L.count + (L.count === 1 ? ' passo' : ' passos') + '</small>' +
        '<button type="button" class="ico-btn" data-lane-toggle="' + esc(gid) + '" title="' + (isCol ? 'Expandir a linha' : 'Recolher a linha') + '" aria-label="' + (isCol ? 'Expandir' : 'Recolher') + ' ' + esc(g.name) + '">' + Icons.get(isCol ? 'expand' : 'collapse') + '</button></div>';
      lanesEl.appendChild(lane);
      if (isCol) {
        const pill = document.createElement('button');
        pill.type = 'button'; pill.className = 'lane-pill'; pill.dataset.laneToggle = gid;
        pill.style.setProperty('--lc', 'var(--' + color + ')');
        const px = minX + 8, py = top + LANE_HEAD;
        pill.style.left = px + 'px'; pill.style.top = py + 'px';
        pill.innerHTML = rd + esc(g.name) + ' <small>· ' + L.count + ' passos recolhidos</small>';
        pill.title = 'Expandir a linha ' + g.name;
        lanesEl.appendChild(pill);
        pills[gid] = { x: px, y: py, w: pill.offsetWidth, h: pill.offsetHeight, color };
      }
    });
    drawEdges();
  }

  function preview(n) {
    if (n.type === 'action') return [n.system, n.text].filter(Boolean).join(' · ');
    if (n.type === 'return') return 'Volta para o passo que chamou este subfluxo.';
    return n.text || '';
  }

  function buildNode(n, flow) {
    const el = document.createElement('div');
    const iss = issues[n.id] || { error: 0, warn: 0 };
    const color = groupColor(flow, n.group);
    let cls = 'node t-' + n.type + ' s-' + n.status;
    if (sel.has(n.id)) cls += ' sel';
    if (activeId === n.id) cls += ' active';
    if (filter && !Flow.matchesFilter(n, filter)) cls += ' dim';
    if (overlay.uncovered && overlay.uncovered.has(n.id)) cls += ' uncovered';
    if (overlay.added && overlay.added.has(n.id)) cls += ' diff-add';
    if (overlay.changed && overlay.changed.has(n.id)) cls += ' diff-chg';
    el.className = cls;
    el.dataset.id = n.id;
    el.style.setProperty('--lc', 'var(--' + color + ')');
    el.style.left = n.x + 'px'; el.style.top = (n.y - shiftFn(n.y)) + 'px';
    const isStart = Flow.scopeStart(flow, scope) === n.id;
    const pv = preview(n);
    const ports = Flow.ports(n);
    let html = '<div class="n-head"><i class="port in" data-port="in"></i>' + Icons.mark(n.type === 'call' ? 'call' : n.status) +
      '<span class="n-title" title="' + esc(n.title) + '">' + esc(n.title) + '</span>' +
      (isStart ? '<span class="n-start">início</span>' : '') +
      '<span class="n-type" title="' + esc(Flow.TYPES[n.type].label) + '">' + Icons.get(n.type) + '</span></div>';
    if (n.type === 'call') {
      const sf = Flow.subflow(flow, n.target);
      html += '<div class="n-call">' + (sf ? '<span>Baldeação: <b>' + esc(sf.name) + '</b></span><button type="button" class="linkbtn" data-open-scope="' + esc(sf.id) + '">Abrir</button>' : '<span>Escolha o subfluxo no painel.</span>') + '</div>';
    } else {
      html += '<div class="n-text' + (pv ? '' : ' empty') + '">' + (pv ? esc(pv).replace(/\{\{\s*([\w.]+)\s*\}\}/g, '<code>$1</code>').replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(^|[\s(>])_([^_\n]+)_(?=$|[\s).,!?<])/g, '$1<i>$2</i>') : 'Sem texto ainda') + '</div>';
    }
    if (ports.length) {
      html += '<div class="n-ports">' + ports.map(p => {
        const c = p.kind === 'case' ? (n.cases || []).find(x => 'case:' + x.id === p.port) : null;
        const rule = c && c.when && c.when.length ? '<span class="rule" title="' + esc(Flow.ruleText(c, flow)) + '">' + Icons.get('filter') + '</span>' : '';
        return '<div class="n-port k-' + p.kind + (p.to ? ' linked' : '') + '" data-port="' + esc(p.port) + '"><span>' + esc(p.label) + '</span>' + rule + '<i class="port out" data-port="' + esc(p.port) + '"></i></div>';
      }).join('') + '</div>';
    }
    const badges = [];
    if (overlay.added && overlay.added.has(n.id)) badges.push('<span class="b b-new">Novo</span>');
    if (overlay.changed && overlay.changed.has(n.id)) badges.push('<span class="b b-chg">Alterado</span>');
    if (overlay.uncovered && overlay.uncovered.has(n.id)) badges.push('<span class="b b-cov">Sem teste</span>');
    if (iss.error) badges.push('<span class="b b-err" title="Erros">' + Icons.get('error') + iss.error + '</span>');
    if (iss.warn) badges.push('<span class="b b-warn" title="Avisos">' + Icons.get('warn') + iss.warn + '</span>');
    if (n.notes && n.notes.trim()) badges.push('<span class="b b-q" title="Pergunta em aberto">' + Icons.get('question') + 'Em aberto</span>');
    const open = (n.comments || []).filter(c => !c.resolved).length;
    if (open) badges.push('<span class="b" title="Comentários não resolvidos">' + Icons.get('comment') + open + '</span>');
    if (n.type === 'message' && n.template && n.template.enabled) badges.push('<span class="b" title="Enviado como template da Meta">' + Icons.get('template') + 'Template</span>');
    if (badges.length) html += '<div class="n-foot">' + badges.join('') + '</div>';
    el.innerHTML = html;
    return el;
  }

  /* Polilinha ortogonal com cantos chanfrados a 45° (traço de mapa de metrô). */
  function chamfer(pts, c) {
    let d = 'M' + pts[0].x + ' ' + pts[0].y;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i - 1], q = pts[i], r = pts[i + 1];
      const l1 = Math.hypot(q.x - p.x, q.y - p.y), l2 = Math.hypot(r.x - q.x, r.y - q.y);
      if (!l1 || !l2) continue;
      const cut = Math.max(0, Math.min(c, l1 / 2, l2 / 2));
      d += 'L' + (q.x - (q.x - p.x) / l1 * cut) + ' ' + (q.y - (q.y - p.y) / l1 * cut) +
        'L' + (q.x + (r.x - q.x) / l2 * cut) + ' ' + (q.y + (r.y - q.y) / l2 * cut);
    }
    const z = pts[pts.length - 1];
    return d + 'L' + z.x + ' ' + z.y;
  }

  function transit(a, b, lane, below) {
    const dx = b.x - a.x, dy = b.y - a.y, ady = Math.abs(dy);
    const off = (lane % 4) * 7;
    if (dx >= 56) {
      if (ady < 1.5) return 'M' + a.x + ' ' + a.y + 'H' + b.x;
      const room = dx - 44;
      if (ady <= room) {
        /* reta, diagonal de 45°, reta */
        const slack = room - ady, x1 = a.x + 22 + Math.min(off, slack) + (slack - Math.min(off, slack)) / 2;
        return 'M' + a.x + ' ' + a.y + 'H' + x1 + 'L' + (x1 + ady) + ' ' + b.y + 'H' + b.x;
      }
      const x1 = a.x + 22 + off;
      return chamfer([a, { x: x1, y: a.y }, { x: x1, y: b.y }, b], 16);
    }
    /* volta para trás: contorna por baixo */
    const xa = a.x + 22 + off, xb = b.x - 26 - off, yl = below + 26 + off;
    return chamfer([a, { x: xa, y: a.y }, { x: xa, y: yl }, { x: xb, y: yl }, { x: xb, y: b.y }, b], 16);
  }

  function anchorOut(n, port, collapsed) {
    if (n.group && collapsed.has(n.group) && pills[n.group]) { const p = pills[n.group]; return { x: p.x + p.w, y: p.y + p.h / 2, bottom: p.y + p.h }; }
    const r = rects[n.id];
    if (!r) return null;
    return { x: r.x + r.w + 2, y: r.y + ((portDy[n.id] || {})[port] || r.h / 2), bottom: r.y + r.h };
  }
  function anchorIn(n, collapsed) {
    if (n.group && collapsed.has(n.group) && pills[n.group]) { const p = pills[n.group]; return { x: p.x - 2, y: p.y + p.h / 2, bottom: p.y + p.h }; }
    const r = rects[n.id];
    if (!r) return null;
    return { x: r.x - 2, y: r.y + 20, bottom: r.y + r.h };
  }

  function drawEdges() {
    const flow = Store.get();
    const layer = svg.querySelector('#edge-layer');
    if (!flow) { layer.innerHTML = ''; return; }
    const m = Flow.map(flow);
    const collapsed = new Set((flow.groups || []).filter(g => g.collapsed).map(g => g.id));
    const seen = new Set(), normal = [], top = [];
    Flow.scopeNodes(flow, scope).forEach(n => {
      Flow.ports(n).forEach((p, i) => {
        const t = m[p.to];
        if (!t || Flow.scopeOf(t) !== scope) return;
        if (n.group && n.group === t.group && collapsed.has(n.group)) return;
        const a = anchorOut(n, p.port, collapsed), b = anchorIn(t, collapsed);
        if (!a || !b) return;
        const key = Math.round(a.x) + ',' + Math.round(a.y) + '>' + Math.round(b.x) + ',' + Math.round(b.y);
        if (seen.has(key)) return;
        seen.add(key);
        const color = groupColor(flow, n.group);
        const hl = sel.has(n.id) || sel.has(t.id);
        const dim = filter && (!Flow.matchesFilter(n, filter) || !Flow.matchesFilter(t, filter));
        const d = transit(a, b, i, Math.max(a.bottom, b.bottom));
        (hl ? top : normal).push('<g class="edge-g' + (hl ? ' hl' : '') + (dim ? ' dim' : '') + '" style="--lc:var(--' + color + ')" data-from="' + esc(n.id) + '" data-to="' + esc(t.id) + '">' +
          '<path class="edge edge-case" d="' + d + '"/><path class="edge edge-line k-' + p.kind + '" d="' + d + '" marker-end="url(#arr-' + color + ')"/></g>');
      });
    });
    layer.innerHTML = normal.join('') + top.join('');
    if (cb.onViewChange) cb.onViewChange();
  }

  /* ---------- seleção e destaque ---------- */
  function paintSelection() {
    nodesEl.querySelectorAll('.node').forEach(e => e.classList.toggle('sel', sel.has(e.dataset.id)));
    drawEdges();
  }
  function setSelection(ids, silent) {
    sel = new Set((ids || []).filter(Boolean));
    paintSelection();
    if (!silent && cb.onSelect) cb.onSelect(Array.from(sel));
  }
  function select(id, silent) { setSelection(id ? [id] : [], silent); }
  function getSelection() { return Array.from(sel); }
  function getSelected() { return sel.size === 1 ? Array.from(sel)[0] : null; }

  function setActive(id) {
    activeId = id;
    nodesEl.querySelectorAll('.node.active').forEach(e => e.classList.remove('active'));
    const el = id && nodesEl.querySelector('[data-id="' + CSS.escape(id) + '"]');
    if (el) { el.classList.add('active'); if (follow) focusNode(id, false, true); }
  }
  function setFollow(v) { follow = !!v; }
  function setScope(s) { scope = s || null; sel = new Set(); }
  function getScope() { return scope; }
  function setFilter(f) { filter = f; }
  function setOverlay(o) { overlay = Object.assign({ uncovered: null, added: null, changed: null }, o || {}); }
  function getRects() { return rects; }
  function getPills() { return pills; }

  /* ---------- interação ---------- */
  function onDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.type-menu,#map-top,#map-hud,#bulkbar,.lane-sign,.lane-pill,[data-open-scope]')) return;
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
      const id = nodeEl.dataset.id;
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        const next = new Set(sel);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelection(Array.from(next));
        return;
      }
      if (!sel.has(id)) setSelection([id]);
      const flow = Store.get();
      const moving = flow.nodes.filter(n => sel.has(n.id));
      host.setPointerCapture(e.pointerId);
      drag = { type: 'node', items: moving.map(n => ({ n, ox: n.x, oy: n.y, el: nodesEl.querySelector('[data-id="' + CSS.escape(n.id) + '"]') })), sx: e.clientX, sy: e.clientY, moved: false };
      return;
    }
    host.setPointerCapture(e.pointerId);
    if (e.shiftKey) {
      const r = host.getBoundingClientRect();
      marqueeEl = document.createElement('div'); marqueeEl.id = 'marquee'; host.appendChild(marqueeEl);
      drag = { type: 'marquee', sx: e.clientX - r.left, sy: e.clientY - r.top, base: new Set(sel) };
      host.classList.add('marquee-on');
      return;
    }
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
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 3 / view.k) { drag.moved = true; Store.checkpoint(); }
      if (drag.moved) {
        drag.items.forEach(it => {
          it.n.x = Math.round(it.ox + dx); it.n.y = Math.round(it.oy + dy);
          const dispY = it.n.y - shiftFn(it.oy);
          if (it.el) { it.el.style.left = it.n.x + 'px'; it.el.style.top = dispY + 'px'; }
          const r = rects[it.n.id];
          if (r) { r.x = it.n.x; r.y = dispY; }
        });
        drawEdges();
      }
    } else if (drag.type === 'link') {
      const flow = Store.get(), n = flow.nodes.find(x => x.id === drag.from);
      const a = anchorOut(n, drag.port, new Set()), b = toWorld(e.clientX, e.clientY);
      if (a) svg.querySelector('#temp-edge').setAttribute('d', 'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y);
      const over = document.elementFromPoint(e.clientX, e.clientY);
      nodesEl.querySelectorAll('.node.drop').forEach(x => x.classList.remove('drop'));
      const t = over && over.closest('.node');
      if (t && t.dataset.id !== drag.from) t.classList.add('drop');
    } else if (drag.type === 'marquee') {
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const L = Math.min(x, drag.sx), T = Math.min(y, drag.sy), W = Math.abs(x - drag.sx), H = Math.abs(y - drag.sy);
      Object.assign(marqueeEl.style, { left: L + 'px', top: T + 'px', width: W + 'px', height: H + 'px' });
      const a = toWorld(r.left + L, r.top + T), b = toWorld(r.left + L + W, r.top + T + H);
      const hit = new Set(drag.base);
      Object.keys(rects).forEach(id => { const q = rects[id]; if (q.x < b.x && q.x + q.w > a.x && q.y < b.y && q.y + q.h > a.y) hit.add(id); });
      sel = hit;
      nodesEl.querySelectorAll('.node').forEach(el => el.classList.toggle('sel', sel.has(el.dataset.id)));
    }
  }

  function onUp(e) {
    if (!drag) return;
    const d = drag; drag = null;
    host.classList.remove('panning', 'marquee-on');
    try { host.releasePointerCapture(e.pointerId); } catch (err) { /* ignora */ }
    if (d.type === 'pan') {
      if (!d.moved) setSelection([]);
    } else if (d.type === 'node') {
      if (d.moved) Store.update(() => { }, { snapshot: false, source: 'graph' });
    } else if (d.type === 'marquee') {
      if (marqueeEl) { marqueeEl.remove(); marqueeEl = null; }
      setSelection(Array.from(sel));
    } else if (d.type === 'link') {
      svg.querySelector('#temp-edge').setAttribute('d', '');
      nodesEl.querySelectorAll('.node.drop').forEach(x => x.classList.remove('drop'));
      const over = document.elementFromPoint(e.clientX, e.clientY);
      const t = over && over.closest('.node');
      if (t && t.dataset.id !== d.from) {
        Store.update(flow => { Flow.setLink(flow.nodes.find(x => x.id === d.from), d.port, t.dataset.id); }, { source: 'graph' });
      } else if (!t && over && host.contains(over) && !over.closest('#map-top,#map-hud')) {
        const p = toWorld(e.clientX, e.clientY);
        showTypeMenu(e.clientX, e.clientY, type => cb.onCreate && cb.onCreate(type, p.x + 20, p.y - 20, { from: d.from, port: d.port }));
      }
    }
  }

  /* Menu flutuante para escolher o tipo de um novo passo. */
  function showTypeMenu(cx, cy, onPick) {
    closeTypeMenu();
    const r = host.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'type-menu';
    menu.setAttribute('role', 'menu');
    const types = Object.keys(Flow.TYPES).filter(t => t !== 'return' || scope);
    menu.style.left = Math.max(8, Math.min(cx - r.left, r.width - 270)) + 'px';
    menu.style.top = Math.max(8, Math.min(cy - r.top, r.height - (types.length * 52 + 40))) + 'px';
    menu.innerHTML = '<div class="tm-title">Novo passo</div>' + types.map(t =>
      '<button type="button" role="menuitem" data-type="' + t + '"><span class="tico">' + Icons.get(t) + '</span><span><b>' + esc(Flow.TYPES[t].label) + '</b><small>' + esc(Flow.TYPES[t].hint) + '</small></span></button>').join('');
    menu.addEventListener('click', e => {
      const b = e.target.closest('button[data-type]');
      if (!b) return;
      closeTypeMenu(); onPick(b.dataset.type);
    });
    menu.addEventListener('keydown', e => {
      const items = Array.from(menu.querySelectorAll('button')), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape') { e.stopPropagation(); closeTypeMenu(); host.focus(); }
    });
    host.appendChild(menu);
    const first = menu.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }
  function closeTypeMenu() { host.querySelectorAll('.type-menu').forEach(m => m.remove()); }

  root.Graph = {
    init, render, drawEdges, select, setSelection, getSelection, getSelected, setActive, setFollow, setScope, getScope,
    setFilter, setOverlay, fit, focusNode, centerOn, zoomBy, viewCenter, getView, getRects, getPills, showTypeMenu, closeTypeMenu
  };
})(window);

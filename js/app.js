/* app.js — liga as peças: barra superior, escopo e filtros do mapa, abas, simulador (gravar e tocar
   cenários), seleção múltipla, copiar/colar, exportações, arquivos e atalhos. */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const THEME_KEY = 'chatbot-mapper:theme';

  let tab = 'edit';
  let player = null, playerDirty = true, showTags = false;
  let rec = null;            // gravação em andamento: { steps, startAt, persona }
  let filter = { status: [], open: false, unresolved: false, groups: [] };
  let lastIssues = [];

  /* ---------- avisos ---------- */
  let toastTimer = null;
  function toast(msg, action) {
    const t = $('#toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button" id="toast-act">' + esc(action.label) + '</button>' : '');
    t.classList.add('show');
    if (action) $('#toast-act').onclick = () => { action.run(); t.classList.remove('show'); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), action ? 6000 : 3000);
  }

  /* ---------- abas ---------- */
  function setTab(name) {
    tab = name;
    $$('.tabs button').forEach(b => { const on = b.dataset.tab === name; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'tab-' + name));
    if (name === 'sim') ensurePlayer();
    if (name === 'tests' || name === 'data' || name === 'review') Panels.render(name);
  }

  /* ---------- simulador ---------- */
  function personaOf(id) { const f = Store.get(); return Flow.personaValues(f, id === undefined ? f.settings.persona : id); }

  function ensurePlayer(force, startAt, script) {
    if (!force && player && !playerDirty) return;
    if (player) player.destroy();
    playerDirty = false;
    $('#sim-stale').hidden = true;
    const opts = {
      delay: 550, showNodes: showTags, startAt: startAt || null, values: personaOf(script ? script.persona : undefined),
      onNode: id => { const n = Store.get().nodes.find(x => x.id === id); if (n && Flow.scopeOf(n) !== Graph.getScope()) openScope(Flow.scopeOf(n), true); Graph.setActive(id); },
      onChoice: step => { if (rec) { rec.steps.push(step); renderRecbar(); } }
    };
    if (script) {
      opts.script = script.steps;
      opts.onScriptEnd = (ok, why) => toast(ok ? 'Cenário "' + script.name + '" tocado até o fim.' : 'Cenário divergiu: ' + why);
    }
    player = ChatPlayer($('#sim-phone'), Store.get(), opts);
  }

  function syncPersona() {
    const f = Store.get(), sel = $('#sim-persona');
    sel.innerHTML = f.personas.length ? f.personas.map(p => '<option value="' + esc(p.id) + '"' + (p.id === f.settings.persona ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') : '<option value="">Sem personas (aba Dados)</option>';
    sel.disabled = !f.personas.length;
    playerDirty = true;
    if (tab === 'sim') ensurePlayer(true);
  }

  function startRec() {
    rec = { steps: [], startAt: null, persona: Store.get().settings.persona };
    $('#sim-rec').classList.add('rec');
    ensurePlayer(true, rec.startAt);
    renderRecbar();
  }
  function stopRec() { rec = null; $('#sim-rec').classList.remove('rec'); $('#sim-recbar').hidden = true; }
  function renderRecbar() {
    const bar = $('#sim-recbar');
    if (!rec) { bar.hidden = true; return; }
    bar.hidden = false;
    const prev = bar.querySelector('#rec-name');
    const name = prev ? prev.value : '';
    bar.innerHTML = '<span class="dot" aria-hidden="true"></span><span>Gravando · ' + rec.steps.length + (rec.steps.length === 1 ? ' escolha' : ' escolhas') + '</span>' +
      '<input id="rec-name" class="inp grow" placeholder="Nome do cenário" value="' + esc(name) + '" style="min-height:30px;padding:3px 8px">' +
      '<button type="button" class="btn sm" id="rec-save"' + (rec.steps.length ? '' : ' disabled') + '>Salvar</button><button type="button" class="ico-btn" id="rec-cancel" title="Descartar gravação" aria-label="Descartar gravação">' + Icons.get('x') + '</button>';
    $('#rec-save').onclick = saveRec;
    $('#rec-cancel').onclick = () => { stopRec(); toast('Gravação descartada.'); };
  }
  function saveRec() {
    if (!rec || !rec.steps.length) return;
    const f = Store.get();
    const name = ($('#rec-name').value || '').trim() || 'Cenário ' + (f.tests.length + 1);
    const test = { id: Flow.uid(new Set(f.tests.map(t => t.id)), 't'), name, startAt: rec.startAt, persona: rec.persona, steps: rec.steps.slice(), expectEnd: null };
    const r = Analysis.runTest(f, test);
    test.expectEnd = r.ok ? r.at : null;
    Store.update(fl => { fl.tests.push(test); }, { source: 'app' });
    stopRec();
    toast('Cenário "' + name + '" salvo com ' + test.steps.length + ' escolhas.', { label: 'Ver testes', run: () => setTab('tests') });
  }

  function playTest(test) {
    stopRec();
    setTab('sim');
    ensurePlayer(true, test.startAt, test);
  }

  /* ---------- escopo, filtros e realces ---------- */
  function openScope(sf, keepView) {
    const f = Store.get();
    if (sf && !Flow.subflow(f, sf)) return;
    Graph.setScope(sf || null);
    Inspector.show([]);
    refresh('scope');
    if (!keepView) requestAnimationFrame(() => Graph.fit());
  }

  function renderCrumbs() {
    const f = Store.get(), sc = Graph.getScope();
    let h = '<button type="button" class="crumb' + (sc ? '' : ' on') + '" data-scope=""' + (sc ? '' : ' aria-current="page"') + '>' + Icons.get('layout') + 'Fluxo principal</button>';
    if (sc) h += '<span class="crumb-sep">' + Icons.get('chevronRight') + '</span><button type="button" class="crumb on" aria-current="page">' + Icons.mark('call') + esc(Flow.scopeName(f, sc)) + '</button>';
    else if (f.subflows.length) h += '<span class="crumb-sep">' + Icons.get('chevronRight') + '</span><select class="crumb" data-scope-pick aria-label="Abrir subfluxo"><option value="">Subfluxos (' + f.subflows.length + ')</option>' + f.subflows.map(s => '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>').join('') + '</select>';
    $('#crumbs').innerHTML = h;
  }

  function renderFilters() {
    const f = Store.get();
    const nOpen = f.nodes.filter(n => n.notes && n.notes.trim()).length, nUn = f.nodes.filter(n => (n.comments || []).some(c => !c.resolved)).length;
    const st = Object.keys(Flow.STATUS).map(s => '<button type="button" class="chip" data-fs="' + s + '" aria-pressed="' + (filter.status.indexOf(s) >= 0) + '" title="Mostrar só: ' + esc(Flow.STATUS[s]) + '">' + Icons.mark(s) + '<span class="lbl">' + esc(Flow.STATUS[s]) + '</span></button>').join('');
    const active = filter.status.length || filter.open || filter.unresolved || filter.groups.length;
    $('#filters').innerHTML = '<span class="chip chip-ico" aria-hidden="true">' + Icons.get('filter') + '</span>' + st + '<span class="chip-sep"></span>' +
      '<button type="button" class="chip" data-fo="open" aria-pressed="' + filter.open + '">' + Icons.get('question') + '<span class="lbl">Em aberto</span> <span class="chip-count">' + nOpen + '</span></button>' +
      '<button type="button" class="chip" data-fo="unresolved" aria-pressed="' + filter.unresolved + '">' + Icons.get('comment') + '<span class="lbl">Não resolvidos</span> <span class="chip-count">' + nUn + '</span></button>' +
      (f.groups.length ? '<select data-fg aria-label="Filtrar por linha"><option value="">Todas as linhas</option>' + f.groups.map((g, i) => '<option value="' + esc(g.id) + '"' + (filter.groups[0] === g.id ? ' selected' : '') + '>' + (i + 1) + ' · ' + esc(g.name) + '</option>').join('') + '</select>' : '') +
      (active ? '<button type="button" class="chip" data-fclear>' + Icons.get('x') + 'Limpar</button>' : '');
  }
  function filterActive() { return filter.status.length || filter.open || filter.unresolved || filter.groups.length ? filter : null; }

  function refreshOverlay() {
    const f = Store.get();
    const o = {};
    if (Panels.coverageOn()) o.uncovered = new Set(Analysis.coverage(f).unvisited);
    Panels.refreshDiff();
    const d = Panels.diff();
    if (d) { o.added = new Set(d.added.map(x => x.id)); o.changed = new Set(d.changed.map(x => x.id)); }
    Graph.setOverlay(o);
    Graph.render();
  }

  /* ---------- atualização geral ---------- */
  function refresh(source) {
    const flow = Store.get();
    if (!flow) return;
    if (Graph.getScope() && !Flow.subflow(flow, Graph.getScope())) Graph.setScope(null);
    lastIssues = Flow.lint(flow, Meta);
    const map = {};
    lastIssues.forEach(i => {
      if (!i.nodeId || i.severity === 'info') return;
      const o = map[i.nodeId] = map[i.nodeId] || { error: 0, warn: 0 };
      o[i.severity]++;
    });
    Graph.setFilter(filterActive());
    const o = {};
    if (Panels.coverageOn()) o.uncovered = new Set(Analysis.coverage(flow).unvisited);
    Panels.refreshDiff();
    const d = Panels.diff();
    if (d) { o.added = new Set(d.added.map(x => x.id)); o.changed = new Set(d.changed.map(x => x.id)); }
    Graph.setOverlay(o);
    Graph.render(map);
    Graph.setSelection(Graph.getSelection().filter(id => flow.nodes.some(n => n.id === id)), true);
    if (source !== 'inspector') Inspector.render();
    if (source !== 'panels' && (tab === 'tests' || tab === 'data')) Panels.render(tab);
    Panels.render('review');
    if (source !== 'topbar') $('#flow-name').value = flow.meta.name;
    renderCrumbs(); renderFilters(); renderBulkbar();
    $('#btn-undo').disabled = !Store.canUndo();
    $('#btn-redo').disabled = !Store.canRedo();
    $('#empty-hint').hidden = Flow.scopeNodes(flow, Graph.getScope()).length > 0;
    document.title = flow.meta.name + ' · Chatbot Mapper';
    if (['load', 'scope', 'filter', 'view'].indexOf(source) < 0) { playerDirty = true; if (tab === 'sim' && !rec) $('#sim-stale').hidden = false; }
    Minimap.draw();
  }

  /* ---------- passos ---------- */
  function selectNode(id) {
    Graph.select(id);
    Graph.focusNode(id, true, true);
  }

  function goToNode(id) {
    const f = Store.get(), n = f.nodes.find(x => x.id === id);
    if (!n) return;
    if (Flow.scopeOf(n) !== Graph.getScope()) openScope(Flow.scopeOf(n), true);
    const g = n.group && f.groups.find(x => x.id === n.group);
    if (g && g.collapsed) Store.update(() => { g.collapsed = false; }, { source: 'view', snapshot: false });
    if (filterActive() && !Flow.matchesFilter(n, filter)) { filter = { status: [], open: false, unresolved: false, groups: [] }; refresh('filter'); }
    Graph.select(id);
    requestAnimationFrame(() => Graph.focusNode(id, false, true));
    setTab('edit');
  }

  function createNode(type, x, y, link) {
    let created = null;
    const scope = Graph.getScope();
    Store.update(flow => {
      created = Flow.newNode(type, x, y, flow, scope);
      if (link) {
        const from = flow.nodes.find(n => n.id === link.from);
        if (from) { Flow.setLink(from, link.port, created.id); created.group = from.group || null; }
      }
      if (type === 'call' && flow.subflows.length === 1) created.target = flow.subflows[0].id;
      flow.nodes.push(created);
      if (!Flow.scopeStart(flow, scope)) Flow.setScopeStart(flow, scope, created.id);
    }, { source: 'graph' });
    Graph.select(created.id);
    setTab('edit');
    setTimeout(() => { const t = $('#tab-edit [data-f="title"]'); if (t) { t.focus(); t.select(); } }, 30);
    return created;
  }

  function createNext(id) {
    const f = Store.get(), n = f.nodes.find(x => x.id === id);
    if (!n) return;
    const port = Flow.firstFreePort(n);
    const r = Graph.getRects()[id];
    const host = $('#map').getBoundingClientRect(), v = Graph.getView();
    const sx = host.left + ((r ? r.x + r.w : n.x + 256) + 80 - v.x) * v.k, sy = host.top + ((r ? r.y : n.y) - v.y) * v.k;
    Graph.showTypeMenu(sx, sy, type => {
      createNode(type, n.x + 340, n.y, port ? { from: n.id, port } : null);
      if (!port) toast('O passo de origem não tinha saída livre: o novo passo ficou sem ligação.');
    });
  }

  function deleteNodes(ids) {
    if (!ids.length) return;
    Store.update(f => ids.forEach(id => Flow.removeNode(f, id)), { source: 'graph' });
    Graph.setSelection([]);
    toast(ids.length === 1 ? 'Passo excluído' : ids.length + ' passos excluídos', { label: 'Desfazer', run: () => Store.undo() });
  }

  function copy() {
    const ids = Graph.getSelection();
    if (!ids.length) { toast('Selecione um ou mais passos para copiar.'); return; }
    if (Store.setClipboard(Analysis.copySelection(Store.get(), ids))) toast(ids.length === 1 ? 'Passo copiado.' : ids.length + ' passos copiados. Cole em qualquer fluxo com Ctrl+V.');
  }

  function paste() {
    const clip = Store.getClipboard();
    if (!clip || !clip.nodes || !clip.nodes.length) { toast('Nada copiado ainda.'); return; }
    const c = Graph.viewCenter();
    const minX = Math.min(...clip.nodes.map(n => n.x)), minY = Math.min(...clip.nodes.map(n => n.y));
    let nodes = [];
    Store.update(fl => {
      nodes = Analysis.remapPaste(clip, fl, { scope: Graph.getScope(), dx: Math.round(c.x - 120 - minX), dy: Math.round(c.y - 80 - minY) });
      nodes.forEach(n => fl.nodes.push(n));
    }, { source: 'graph' });
    Graph.setSelection(nodes.map(n => n.id));
    toast(nodes.length + (nodes.length === 1 ? ' passo colado.' : ' passos colados.'));
  }

  function bulk(kind, value) {
    const ids = Graph.getSelection();
    if (!ids.length) return;
    Store.update(f => f.nodes.filter(n => ids.indexOf(n.id) >= 0).forEach(n => {
      if (kind === 'status') Flow.setStatus(n, value, Store.author());
      if (kind === 'group') n.group = value || null;
    }), { source: 'graph' });
    toast(kind === 'status' ? ids.length + ' passos agora estão "' + Flow.STATUS[value] + '".' : 'Linha alterada em ' + ids.length + ' passos.');
  }

  function renderBulkbar() {
    const ids = Graph.getSelection(), bar = $('#bulkbar');
    if (ids.length < 2) { bar.hidden = true; return; }
    const f = Store.get();
    bar.hidden = false;
    bar.innerHTML = '<b>' + ids.length + ' selecionados</b>' +
      '<select data-bulk="status" aria-label="Mudar status"><option value="">Status…</option>' + Object.keys(Flow.STATUS).map(s => '<option value="' + s + '">' + esc(Flow.STATUS[s]) + '</option>').join('') + '</select>' +
      '<select data-bulk="group" aria-label="Mudar linha"><option value="__">Linha…</option><option value="">Sem linha</option>' + f.groups.map((g, i) => '<option value="' + esc(g.id) + '">' + (i + 1) + ' · ' + esc(g.name) + '</option>').join('') + '</select>' +
      '<button type="button" class="btn sm" data-bulk-act="copy">' + Icons.get('copy') + 'Copiar</button>' +
      '<button type="button" class="btn sm" data-bulk-act="delete">' + Icons.get('trash') + 'Excluir</button>' +
      '<button type="button" class="ico-btn" data-bulk-act="clear" title="Limpar seleção" aria-label="Limpar seleção">' + Icons.get('x') + '</button>';
  }

  function newSubflow(callNodeId) {
    let sfId = null;
    Store.update(f => {
      const ids = new Set(f.subflows.map(s => s.id));
      sfId = Flow.uid(ids, 'sf');
      const first = Flow.newNode('message', 0, 0, f, sfId);
      first.title = 'Início do subfluxo'; first.text = '';
      f.nodes.push(first);
      const back = Flow.newNode('return', 340, 0, f, sfId);
      back.title = 'Voltar ao fluxo';
      f.nodes.push(back);
      first.next = back.id;
      f.subflows.push({ id: sfId, name: 'Subfluxo ' + (f.subflows.length + 1), start: first.id, description: '' });
      if (callNodeId) { const c = f.nodes.find(n => n.id === callNodeId); if (c) c.target = sfId; }
    }, { source: 'inspector' });
    openScope(sfId);
    toast('Subfluxo criado. Dê um nome nos ajustes do painel.');
  }

  function toggleGroup(gid) {
    Store.update(f => { const g = f.groups.find(x => x.id === gid); if (g) g.collapsed = !g.collapsed; }, { source: 'view', snapshot: false });
  }

  window.App = { selectNode, goToNode, deleteNodes, createNext, copy, paste, bulk, newSubflow, openScope, refreshOverlay, playTest, syncPersona, setTab, toast, doExport };

  /* ---------- exportação ---------- */
  function doExport(kind) {
    const flow = Store.get(), base = Exporters.fileBase(flow);
    const errs = lastIssues.filter(i => i.severity === 'error').length;
    const map = {
      json: () => { Exporters.download(base + '.json', Exporters.flowJSON(flow), 'application/json'); toast('Fluxo salvo em ' + base + '.json'); },
      meta: () => { Exporters.download(base + '.meta-messages.json', Exporters.metaMessages(flow), 'application/json'); toast(errs ? 'Exportado com ' + errs + ' erro(s) de canal. Veja a aba Revisão.' : 'Mensagens da Meta exportadas.'); },
      md: () => { Exporters.download(base + '.md', Exporters.markdown(flow), 'text/markdown'); toast('Documento em Markdown exportado.'); },
      doc: () => { Exporters.download(base + '.documento.html', Exporters.docHTML(flow), 'text/html'); toast('Documento exportado. Abra e use Imprimir para gerar PDF.'); },
      spec: () => { Exporters.download(base + '.spec.html', Exporters.specHTML(flow), 'text/html'); toast('Especificação exportada em ' + base + '.spec.html'); },
      specmd: () => { Exporters.download(base + '.spec.md', Exporters.specMarkdown(flow), 'text/markdown'); toast('Especificação exportada em ' + base + '.spec.md'); },
      csv: () => { Exporters.download(base + '.pendencias.csv', Exporters.pendCSV(flow), 'text/csv'); toast('Pendências exportadas. Abre no Excel.'); },
      player: () => { Exporters.download(base + '.simulador.html', Exporters.playerHTML(flow), 'text/html'); toast('Simulador exportado em um único arquivo HTML.'); },
      review: () => { Exporters.download(base + '.revisao.html', Exporters.reviewHTML(flow), 'text/html'); toast('Arquivo de revisão gerado. Envie ao cliente; ele devolve um .json de respostas.'); }
    };
    if (map[kind]) map[kind]();
  }

  /* ---------- arquivos ---------- */
  function readFile(file, cb) {
    const r = new FileReader();
    r.onload = () => { try { cb(JSON.parse(String(r.result))); } catch (e) { toast('Não consegui ler o arquivo: ' + e.message); } };
    r.readAsText(file);
  }
  function openFlow(data) {
    try {
      stopRec(); Panels.setDiff(null);
      Store.load(data); Graph.setScope(null);
      setTimeout(() => Graph.fit(), 30);
      toast('Fluxo "' + Store.get().meta.name + '" aberto.');
    } catch (e) { toast('Não consegui abrir: ' + e.message); }
  }
  function importReview(data) {
    const f = Store.get();
    if (data.flow && data.flow !== f.meta.name && !confirm('As respostas são do fluxo "' + data.flow + '", e o aberto é "' + f.meta.name + '". Importar mesmo assim?')) return;
    let r = null;
    try { Store.update(fl => { r = Analysis.mergeReview(fl, data); }, { source: 'app' }); }
    catch (e) { toast(e.message); return; }
    Panels.setImportResult(r);
    setTab('review');
    toast('Revisão de ' + r.reviewer + ' importada: ' + r.applied.length + ' passos atualizados.', { label: 'Desfazer', run: () => Store.undo() });
  }
  function confirmReplace() {
    const f = Store.get();
    return !f || f.nodes.length < 2 || confirm('Isto substitui o fluxo atual na tela. Salve um .json antes se quiser guardá-lo. Continuar?');
  }

  /* ---------- tema e apresentação ---------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* ignora */ }
    Minimap.draw();
  }
  function togglePresent(on) {
    const body = document.body;
    const next = on == null ? !body.classList.contains('present') : on;
    body.classList.toggle('present', next);
    if (next) { stopRec(); setTab('sim'); ensurePlayer(true); $('#sim-follow').checked = true; Graph.setFollow(true); }
    setTimeout(() => Graph.fit(), 220);
  }

  /* ---------- menus ---------- */
  function wireMenu(btn, menu, onPick) {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = !menu.classList.contains('open');
      closeMenus();
      menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
      if (open) { const first = menu.querySelector('button'); if (first) first.focus(); }
    });
    menu.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { closeMenus(); onPick(b); } });
    menu.addEventListener('keydown', e => {
      const items = Array.from(menu.querySelectorAll('button')), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape') { closeMenus(); btn.focus(); }
    });
  }
  function closeMenus() { $$('.menu.open').forEach(m => m.classList.remove('open')); $$('[aria-haspopup="menu"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }

  /* ---------- inicialização ---------- */
  function init() {
    const st = document.createElement('style');
    st.id = 'player-css'; st.textContent = PLAYER_CSS;
    document.head.appendChild(st);
    let theme = 'light';
    try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { /* ignora */ }
    document.documentElement.dataset.theme = theme;

    $('#brand-mark').innerHTML = Icons.BRAND;
    $$('[data-icon]').forEach(el => { el.insertAdjacentHTML('afterbegin', Icons.get(el.dataset.icon)); });
    $('#legend-marks').innerHTML = Object.keys(Flow.STATUS).map(s => '<span>' + Icons.mark(s) + esc(Flow.STATUS[s]) + '</span>').join('') + '<span>' + Icons.mark('call') + 'Subfluxo</span>';

    Graph.init({
      host: $('#map'), world: $('#world'), lanes: $('#lanes'), nodes: $('#nodes'), svg: $('#edges'), zoomLabel: $('#zoom-label'),
      callbacks: {
        onSelect: ids => { Inspector.show(ids); renderBulkbar(); if (ids.length && tab !== 'edit' && tab !== 'sim') setTab('edit'); },
        onCreate: createNode,
        onOpenScope: sf => openScope(sf),
        onToggleGroup: toggleGroup,
        onViewChange: () => Minimap.draw()
      }
    });
    Minimap.init($('#minimap'));
    Inspector.init($('#tab-edit'));
    Panels.init({ tests: $('#tab-tests'), data: $('#tab-data'), review: $('#tab-review') });
    Search.init({ input: $('#search'), list: $('#search-results'), onPick: goToNode });

    Store.on('change', e => refresh(e.source));
    Store.on('load', () => { Graph.setScope(null); Graph.select(null, true); Inspector.show([]); playerDirty = true; syncPersona(); });
    Store.on('saved', e => { $('#save-state').textContent = 'Salvo no navegador às ' + e.at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); });
    Store.on('saveerror', () => { $('#save-state').textContent = 'Não foi possível salvar no navegador. Exporte o .json.'; });

    const saved = Store.restore();
    let started = false;
    if (saved) { try { Store.load(saved, { silent: true }); started = true; } catch (e) { /* cai no exemplo */ } }
    if (!started) Store.load(EXAMPLE_FLOW());
    requestAnimationFrame(() => Graph.fit());

    /* abas */
    $$('.tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

    /* topo do mapa */
    $('#crumbs').addEventListener('click', e => { const b = e.target.closest('[data-scope]'); if (b && !b.classList.contains('on')) openScope(b.dataset.scope || null); });
    $('#crumbs').addEventListener('change', e => { if (e.target.dataset.scopePick !== undefined && e.target.value) openScope(e.target.value); });
    $('#filters').addEventListener('click', e => {
      const s = e.target.closest('[data-fs]'), o = e.target.closest('[data-fo]'), c = e.target.closest('[data-fclear]');
      if (s) { const k = s.dataset.fs, i = filter.status.indexOf(k); if (i >= 0) filter.status.splice(i, 1); else filter.status.push(k); }
      else if (o) filter[o.dataset.fo] = !filter[o.dataset.fo];
      else if (c) filter = { status: [], open: false, unresolved: false, groups: [] };
      else return;
      refresh('filter');
    });
    $('#filters').addEventListener('change', e => { if (e.target.dataset.fg !== undefined) { filter.groups = e.target.value ? [e.target.value] : []; refresh('filter'); } });
    $('#bulkbar').addEventListener('change', e => {
      const t = e.target.closest('[data-bulk]');
      if (!t || t.value === '__' || (t.dataset.bulk === 'status' && !t.value)) return;
      bulk(t.dataset.bulk, t.value);
    });
    $('#bulkbar').addEventListener('click', e => {
      const b = e.target.closest('[data-bulk-act]');
      if (!b) return;
      if (b.dataset.bulkAct === 'copy') copy();
      if (b.dataset.bulkAct === 'delete') deleteNodes(Graph.getSelection());
      if (b.dataset.bulkAct === 'clear') Graph.setSelection([]);
    });

    /* barra superior */
    $('#flow-name').addEventListener('input', e => Store.update(f => { f.meta.name = e.target.value; }, { source: 'topbar', coalesce: 'name' }));
    wireMenu($('#btn-file'), $('#file-menu'), b => {
      const k = b.dataset.file;
      if (k === 'new' && confirmReplace()) { stopRec(); Panels.setDiff(null); Store.load(Flow.newFlow()); requestAnimationFrame(() => Graph.fit()); }
      if (k === 'example' && confirmReplace()) { stopRec(); Panels.setDiff(null); Store.load(EXAMPLE_FLOW()); requestAnimationFrame(() => Graph.fit()); }
      if (k === 'open') $('#file-input').click();
      if (k === 'save') doExport('json');
      if (k === 'version') { try { Store.saveVersion(''); toast('Versão salva. Compare na aba Revisão.', { label: 'Abrir', run: () => setTab('review') }); Panels.render('review'); } catch (e) { toast('Sem espaço no navegador para mais uma versão.'); } }
    });
    wireMenu($('#btn-export'), $('#export-menu'), b => doExport(b.dataset.export));
    document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) closeMenus(); });
    $('#file-input').onchange = e => { const f = e.target.files[0]; if (f) readFile(f, d => d.schema === 'chatbot-mapper/review/1' ? importReview(d) : openFlow(d)); e.target.value = ''; };
    $('#compare-input').onchange = e => { const f = e.target.files[0]; if (f) readFile(f, d => { try { Panels.setDiff(f.name, d); setTab('review'); } catch (err) { toast('Não consegui comparar: ' + err.message); } }); e.target.value = ''; };
    $('#review-input').onchange = e => { const f = e.target.files[0]; if (f) readFile(f, importReview); e.target.value = ''; };
    $('#btn-undo').onclick = () => Store.undo();
    $('#btn-redo').onclick = () => Store.redo();
    $('#btn-layout').onclick = () => { Store.update(f => Flow.autoLayout(f, Graph.getScope()), { source: 'graph' }); requestAnimationFrame(() => Graph.fit()); };
    $('#btn-fit').onclick = () => Graph.fit();
    $('#zoom-in').onclick = () => Graph.zoomBy(1.2);
    $('#zoom-out').onclick = () => Graph.zoomBy(1 / 1.2);
    $('#btn-add').onclick = () => {
      const r = $('#map').getBoundingClientRect(), c = Graph.viewCenter();
      Graph.showTypeMenu(r.left + 24, r.top + 60, type => createNode(type, c.x - 128, c.y - 60, null));
    };
    $('#btn-theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    $('#btn-present').onclick = () => togglePresent();
    $('#btn-exit-present').onclick = () => togglePresent(false);

    /* simulador */
    $('#sim-persona').onchange = e => { Store.update(f => { f.settings.persona = e.target.value || null; }, { source: 'app' }); ensurePlayer(true); };
    $('#sim-tags').onchange = e => { showTags = e.target.checked; if (player) player.setShowNodes(showTags); };
    $('#sim-follow').onchange = e => Graph.setFollow(e.target.checked);
    $('#sim-restart').onclick = () => { if (rec) rec.steps = []; ensurePlayer(true, rec ? rec.startAt : null); renderRecbar(); };
    $('#sim-from').onclick = () => {
      const id = Graph.getSelected();
      if (!id) { toast('Selecione um passo no mapa para começar a simulação por ele.'); return; }
      if (rec) { rec.startAt = id; rec.steps = []; renderRecbar(); }
      ensurePlayer(true, id);
    };
    $('#sim-rec').onclick = () => { if (rec) saveRec(); else startRec(); };
    $('#sim-stale').onclick = () => ensurePlayer(true);

    /* arrastar e soltar */
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files[0];
      if (!f) return;
      readFile(f, d => { if (d.schema === 'chatbot-mapper/review/1') importReview(d); else if (confirmReplace()) openFlow(d); });
    });

    /* atalhos */
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (mod && k === 's') { e.preventDefault(); doExport('json'); }
      else if (mod && k === 'k') { e.preventDefault(); Search.focus(); }
      else if (!typing && !mod && e.key === '/') { e.preventDefault(); Search.focus(); }
      else if (mod && k === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) Store.redo(); else Store.undo(); }
      else if (mod && k === 'y' && !typing) { e.preventDefault(); Store.redo(); }
      else if (mod && k === 'c' && !typing && Graph.getSelection().length) { e.preventDefault(); copy(); }
      else if (mod && k === 'v' && !typing) { e.preventDefault(); paste(); }
      else if (mod && k === 'a' && !typing && document.activeElement && document.activeElement.closest('#map,body') && !e.target.closest('#panel')) { e.preventDefault(); Graph.setSelection(Flow.scopeNodes(Store.get(), Graph.getScope()).map(n => n.id)); }
      else if (e.key === 'Escape') {
        closeMenus();
        if (document.body.classList.contains('present')) togglePresent(false);
        else { Graph.closeTypeMenu(); if (!typing) Graph.setSelection([]); }
      }
      else if (!typing && !mod) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && Graph.getSelection().length) { e.preventDefault(); deleteNodes(Graph.getSelection()); }
        else if (k === 'f') Graph.fit();
        else if (e.key === 'Tab' && Graph.getSelected() && !e.target.closest('#panel,#topbar,.type-menu')) { e.preventDefault(); createNext(Graph.getSelected()); }
      }
    });
    window.addEventListener('resize', () => Minimap.draw());
  }

  document.addEventListener('DOMContentLoaded', init);
})();

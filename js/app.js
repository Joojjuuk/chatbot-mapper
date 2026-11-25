/* app.js — liga as peças: barra superior, abas, simulador, exportação e atalhos. */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const THEME_KEY = 'chatbot-mapper:theme';

  let tab = 'edit';
  let player = null;
  let playerDirty = true;
  let showTags = false;
  let lastIssues = [];

  /* ---------- avisos ---------- */
  let toastTimer = null;
  function toast(msg, action) {
    const t = $('#toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button" id="toast-act">' + esc(action.label) + '</button>' : '');
    t.classList.add('show');
    if (action) $('#toast-act').onclick = () => { action.run(); t.classList.remove('show'); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), action ? 6000 : 2800);
  }

  /* ---------- abas ---------- */
  function setTab(name) {
    tab = name;
    $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'tab-' + name));
    if (name === 'sim') ensurePlayer();
  }

  function ensurePlayer(force, startAt) {
    if (!force && player && !playerDirty) return;
    if (player) player.destroy();
    playerDirty = false;
    $('#sim-stale').hidden = true;
    player = ChatPlayer($('#sim-phone'), Store.get(), {
      delay: 550, showNodes: showTags, startAt: startAt || null,
      onNode: id => Graph.setActive(id)
    });
  }

  /* ---------- verificação ---------- */
  function renderLint(issues) {
    const box = $('#tab-lint');
    const errs = issues.filter(i => i.severity === 'error'), warns = issues.filter(i => i.severity === 'warn'), infos = issues.filter(i => i.severity === 'info');
    const flow = Store.get(), m = Flow.map(flow);
    const li = i => '<li class="' + i.severity + '"' + (i.nodeId ? ' data-node="' + esc(i.nodeId) + '"' : '') + '>' +
      (i.nodeId && m[i.nodeId] ? '<b>' + esc(m[i.nodeId].title) + '</b> ' : '') + esc(i.message) + '</li>';
    let h = '<div class="ins-head"><span class="n-ico t-flow">' + Graph.ICONS.action + '</span><div><b>Validação do fluxo</b><small>Regras do WhatsApp e ligações que faltam.</small></div></div>';
    if (!errs.length && !warns.length) h += '<div class="ok-box">✔ Nenhum erro nem aviso. O fluxo está consistente com as regras do canal.</div>';
    if (errs.length) h += '<h4>Erros <span>' + errs.length + '</span></h4><ul class="issues clickable">' + errs.map(li).join('') + '</ul>';
    if (warns.length) h += '<h4>Avisos <span>' + warns.length + '</span></h4><ul class="issues clickable">' + warns.map(li).join('') + '</ul>';
    if (infos.length) h += '<h4>Em aberto <span>' + infos.length + '</span></h4><ul class="issues clickable">' + infos.map(li).join('') + '</ul>';
    box.innerHTML = h;
    const n = errs.length + warns.length;
    const badge = $('#lint-badge');
    badge.textContent = n; badge.hidden = !n;
    badge.className = 'badge' + (errs.length ? ' err' : '');
  }

  /* ---------- atualização geral ---------- */
  function refresh(source) {
    const flow = Store.get();
    if (!flow) return;
    lastIssues = Flow.lint(flow, Meta);
    const map = {};
    lastIssues.forEach(i => {
      if (!i.nodeId || i.severity === 'info') return;
      const o = map[i.nodeId] = map[i.nodeId] || { error: 0, warn: 0 };
      o[i.severity]++;
    });
    Graph.render(map);
    renderLint(lastIssues);
    if (source !== 'inspector') Inspector.render();
    if (source !== 'topbar') $('#flow-name').value = flow.meta.name;
    const s = Flow.stats(flow);
    $('#stat-text').textContent = s.total + ' nós · ' + s.approved + ' aprovados';
    $('#stat-bar').style.width = s.progress + '%';
    $('#btn-undo').disabled = !Store.canUndo();
    $('#btn-redo').disabled = !Store.canRedo();
    $('#empty-hint').hidden = flow.nodes.length > 0;
    document.title = flow.meta.name + ' — Chatbot Mapper';
    playerDirty = true;
    if (tab === 'sim') $('#sim-stale').hidden = false;
  }

  /* ---------- ações de nó ---------- */
  function selectNode(id) {
    Graph.select(id);
    Graph.focusNode(id, true);
  }

  function createNode(type, x, y, link) {
    let created = null;
    Store.update(flow => {
      created = Flow.newNode(type, x, y, flow);
      flow.nodes.push(created);
      if (link) {
        const from = flow.nodes.find(n => n.id === link.from);
        if (from) Flow.setLink(from, link.port, created.id);
      }
    }, { source: 'graph' });
    Graph.select(created.id);
    setTab('edit');
    setTimeout(() => { const t = $('#tab-edit [data-f="title"]'); if (t) { t.focus(); t.select(); } }, 30);
  }

  function deleteNode(id) {
    const flow = Store.get();
    if (!flow.nodes.find(n => n.id === id)) return;
    Store.update(f => Flow.removeNode(f, id), { source: 'graph' });
    Graph.select(null);
    toast('Nó excluído', { label: 'Desfazer', run: () => Store.undo() });
  }

  window.App = { selectNode, deleteNode };

  /* ---------- exportação ---------- */
  function doExport(kind) {
    const flow = Store.get(), base = Exporters.fileBase(flow);
    if (kind === 'json') { Exporters.download(base + '.json', Exporters.flowJSON(flow), 'application/json'); toast('Fluxo salvo em ' + base + '.json'); }
    if (kind === 'meta') {
      const errs = lastIssues.filter(i => i.severity === 'error').length;
      Exporters.download(base + '.meta-messages.json', Exporters.metaMessages(flow), 'application/json');
      toast(errs ? 'Exportado com ' + errs + ' erro(s) de canal — veja a aba Validar.' : 'Mensagens da Meta exportadas.');
    }
    if (kind === 'md') { Exporters.download(base + '.md', Exporters.markdown(flow), 'text/markdown'); toast('Documento em Markdown exportado.'); }
    if (kind === 'doc') { Exporters.download(base + '.documento.html', Exporters.docHTML(flow), 'text/html'); toast('Documento exportado. Abra e use Imprimir → PDF.'); }
    if (kind === 'player') { Exporters.download(base + '.simulador.html', Exporters.playerHTML(flow), 'text/html'); toast('Simulador exportado: é um único arquivo HTML.'); }
  }

  /* ---------- arquivos ---------- */
  function openFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try { Store.importText(String(r.result)); setTimeout(() => Graph.fit(), 30); toast('Fluxo "' + Store.get().meta.name + '" aberto.'); }
      catch (e) { toast('Não consegui abrir: ' + e.message); }
    };
    r.readAsText(file);
  }

  function confirmReplace() {
    const f = Store.get();
    return !f || f.nodes.length < 2 || confirm('Isto substitui o fluxo atual na tela. Salve um .json antes se quiser guardá-lo. Continuar?');
  }

  /* ---------- tema e apresentação ---------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem(THEME_KEY, t);
  }

  function togglePresent(on) {
    const body = document.body;
    const next = on == null ? !body.classList.contains('present') : on;
    body.classList.toggle('present', next);
    if (next) { setTab('sim'); ensurePlayer(true); $('#sim-follow').checked = true; Graph.setFollow(true); }
    setTimeout(() => Graph.fit(), 220);
  }

  /* ---------- inicialização ---------- */
  function init() {
    const st = document.createElement('style');
    st.id = 'player-css'; st.textContent = PLAYER_CSS;
    document.head.appendChild(st);
    setTheme(localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

    Graph.init({
      host: $('#map'), world: $('#world'), nodes: $('#nodes'), svg: $('#edges'), zoomLabel: $('#zoom-label'),
      callbacks: {
        onSelect: id => { Inspector.show(id); if (tab === 'lint') setTab('edit'); },
        onCreate: createNode
      }
    });
    Inspector.init($('#tab-edit'));

    Store.on('change', e => refresh(e.source));
    Store.on('load', () => { Graph.select(null, true); Inspector.show(null); playerDirty = true; });
    Store.on('saved', e => { $('#save-state').textContent = 'Salvo no navegador · ' + e.at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); });
    Store.on('saveerror', () => { $('#save-state').textContent = 'Não foi possível salvar no navegador — exporte o .json.'; });

    const saved = Store.restore();
    let started = false;
    if (saved) { try { Store.load(saved, { silent: true }); started = true; } catch (e) { /* cai no exemplo */ } }
    if (!started) Store.load(EXAMPLE_FLOW());
    requestAnimationFrame(() => Graph.fit());

    /* abas */
    $$('.tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    $('#tab-lint').addEventListener('click', e => {
      const li = e.target.closest('li[data-node]');
      if (li) { selectNode(li.dataset.node); setTab('edit'); }
    });

    /* barra superior */
    $('#flow-name').addEventListener('input', e => Store.update(f => { f.meta.name = e.target.value; }, { source: 'topbar', coalesce: 'name' }));
    $('#btn-new').onclick = () => { if (confirmReplace()) { Store.load(Flow.newFlow()); requestAnimationFrame(() => Graph.fit()); } };
    $('#btn-example').onclick = () => { if (confirmReplace()) { Store.load(EXAMPLE_FLOW()); requestAnimationFrame(() => Graph.fit()); } };
    $('#btn-open').onclick = () => $('#file-input').click();
    $('#file-input').onchange = e => { openFile(e.target.files[0]); e.target.value = ''; };
    $('#btn-undo').onclick = () => Store.undo();
    $('#btn-redo').onclick = () => Store.redo();
    $('#btn-layout').onclick = () => { Store.update(f => Flow.autoLayout(f), { source: 'graph' }); requestAnimationFrame(() => Graph.fit()); };
    $('#btn-fit').onclick = () => Graph.fit();
    $('#zoom-in').onclick = () => Graph.zoomBy(1.2);
    $('#zoom-out').onclick = () => Graph.zoomBy(1 / 1.2);
    $('#btn-add').onclick = e => {
      const r = $('#map').getBoundingClientRect(), c = Graph.viewCenter();
      Graph.showTypeMenu(r.left + 24, r.top + 24, type => createNode(type, c.x - 120, c.y - 60, null));
    };
    $('#btn-theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    $('#btn-present').onclick = () => togglePresent();
    $('#btn-exit-present').onclick = () => togglePresent(false);

    /* menu exportar */
    const menu = $('#export-menu');
    $('#btn-export').onclick = e => { e.stopPropagation(); menu.classList.toggle('open'); };
    menu.addEventListener('click', e => { const b = e.target.closest('[data-export]'); if (b) { menu.classList.remove('open'); doExport(b.dataset.export); } });
    document.addEventListener('click', e => { if (!e.target.closest('#export-wrap')) menu.classList.remove('open'); });

    /* simulador */
    $('#sim-tags').onchange = e => { showTags = e.target.checked; if (player) player.setShowNodes(showTags); };
    $('#sim-follow').onchange = e => Graph.setFollow(e.target.checked);
    $('#sim-restart').onclick = () => ensurePlayer(true);
    $('#sim-from').onclick = () => {
      const id = Graph.getSelected();
      if (!id) { toast('Selecione um nó no mapa para começar a simulação por ele.'); return; }
      ensurePlayer(true, id);
    };
    $('#sim-stale').onclick = () => ensurePlayer(true);

    /* arrastar e soltar um .json */
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files[0];
      if (f && confirmReplace()) openFile(f);
    });

    /* atalhos */
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); doExport('json'); }
      else if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) Store.redo(); else Store.undo(); }
      else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); Store.redo(); }
      else if (e.key === 'Escape') {
        if (document.body.classList.contains('present')) togglePresent(false);
        else { Graph.closeTypeMenu(); if (!typing) Graph.select(null); }
      }
      else if (!typing && !mod) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && Graph.getSelected()) { e.preventDefault(); deleteNode(Graph.getSelected()); }
        else if (e.key.toLowerCase() === 'f') Graph.fit();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

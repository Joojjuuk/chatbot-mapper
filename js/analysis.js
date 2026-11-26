/* analysis.js — análises sobre o fluxo, sem interface:
   cenários de teste (motor de caminho), cobertura, comparação de versões, caminhos e volume
   de mensagens, pendências, colar nós entre fluxos e mesclar a revisão do cliente.
   Funciona no navegador (window.Analysis) e no Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./flow.js'));
  else root.Analysis = factory(root.Flow);
})(typeof self !== 'undefined' ? self : this, function (Flow) {
  'use strict';

  const MAX_AUTO = 60, MAX_DEPTH = 8;

  /* Quantas mensagens o bot envia ao passar por um nó. */
  function botMessages(n) {
    if (n.type === 'message' || n.type === 'menu' || n.type === 'input') return 1;
    if ((n.type === 'handoff' || n.type === 'end') && n.text && n.text.trim()) return 1;
    return 0;
  }
  const interactive = n => n.type === 'menu' || n.type === 'input' || n.type === 'action';

  /* ---------- motor de caminho ---------- */
  function runTest(flow, test) {
    const m = Flow.map(flow), steps = test.steps || [];
    const visited = [], stack = [];
    let si = 0, auto = 0, messages = 0, cur = test.startAt || flow.settings.startNode, last = null;
    const title = id => (m[id] ? '"' + m[id].title + '"' : '(passo apagado)');
    const result = (ok, reason) => ({ ok, reason: reason || '', at: last, step: si, visited, messages });
    if (!m[cur]) return result(false, 'O início do cenário não existe mais.');

    for (;;) {
      if (!cur) return finish();
      const n = m[cur];
      if (!n) return result(false, 'Destino não encontrado no fluxo.');
      last = cur; visited.push(cur); messages += botMessages(n);
      if (++auto > MAX_AUTO) return result(false, 'A conversa entrou em um possível laço sem resposta do cliente em ' + title(cur) + '.');

      if (n.type === 'message') { cur = n.next; continue; }
      if (n.type === 'call') {
        const sf = Flow.subflow(flow, n.target);
        if (!sf || !sf.start) return result(false, title(cur) + ' chama um subfluxo que não existe ou não tem início.');
        if (stack.length >= MAX_DEPTH) return result(false, 'Subfluxos chamados em mais de ' + MAX_DEPTH + ' níveis (possível recursão).');
        stack.push(n.next || null); cur = sf.start; continue;
      }
      if (n.type === 'return') {
        if (!stack.length) return finish();
        cur = stack.pop();
        if (!cur) return finish();
        continue;
      }
      if (!interactive(n)) return finish();

      const step = steps[si];
      if (!step) return finish();
      if (step.node !== cur) return result(false, 'Esperava a conversa em ' + title(step.node) + ', mas ela chegou em ' + title(cur) + '.');
      const p = Flow.ports(n).find(x => x.port === step.port);
      if (!p) return result(false, 'Em ' + title(cur) + ', a opção escolhida no cenário não existe mais.');
      si++; auto = 0;
      if (!p.to) return result(false, 'Em ' + title(cur) + ', a saída "' + p.label.replace(/^\d+ · /, '') + '" não tem destino.');
      cur = p.to;
    }

    function finish() {
      if (si < steps.length) return result(false, 'A conversa terminou em ' + title(last) + ', mas o cenário ainda tinha ' + (steps.length - si) + ' escolha(s).');
      if (test.expectEnd && last !== test.expectEnd) return result(false, 'Esperava terminar em ' + title(test.expectEnd) + ', mas terminou em ' + title(last) + '.');
      return result(true);
    }
  }

  function runAll(flow) { return (flow.tests || []).map(t => ({ test: t, result: runTest(flow, t) })); }

  function coverage(flow) {
    const seen = new Set();
    runAll(flow).forEach(r => r.result.visited.forEach(id => seen.add(id)));
    return { visited: [...seen], unvisited: flow.nodes.filter(n => !seen.has(n.id)).map(n => n.id) };
  }

  /* ---------- caminhos e volume ---------- */
  function paths(flow, opts) {
    opts = opts || {};
    const LIMIT = opts.limit || 2000, m = Flow.map(flow), out = [];
    let truncated = false;
    function walk(cur, stack, visits, msgs, trail, templates) {
      if (out.length >= LIMIT) { truncated = true; return; }
      const end = () => out.push({ nodes: trail, messages: msgs, templates });
      if (!cur || !m[cur]) return end();
      const n = m[cur], v = (visits[cur] || 0) + 1;
      if (v > 2) return end();
      const vis = Object.assign({}, visits); vis[cur] = v;
      const t = trail.concat(cur), mm = msgs + botMessages(n), tt = templates + (n.type === 'message' && n.template && n.template.enabled ? 1 : 0);
      if (n.type === 'call') {
        const sf = Flow.subflow(flow, n.target);
        if (!sf || !sf.start || stack.length >= MAX_DEPTH) return walk(n.next, stack, vis, mm, t, tt);
        return walk(sf.start, stack.concat([n.next || null]), vis, mm, t, tt);
      }
      if (n.type === 'return') {
        if (!stack.length) return out.push({ nodes: t, messages: mm, templates: tt });
        return walk(stack[stack.length - 1], stack.slice(0, -1), vis, mm, t, tt);
      }
      if (n.type === 'handoff' || n.type === 'end') return out.push({ nodes: t, messages: mm, templates: tt });
      const next = Flow.ports(n).map(p => p.to).filter((x, i, a) => x && a.indexOf(x) === i);
      if (!next.length) return out.push({ nodes: t, messages: mm, templates: tt });
      next.forEach(to => walk(to, stack, vis, mm, t, tt));
    }
    if (m[flow.settings.startNode]) walk(flow.settings.startNode, [], {}, 0, [], 0);
    return { paths: out, truncated };
  }

  function volume(flow, opts) {
    const r = paths(flow, opts);
    const counts = r.paths.map(p => p.messages);
    const sum = counts.reduce((s, x) => s + x, 0);
    return {
      paths: r.paths.length, truncated: r.truncated,
      min: counts.length ? Math.min(...counts) : 0,
      max: counts.length ? Math.max(...counts) : 0,
      avg: counts.length ? Math.round((sum / counts.length) * 10) / 10 : 0,
      templates: r.paths.reduce((s, p) => Math.max(s, p.templates), 0),
      tests: (flow.tests || []).map(t => ({ id: t.id, name: t.name, messages: runTest(flow, t).messages }))
    };
  }

  /* ---------- comparação de versões ---------- */
  const FIELDS = ['type', 'title', 'text', 'status', 'notes', 'group', 'subflow', 'header', 'footer', 'listButton', 'menuStyle',
    'variable', 'validation', 'example', 'system', 'target'];
  const FIELD_LABEL = { type: 'tipo', title: 'título', text: 'texto', status: 'status', notes: 'pergunta em aberto', group: 'grupo', subflow: 'subfluxo',
    header: 'cabeçalho', footer: 'rodapé', listButton: 'botão da lista', menuStyle: 'formato', variable: 'variável', validation: 'validação',
    example: 'exemplo', system: 'sistema', target: 'subfluxo chamado', options: 'opções', cases: 'cenários', links: 'ligações', template: 'template' };
  const sig = v => JSON.stringify(v == null ? null : v);

  function diff(base, current) {
    const a = Flow.map(base), b = Flow.map(current);
    const added = [], removed = [], changed = [];
    current.nodes.forEach(n => { if (!a[n.id]) added.push({ id: n.id, title: n.title }); });
    base.nodes.forEach(n => { if (!b[n.id]) removed.push({ id: n.id, title: n.title }); });
    current.nodes.forEach(n => {
      const o = a[n.id];
      if (!o) return;
      const fields = FIELDS.filter(f => sig(o[f]) !== sig(n[f]));
      if (sig((o.options || []).map(x => [x.id, x.label, x.description])) !== sig((n.options || []).map(x => [x.id, x.label, x.description]))) fields.push('options');
      if (sig((o.cases || []).map(x => [x.id, x.label, x.when])) !== sig((n.cases || []).map(x => [x.id, x.label, x.when]))) fields.push('cases');
      if (sig(Flow.ports(o).map(p => [p.port, p.to])) !== sig(Flow.ports(n).map(p => [p.port, p.to]))) fields.push('links');
      if (o.template && n.template && sig(o.template) !== sig(n.template)) fields.push('template');
      if (fields.length) changed.push({ id: n.id, title: n.title, fields, labels: fields.map(f => FIELD_LABEL[f] || f) });
    });
    return { added, removed, changed, same: !added.length && !removed.length && !changed.length };
  }

  /* ---------- pendências ---------- */
  function openQuestions(flow, issues) {
    const m = Flow.map(flow), rows = [];
    const g = id => { const x = (flow.groups || []).find(y => y.id === id); return x ? x.name : ''; };
    const base = n => ({ nodeId: n.id, title: n.title, group: g(n.group), scope: Flow.scopeName(flow, n.subflow), status: Flow.STATUS[n.status] });
    (issues || []).filter(i => i.severity !== 'info').forEach(i => {
      const n = m[i.nodeId];
      rows.push(Object.assign(n ? base(n) : { nodeId: null, title: '(fluxo)', group: '', scope: '', status: '' }, { kind: i.severity === 'error' ? 'Erro' : 'Aviso', text: i.message, who: '' }));
    });
    flow.nodes.forEach(n => {
      if (n.notes && n.notes.trim()) rows.push(Object.assign(base(n), { kind: 'Pergunta em aberto', text: n.notes.trim(), who: '' }));
      (n.comments || []).filter(c => !c.resolved).forEach(c => rows.push(Object.assign(base(n), { kind: 'Comentário', text: c.text, who: c.author || '' })));
      if (n.status === 'todo' && !(n.notes && n.notes.trim())) rows.push(Object.assign(base(n), { kind: 'A definir', text: 'Passo ainda a definir.', who: '' }));
    });
    return rows;
  }

  /* ---------- copiar e colar ---------- */
  function copySelection(flow, ids) {
    const set = new Set(ids);
    const nodes = flow.nodes.filter(n => set.has(n.id)).map(n => JSON.parse(JSON.stringify(n)));
    const gids = new Set(nodes.map(n => n.group).filter(Boolean));
    return { schema: 'chatbot-mapper/clipboard/1', nodes, groups: (flow.groups || []).filter(g => gids.has(g.id)).map(g => ({ id: g.id, name: g.name, color: g.color })) };
  }

  function remapPaste(clip, flow, opts) {
    opts = opts || {};
    const existing = new Set(flow.nodes.map(n => n.id)), idMap = {};
    const nodes = (clip.nodes || []).map(n => JSON.parse(JSON.stringify(n)));
    nodes.forEach(n => { const id = Flow.uid(existing); existing.add(id); idMap[n.id] = id; });
    const groupByName = {};
    (clip.groups || []).forEach(g => { const t = (flow.groups || []).find(x => x.id === g.id || Flow.fold(x.name) === Flow.fold(g.name)); if (t) groupByName[g.id] = t.id; });
    nodes.forEach(n => {
      n.id = idMap[n.id];
      Flow.ports(n).forEach(p => Flow.setLink(n, p.port, p.to && idMap[p.to] ? idMap[p.to] : null));
      n.group = n.group && groupByName[n.group] ? groupByName[n.group] : ((flow.groups || []).some(g => g.id === n.group) ? n.group : null);
      n.subflow = opts.scope || null;
      if (n.type === 'call' && n.target && !Flow.subflow(flow, n.target)) n.target = null;
      n.x += opts.dx || 0; n.y += opts.dy || 0;
      n.comments = []; n.history = [];
      delete n._needsLayout;
    });
    return nodes;
  }

  /* ---------- revisão do cliente ---------- */
  function mergeReview(flow, review) {
    if (!review || review.schema !== 'chatbot-mapper/review/1' || !Array.isArray(review.items)) throw new Error('Arquivo não é uma resposta de revisão do Chatbot Mapper.');
    const m = Flow.map(flow), applied = [], skipped = [];
    const who = review.reviewer || 'Revisor', at = review.at || new Date().toISOString();
    review.items.forEach(it => {
      const n = m[it.node];
      if (!n) { skipped.push(it.node); return; }
      const comment = String(it.comment || '').trim();
      if (it.decision === 'approved') {
        if (n.status !== 'approved') { n.history.push({ at, by: who, action: 'review', from: n.status, to: 'approved', note: 'Aprovado na revisão' }); n.status = 'approved'; }
      } else if (it.decision === 'changes') {
        n.history.push({ at, by: who, action: 'review', from: n.status, to: 'review', note: 'Pediu ajuste na revisão' });
        n.status = 'review';
      }
      if (comment || it.decision === 'changes') {
        const text = comment || 'Pediu ajuste neste passo.';
        n.comments.push({ author: who, text, date: at, resolved: false, mentions: Flow.mentions(text) });
      }
      applied.push(it.node);
    });
    return { applied, skipped, reviewer: who };
  }

  return { botMessages, runTest, runAll, coverage, paths, volume, diff, FIELD_LABEL, openQuestions, copySelection, remapPaste, mergeReview };
});

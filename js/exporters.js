/* exporters.js — saídas do fluxo: .json, mensagens Meta, documento, especificação para o
   desenvolvimento, pendências, simulador e revisão do cliente em HTML de arquivo único. */
(function (root) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateBR = d => new Date(d).toLocaleDateString('pt-BR');
  const PALETTE = ':root{--c0:#8b939c;--c1:#1f5bd6;--c2:#0b8a48;--c3:#d42b2b;--c4:#e3a000;--c5:#8a45c6;--c6:#078fa3;--c7:#e85d2c;--c8:#66727f}';

  function fileBase(flow) { return Flow.slug(flow.meta.name).replace(/_/g, '-') || 'fluxo'; }

  function download(name, text, mime) {
    const blob = text instanceof Blob ? text : new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- 1. fluxo (.json) ---------- */
  function flowJSON(flow) { return JSON.stringify(flow, (k, v) => (k === '_needsLayout' ? undefined : v), 2); }

  /* Cópia para o cliente: sem notas internas, comentários e histórico. */
  function clientCopy(flow) {
    const clean = JSON.parse(flowJSON(flow));
    clean.nodes.forEach(n => { delete n.notes; delete n.comments; delete n.history; });
    delete clean.tests;
    return clean;
  }

  /* ---------- 2. mensagens no formato da Meta ---------- */
  function metaMessages(flow) {
    const built = [];
    Flow.orderAll(flow).forEach(o => o.reachable.concat(o.loose).forEach(n => built.push(Meta.buildNode(n))));
    const templates = built.filter(b => b.template).map(b => Object.assign({ node: b.node }, b.template));
    const errors = Flow.lint(flow, Meta).filter(i => i.severity === 'error');
    return JSON.stringify({
      schema: 'chatbot-mapper/meta-messages/2',
      flow: { name: flow.meta.name, start: flow.settings.startNode, generatedAt: new Date().toISOString() },
      notes: [
        'payload: corpo pronto para POST /{phone-number-id}/messages (WhatsApp Cloud API).',
        '"to": "{{wa_id}}" e as variáveis {{nome}} dos textos devem ser substituídas pelo seu serviço antes do envio.',
        'routes: para onde ir depois. Em menus, a chave é o id da opção escolhida; "*" = texto livre fora das opções (reenviar o menu).',
        'call: executa o subfluxo indicado (subflows[].start) e, ao chegar em um nó "return", segue por routes.next do call.',
        'action.cases[].when: condições sobre os campos do dicionário (variables) que definem cada cenário.',
        'Mensagens livres só podem ser enviadas dentro da janela de 24 h aberta pelo cliente; fora dela, use templates.'
      ],
      limits: Meta.LIMITS,
      fallbackText: flow.settings.fallbackText,
      subflows: (flow.subflows || []).map(s => ({ id: s.id, name: s.name, start: s.start })),
      variables: flow.variables || [],
      templates, errors,
      messages: built
    }, null, 2);
  }

  /* ---------- 3. modelo comum de documentos ---------- */
  function docModel(flow) {
    const idx = {}, list = [];
    const scopes = Flow.orderAll(flow);
    scopes.forEach(o => o.reachable.concat(o.loose).forEach(n => { list.push({ n, scope: o.name, loose: o.loose.indexOf(n) >= 0 }); }));
    list.forEach((x, i) => { idx[x.n.id] = i + 1; });
    const m = Flow.map(flow);
    const gname = id => { const g = (flow.groups || []).find(x => x.id === id); return g ? g.name : ''; };
    const label = id => (id && m[id] ? '#' + idx[id] + ' ' + m[id].title : null);
    const sections = list.map(x => ({
      num: idx[x.n.id], n: x.n, loose: x.loose, scope: x.scope, group: gname(x.n.group),
      type: Flow.TYPES[x.n.type].label, status: Flow.STATUS[x.n.status],
      dests: Flow.ports(x.n).map(p => ({ label: p.label.replace(/^\d+ · /, ''), to: label(p.to) })),
      kind: x.n.type === 'menu' ? Meta.menuKind(x.n) : null
    }));
    const open = sections.filter(s => s.n.status === 'todo' || (s.n.notes && s.n.notes.trim()));
    return { flow, stats: Flow.stats(flow), sections, open, label, idx };
  }

  const KIND = { buttons: 'botões de resposta', list: 'lista', toomany: 'mais de 10 opções (inválido)', empty: 'sem opções' };

  function markdown(flow) {
    const d = docModel(flow), s = d.stats;
    const L = [];
    L.push('# ' + flow.meta.name, '');
    if (flow.meta.description) L.push(flow.meta.description, '');
    L.push('**Bot:** ' + flow.meta.brand + ' · **Gerado em:** ' + dateBR(new Date()) + ' · **Passos:** ' + s.total, '');
    L.push('## Resumo', '', '| Status | Passos |', '|---|---|',
      '| Aprovado | ' + s.approved + ' |', '| Em validação | ' + s.review + ' |', '| A definir | ' + s.todo + ' |', '',
      'Progresso: **' + s.progress + '%** aprovado.', '');
    if (d.open.length) {
      L.push('## Pontos em aberto', '');
      d.open.forEach(x => L.push('- **#' + x.num + ' ' + x.n.title + '** (' + x.status + ')' + (x.n.notes && x.n.notes.trim() ? ': ' + x.n.notes.trim().replace(/\n+/g, ' ') : '')));
      L.push('');
    }
    let scope = null;
    d.sections.forEach(x => {
      if (x.scope !== scope) { scope = x.scope; L.push('## ' + scope, ''); }
      L.push('### ' + x.num + '. ' + x.n.title, '', '*' + x.type + ' · ' + x.status + (x.group ? ' · linha ' + x.group : '') + (x.loose ? ' · fora do fluxo (nenhum caminho chega aqui)' : '') + '*', '');
      if (x.n.type === 'action') L.push('**Sistema:** ' + (x.n.system || '—'), '');
      if (x.n.text) L.push(x.n.text.split('\n').map(t => '> ' + t).join('\n'), '');
      if (x.n.type === 'input') L.push('Guarda em `' + (x.n.variable || '—') + '` · validação: ' + Flow.VALIDATIONS[x.n.validation], '');
      if (x.kind) L.push('Formato: ' + KIND[x.kind], '');
      if (x.dests.length) { L.push('**Destinos**', ''); x.dests.forEach(p => L.push('- ' + p.label + ' → ' + (p.to || '*(a definir)*'))); L.push(''); }
      if (x.n.notes && x.n.notes.trim()) L.push('**Pergunta em aberto:** ' + x.n.notes.trim().replace(/\n+/g, ' '), '');
      if (x.n.comments && x.n.comments.length) {
        L.push('**Comentários**', '');
        x.n.comments.forEach(c => L.push('- ' + (c.resolved ? '~~' : '') + (c.author || 'Sem nome') + ' (' + dateBR(c.date) + '): ' + c.text.replace(/\n+/g, ' ') + (c.resolved ? '~~ (resolvido)' : '')));
        L.push('');
      }
    });
    return L.join('\n');
  }

  function rich(text) {
    return esc(text).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/\{\{\s*([\w.]+)\s*\}\}/g, '<code>$1</code>').replace(/\n/g, '<br>');
  }

  const DOC_CSS = 'body{font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111923;max-width:900px;margin:0 auto;padding:40px 28px}' +
    'h1{font-size:28px;margin:0 0 4px;line-height:1.2}h2{margin:38px 0 12px;font-size:20px;border-bottom:2px solid #111923;padding-bottom:6px}h3{font-size:16px;margin:22px 0 8px}' +
    '.sub{color:#566170;margin:0 0 20px}.cards{display:flex;gap:12px;margin:12px 0}.card{flex:1;border:1px solid #d8d9d1;border-radius:8px;padding:12px 14px}' +
    '.card b{display:block;font-size:26px}.bar{height:8px;background:#e6e6df;border-radius:4px;overflow:hidden;margin:6px 0 2px}.bar i{display:block;height:100%;background:#111923}' +
    '.node{border:2px solid var(--lc,#d8d9d1);border-radius:8px;padding:14px 16px;margin:14px 0;break-inside:avoid}' +
    '.node h3{margin:0 0 2px}.meta{font-size:13px;color:#566170;margin-bottom:8px}.pill{display:inline-block;padding:1px 8px;border-radius:4px;font-size:12px;font-weight:700;background:#ececE6;color:#334050}' +
    '.s-approved .pill{background:#111923;color:#fff}' +
    '.msg{background:#f6f6f2;border-radius:6px;padding:9px 12px;margin:8px 0}ul{margin:6px 0 6px 18px;padding:0}li{margin:2px 0}.q{background:#fff3dc;border:1px solid #f0d39a;border-radius:6px;padding:8px 12px;margin-top:8px}' +
    'code{background:#e6ecff;color:#1d3a8a;padding:0 4px;border-radius:4px;font-size:.9em}.cmt{font-size:13px;color:#334050;margin-top:4px}.todo{color:#a85800}footer{margin-top:40px;color:#8b939c;font-size:12px}' +
    'table{border-collapse:collapse;width:100%;font-size:13.5px;margin:8px 0 16px}th,td{border:1px solid #d8d9d1;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f6f6f2}' +
    '.rd{display:inline-block;min-width:20px;padding:0 5px;border-radius:10px;background:var(--lc,#8b939c);color:#fff;font-weight:700;font-size:12px;text-align:center}' +
    '@media print{body{padding:0}.node{page-break-inside:avoid}}' + PALETTE;

  function page(title, body) {
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title><style>' + DOC_CSS + '</style></head><body>' + body +
      '<footer>Gerado com Chatbot Mapper em ' + dateBR(new Date()) + '</footer></body></html>';
  }

  function docHTML(flow) {
    const d = docModel(flow), s = d.stats;
    const gcolor = id => { const g = (flow.groups || []).find(x => x.id === id); return g ? g.color : 'c0'; };
    let h = '<h1>' + esc(flow.meta.name) + '</h1><p class="sub">' + esc(flow.meta.description || '') + ' Bot: <b>' + esc(flow.meta.brand) + '</b> · gerado em ' + dateBR(new Date()) + '</p>';
    h += '<div class="cards"><div class="card"><b>' + s.approved + '</b>aprovados</div><div class="card"><b>' + s.review + '</b>em validação</div><div class="card"><b>' + s.todo + '</b>a definir</div></div>';
    h += '<div class="bar"><i style="width:' + s.progress + '%"></i></div><small>' + s.progress + '% aprovado · ' + s.total + ' passos</small>';
    if (d.open.length) {
      h += '<h2>Pontos em aberto</h2><ul>' + d.open.map(x => '<li><b>#' + x.num + ' ' + esc(x.n.title) + '</b> <span class="pill">' + esc(x.status) + '</span>' +
        (x.n.notes && x.n.notes.trim() ? ' — ' + esc(x.n.notes.trim().replace(/\n+/g, ' ')) : '') + '</li>').join('') + '</ul>';
    }
    let scope = null;
    d.sections.forEach(x => {
      if (x.scope !== scope) { scope = x.scope; h += '<h2>' + esc(scope) + '</h2>'; }
      h += '<div class="node s-' + x.n.status + '" style="--lc:var(--' + gcolor(x.n.group) + ')"><h3>' + x.num + '. ' + esc(x.n.title) + '</h3><div class="meta">' + esc(x.type) + ' · <span class="pill">' + esc(x.status) + '</span>' +
        (x.group ? ' · linha ' + esc(x.group) : '') + (x.loose ? ' · <b>fora do fluxo</b>' : '') + (x.n.type === 'action' ? ' · sistema: ' + esc(x.n.system || '—') : '') + (x.kind ? ' · formato: ' + esc(KIND[x.kind]) : '') + '</div>';
      if (x.n.text) h += '<div class="msg">' + rich(x.n.text) + '</div>';
      if (x.n.type === 'input') h += '<div class="meta">Guarda em <code>' + esc(x.n.variable || '—') + '</code> · validação: ' + esc(Flow.VALIDATIONS[x.n.validation]) + '</div>';
      if (x.dests.length) h += '<ul>' + x.dests.map(p => '<li>' + esc(p.label) + ' → ' + (p.to ? esc(p.to) : '<span class="todo">a definir</span>') + '</li>').join('') + '</ul>';
      if (x.n.notes && x.n.notes.trim()) h += '<div class="q"><b>Pergunta em aberto:</b> ' + esc(x.n.notes.trim()) + '</div>';
      (x.n.comments || []).forEach(c => { h += '<div class="cmt"><b>' + esc(c.author || 'Sem nome') + '</b> (' + dateBR(c.date) + (c.resolved ? ', resolvido' : '') + '): ' + esc(c.text) + '</div>'; });
      h += '</div>';
    });
    return page(flow.meta.name, h);
  }

  /* ---------- 4. especificação para o desenvolvimento ---------- */
  function specModel(flow) {
    const d = docModel(flow), m = Flow.map(flow);
    const vars = Flow.discoverVariables(flow);
    const rules = [], integrations = {};
    flow.nodes.filter(n => n.type === 'action').forEach(n => {
      const sys = n.system || '(sistema não informado)';
      (integrations[sys] = integrations[sys] || []).push(n);
      const rows = n.cases && n.cases.length ? n.cases.map(c => ({ c, label: c.label, when: (c.when || []).map(w => Flow.condText(w, flow)).join(' e ') || '(sem condição)', to: d.label(c.next) }))
        : [{ label: 'Sucesso', when: '—', to: d.label(n.onSuccess) }];
      rows.concat([{ label: 'Falha / não encontrado', when: '—', to: d.label(n.onFailure) }]).forEach(r => rules.push({ node: n, system: sys, label: r.label, when: r.when, to: r.to }));
    });
    const templates = flow.nodes.filter(n => n.type === 'message' && n.template && n.template.enabled).map(n => ({ node: n, t: Meta.toTemplate(n) }));
    const tests = Analysis.runAll(flow).map(r => ({ test: r.test, result: r.result, steps: r.test.steps.map(s => (m[s.node] ? m[s.node].title : s.node) + ' → ' + stepLabel(m[s.node], s)) }));
    const subflows = (flow.subflows || []).map(s => ({ s, start: d.label(s.start), callers: flow.nodes.filter(n => n.type === 'call' && n.target === s.id).map(n => d.label(n.id)) }));
    return { d, vars, rules, integrations, templates, tests, subflows, volume: Analysis.volume(flow) };
  }
  function stepLabel(n, s) {
    if (!n) return s.port;
    const p = Flow.ports(n).find(x => x.port === s.port);
    return (p ? p.label.replace(/^\d+ · /, '') : s.port) + (s.text ? ' ("' + s.text + '")' : '');
  }

  const cell = s => String(s == null || s === '' ? '—' : s).replace(/\|/g, '\\|').replace(/\n+/g, ' ');

  function specMarkdown(flow) {
    const S = specModel(flow), d = S.d, s = d.stats, L = [];
    const table = (head, rows) => { L.push('| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|'); rows.forEach(r => L.push('| ' + r.map(cell).join(' | ') + ' |')); L.push(''); };
    L.push('# Especificação: ' + flow.meta.name, '');
    if (flow.meta.description) L.push(flow.meta.description, '');
    L.push('Gerado em ' + dateBR(new Date()) + ' · ' + s.total + ' passos · ' + s.progress + '% aprovado', '');
    L.push('## 1. Resumo', '');
    table(['Status', 'Passos'], [['Aprovado', s.approved], ['Em validação', s.review], ['A definir', s.todo]]);
    L.push('Mensagens enviadas pelo bot por conversa: mínimo ' + S.volume.min + ', média ' + S.volume.avg.toLocaleString('pt-BR') + ', máximo ' + S.volume.max + ' (' + S.volume.paths + ' caminhos' + (S.volume.truncated ? ', enumeração truncada' : '') + ').', '');
    L.push('## 2. Passos', '');
    table(['#', 'Escopo', 'Linha', 'Passo', 'Tipo', 'Texto', 'Saídas', 'Status'], d.sections.map(x => ['#' + x.num, x.scope, x.group, x.n.title, x.type,
      x.n.type === 'action' ? (x.n.system || '') + ': ' + (x.n.text || '') : x.n.text, x.dests.map(p => p.label + ' → ' + (p.to || 'a definir')).join('; '), x.status]));
    L.push('## 3. Regras dos cenários', '');
    S.rules.length ? table(['Ação', 'Sistema', 'Cenário', 'Condições', 'Destino'], S.rules.map(r => [r.node.title, r.system, r.label, r.when, r.to || 'a definir'])) : L.push('Nenhum item.', '');
    L.push('## 4. Integrações', '');
    const ints = Object.keys(S.integrations);
    ints.length ? table(['Sistema', 'Passos que usam'], ints.map(k => [k, S.integrations[k].map(n => '#' + d.idx[n.id] + ' ' + n.title).join('; ')])) : L.push('Nenhum item.', '');
    L.push('## 5. Dicionário de dados', '');
    (flow.variables || []).length ? table(['Variável', 'Rótulo', 'Origem', 'Campo', 'Regra', 'Tipo', 'Exemplo'], flow.variables.map(v => ['`' + v.name + '`', v.label, v.source, v.field, v.rule, Flow.VAR_TYPES[v.type] || v.type, v.example])) : L.push('Nenhum item.', '');
    if (S.vars.undefined.length) L.push('Variáveis usadas sem definição: ' + S.vars.undefined.map(v => '`' + v + '`').join(', ') + '.', '');
    L.push('## 6. Templates da Meta', '');
    S.templates.length ? table(['Passo', 'Nome', 'Categoria', 'Idioma', 'Status', 'Corpo'], S.templates.map(x => [x.node.title, x.t.name, Flow.TEMPLATE_CATEGORIES[x.t.category] || x.t.category, x.t.language, Flow.TEMPLATE_APPROVAL[x.t.approval] || x.t.approval, x.t.body])) : L.push('Nenhum item.', '');
    L.push('## 7. Subfluxos', '');
    S.subflows.length ? table(['Subfluxo', 'Início', 'Chamado por'], S.subflows.map(x => [x.s.name, x.start, x.callers.join('; ') || 'ninguém'])) : L.push('Nenhum item.', '');
    L.push('## 8. Cenários de teste', '');
    S.tests.length ? table(['Cenário', 'Escolhas', 'Mensagens', 'Resultado'], S.tests.map(x => [x.test.name, x.steps.join('; '), x.result.messages, x.result.ok ? 'passou' : 'falhou: ' + x.result.reason])) : L.push('Nenhum item.', '');
    return L.join('\n');
  }

  function specHTML(flow) {
    const S = specModel(flow), d = S.d, s = d.stats;
    const table = (head, rows) => rows.length ? '<table><thead><tr>' + head.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map(c => '<td>' + (c && c.html ? c.html : esc(c == null || c === '' ? '—' : c)) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' : '<p>Nenhum item.</p>';
    const code = v => ({ html: '<code>' + esc(v) + '</code>' });
    let h = '<h1>Especificação: ' + esc(flow.meta.name) + '</h1><p class="sub">' + esc(flow.meta.description || '') + ' Gerado em ' + dateBR(new Date()) + ' · ' + s.total + ' passos · ' + s.progress + '% aprovado.</p>';
    h += '<h2>1. Resumo</h2>' + table(['Status', 'Passos'], [['Aprovado', s.approved], ['Em validação', s.review], ['A definir', s.todo]]);
    h += '<p>Mensagens enviadas pelo bot por conversa: mínimo <b>' + S.volume.min + '</b>, média <b>' + S.volume.avg.toLocaleString('pt-BR') + '</b>, máximo <b>' + S.volume.max + '</b> (' + S.volume.paths + ' caminhos' + (S.volume.truncated ? ', enumeração truncada' : '') + ').</p>';
    h += '<h2>2. Passos</h2>' + table(['#', 'Escopo', 'Linha', 'Passo', 'Tipo', 'Texto', 'Saídas', 'Status'], d.sections.map(x => ['#' + x.num, x.scope, x.group, x.n.title, x.type,
      { html: x.n.type === 'action' ? esc((x.n.system || '') + ': ' + (x.n.text || '')) : rich(x.n.text || '') }, { html: x.dests.map(p => esc(p.label) + ' → ' + (p.to ? esc(p.to) : '<span class="todo">a definir</span>')).join('<br>') }, x.status]));
    h += '<h2>3. Regras dos cenários</h2>' + table(['Ação', 'Sistema', 'Cenário', 'Condições', 'Destino'], S.rules.map(r => [r.node.title, r.system, r.label, r.when, r.to || 'a definir']));
    h += '<h2>4. Integrações</h2>' + table(['Sistema', 'Passos que usam'], Object.keys(S.integrations).map(k => [k, S.integrations[k].map(n => '#' + d.idx[n.id] + ' ' + n.title).join('; ')]));
    h += '<h2>5. Dicionário de dados</h2>' + table(['Variável', 'Rótulo', 'Origem', 'Campo', 'Regra', 'Tipo', 'Exemplo'], (flow.variables || []).map(v => [code(v.name), v.label, v.source, v.field ? code(v.field) : '', v.rule, Flow.VAR_TYPES[v.type] || v.type, v.example]));
    if (S.vars.undefined.length) h += '<p class="q">Variáveis usadas sem definição: ' + S.vars.undefined.map(v => '<code>' + esc(v) + '</code>').join(', ') + '.</p>';
    h += '<h2>6. Templates da Meta</h2>' + table(['Passo', 'Nome', 'Categoria', 'Idioma', 'Status', 'Corpo'], S.templates.map(x => [x.node.title, code(x.t.name), Flow.TEMPLATE_CATEGORIES[x.t.category] || x.t.category, x.t.language, Flow.TEMPLATE_APPROVAL[x.t.approval] || x.t.approval, x.t.body]));
    h += '<h2>7. Subfluxos</h2>' + table(['Subfluxo', 'Início', 'Chamado por'], S.subflows.map(x => [x.s.name, x.start, x.callers.join('; ') || 'ninguém']));
    h += '<h2>8. Cenários de teste</h2>' + table(['Cenário', 'Escolhas', 'Mensagens', 'Resultado'], S.tests.map(x => [x.test.name, { html: x.steps.map(esc).join('<br>') }, x.result.messages, x.result.ok ? 'passou' : 'falhou: ' + x.result.reason]));
    return page('Especificação: ' + flow.meta.name, h);
  }

  /* ---------- 5. pendências (pauta) ---------- */
  function pendRows(flow) { return Analysis.openQuestions(flow, Flow.lint(flow, Meta)); }
  const HEAD = ['Tipo', 'Passo', 'Linha', 'Escopo', 'Status', 'Descrição', 'Autor'];
  const rowOf = r => [r.kind, r.title, r.group, r.scope, r.status, r.text, r.who];
  function pendCSV(flow) {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
    return '﻿' + [HEAD].concat(pendRows(flow).map(rowOf)).map(r => r.map(q).join(';')).join('\r\n');
  }
  function pendMarkdown(flow) {
    return '# Pendências: ' + flow.meta.name + '\n\n| ' + HEAD.join(' | ') + ' |\n|' + HEAD.map(() => '---').join('|') + '|\n' +
      pendRows(flow).map(r => '| ' + rowOf(r).map(cell).join(' | ') + ' |').join('\n') + '\n';
  }
  function pendHTMLTable(flow) {
    const st = 'border:1px solid #c8cac2;padding:5px 8px;text-align:left;vertical-align:top;font:13px/1.4 Arial,sans-serif';
    return '<table style="border-collapse:collapse"><thead><tr>' + HEAD.map(h => '<th style="' + st + ';background:#f0f0ea">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      pendRows(flow).map(r => '<tr>' + rowOf(r).map(c => '<td style="' + st + '">' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  }

  /* ---------- 6. simulador e revisão em HTML único ---------- */
  const safe = obj => JSON.stringify(obj).replace(/</g, '\\u003c');

  function playerHTML(flow) {
    const clean = clientCopy(flow);
    const pageCss = 'html,body{height:100%;margin:0}body{display:flex;flex-direction:column;align-items:center;background:#efefe9;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111923}' +
      'header{text-align:center;padding:22px 16px 8px}h1{margin:0;font-size:21px}header p{margin:4px 0 0;color:#566170;font-size:14px}' +
      '#phone{flex:1;width:100%;min-height:0;padding:12px 16px}.opts{display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:center;font-size:14px;color:#334050;padding:6px 0 14px}.opts label{display:flex;gap:6px;align-items:center}select{font:inherit;padding:4px 6px;border-radius:6px;border:1px solid #b2b6ad}footer{font-size:12px;color:#8b939c;padding:0 0 14px}';
    const personas = clean.personas || [];
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(flow.meta.name) + ' — simulador</title>' +
      '<style>' + pageCss + '\n' + PLAYER_CSS + '</style></head><body>' +
      '<header><h1>' + esc(flow.meta.name) + '</h1><p>Simulador interativo. Toque nas opções ou digite como no WhatsApp.</p></header>' +
      '<div id="phone"></div><div class="opts">' + (personas.length > 1 ? '<label>Dados de exemplo <select id="persona">' + personas.map(p => '<option value="' + esc(p.id) + '"' + (p.id === clean.settings.persona ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></label>' : '') +
      '<label><input type="checkbox" id="tags"> Mostrar o nome de cada passo</label></div>' +
      '<footer>Gerado com Chatbot Mapper em ' + dateBR(new Date()) + '</footer>' +
      '<script>\nvar FLOW = ' + safe(clean) + ';\n' + ChatPlayer.toString() + '\n' +
      'function values(id){var p=(FLOW.personas||[]).filter(function(x){return x.id===id;})[0];return p?p.values:{};}\n' +
      'var tags=document.getElementById("tags"),sel=document.getElementById("persona"),player;\n' +
      'function start(){if(player)player.destroy();player=ChatPlayer(document.getElementById("phone"),FLOW,{delay:600,showNodes:tags.checked,values:values(sel?sel.value:FLOW.settings.persona)});}\n' +
      'start();tags.addEventListener("change",function(){player.setShowNodes(tags.checked);});if(sel)sel.addEventListener("change",start);\n</scr' + 'ipt></body></html>';
  }

  function reviewHTML(flow) {
    const clean = clientCopy(flow);
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisão — ' + esc(flow.meta.name) + '</title>' +
      '<style>' + fontFaceCSS() + REVIEW_CSS + '\n' + PLAYER_CSS + '</style></head><body><div id="app"></div>' +
      '<script>\nvar FLOW = ' + safe(clean) + ';\n' + ChatPlayer.toString() + '\n' + ReviewPage.toString() + '\n' +
      'function values(){var p=(FLOW.personas||[]).filter(function(x){return x.id===FLOW.settings.persona;})[0];return p?p.values:{};}\n' +
      'ReviewPage(document.getElementById("app"),FLOW,{player:function(el,startAt){return ChatPlayer(el,FLOW,{delay:450,startAt:startAt,values:values()});}});\n</scr' + 'ipt></body></html>';
  }

  root.Exporters = { download, fileBase, flowJSON, clientCopy, metaMessages, markdown, docHTML, docModel, specModel, specMarkdown, specHTML, pendCSV, pendMarkdown, pendHTMLTable, playerHTML, reviewHTML };
})(window);

/* exporters.js — saídas do fluxo: .json, mensagens Meta, documentos e simulador em HTML único. */
(function (root) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateBR = d => new Date(d).toLocaleDateString('pt-BR');

  function fileBase(flow) { return Flow.slug(flow.meta.name).replace(/_/g, '-') || 'fluxo'; }

  function download(name, text, mime) {
    const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- 1. fluxo (.json) ---------- */
  function flowJSON(flow) {
    return JSON.stringify(flow, (k, v) => (k === '_needsLayout' ? undefined : v), 2);
  }

  /* ---------- 2. mensagens no formato da Meta ---------- */
  function metaMessages(flow) {
    const o = Flow.order(flow);
    const built = o.reachable.concat(o.loose).map(n => Meta.buildNode(n));
    const templates = built.filter(b => b.template).map(b => Object.assign({ node: b.node }, b.template));
    const errors = Flow.lint(flow, Meta).filter(i => i.severity === 'error');
    return JSON.stringify({
      schema: 'chatbot-mapper/meta-messages/1',
      flow: { name: flow.meta.name, start: flow.settings.startNode, generatedAt: new Date().toISOString() },
      notes: [
        'payload: corpo pronto para POST /{phone-number-id}/messages (WhatsApp Cloud API).',
        '"to": "{{wa_id}}" e as variáveis {{nome}} dos textos devem ser substituídas pelo seu serviço antes do envio.',
        'routes: para onde ir depois. Em menus, a chave é o id da opção escolhida (resposta interativa); "*" = texto livre fora das opções (reenviar o menu).',
        'Mensagens livres só podem ser enviadas dentro da janela de 24 h aberta pelo cliente; fora dela, use templates (lista em "templates").'
      ],
      limits: Meta.LIMITS,
      fallbackText: flow.settings.fallbackText,
      templates,
      errors,
      messages: built
    }, null, 2);
  }

  /* ---------- 3. documento legível ---------- */
  function docModel(flow) {
    const o = Flow.order(flow);
    const list = o.reachable.concat(o.loose);
    const idx = {};
    list.forEach((n, i) => { idx[n.id] = i + 1; });
    const m = Flow.map(flow);
    const label = id => (id && m[id] ? '#' + idx[id] + ' ' + m[id].title : null);
    const sections = list.map(n => ({
      num: idx[n.id], n, loose: o.loose.indexOf(n) >= 0,
      type: Flow.TYPES[n.type].label, status: Flow.STATUS[n.status],
      dests: Flow.ports(n).map(p => ({ label: p.label.replace(/^\d+ · /, ''), to: label(p.to) })),
      kind: n.type === 'menu' ? Meta.menuKind(n) : null
    }));
    const open = sections.filter(s => s.n.status === 'todo' || (s.n.notes && s.n.notes.trim()));
    return { flow, stats: Flow.stats(flow), sections, open };
  }

  const KIND = { buttons: 'botões de resposta', list: 'lista', toomany: 'mais de 10 opções (inválido)', empty: 'sem opções' };

  function markdown(flow) {
    const d = docModel(flow), s = d.stats;
    const L = [];
    L.push('# ' + flow.meta.name, '');
    if (flow.meta.description) L.push(flow.meta.description, '');
    L.push('**Bot:** ' + flow.meta.brand + ' · **Gerado em:** ' + dateBR(new Date()) + ' · **Nós:** ' + s.total, '');
    L.push('## Resumo', '', '| Status | Nós |', '|---|---|',
      '| Aprovado | ' + s.approved + ' |', '| Em validação | ' + s.review + ' |', '| A definir | ' + s.todo + ' |', '',
      'Progresso: **' + s.progress + '%** aprovado.', '');
    if (d.open.length) {
      L.push('## Pontos em aberto', '');
      d.open.forEach(x => {
        L.push('- **#' + x.num + ' ' + x.n.title + '** (' + x.status + ')' + (x.n.notes && x.n.notes.trim() ? ': ' + x.n.notes.trim().replace(/\n+/g, ' ') : ''));
      });
      L.push('');
    }
    L.push('## Fluxo', '');
    d.sections.forEach(x => {
      L.push('### ' + x.num + '. ' + x.n.title, '', '*' + x.type + ' · ' + x.status + (x.loose ? ' · fora do fluxo (nenhum caminho chega aqui)' : '') + '*', '');
      if (x.n.type === 'action') L.push('**Sistema:** ' + (x.n.system || '—'), '');
      if (x.n.text) L.push(x.n.text.split('\n').map(t => '> ' + t).join('\n'), '');
      if (x.n.type === 'input') L.push('Guarda em `' + (x.n.variable || '—') + '` · validação: ' + Flow.VALIDATIONS[x.n.validation], '');
      if (x.kind) L.push('Formato: ' + KIND[x.kind], '');
      if (x.dests.length) {
        L.push('**Destinos**', '');
        x.dests.forEach(p => L.push('- ' + p.label + ' → ' + (p.to || '*(a definir)*')));
        L.push('');
      }
      if (x.n.notes && x.n.notes.trim()) L.push('**Pergunta em aberto:** ' + x.n.notes.trim().replace(/\n+/g, ' '), '');
      if (x.n.comments && x.n.comments.length) {
        L.push('**Comentários**', '');
        x.n.comments.forEach(c => L.push('- ' + (c.author || 'Sem nome') + ' (' + dateBR(c.date) + '): ' + c.text.replace(/\n+/g, ' ')));
        L.push('');
      }
    });
    return L.join('\n');
  }

  function rich(text) {
    return esc(text).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/\{\{\s*([\w.]+)\s*\}\}/g, '<code>$1</code>').replace(/\n/g, '<br>');
  }

  function docHTML(flow) {
    const d = docModel(flow), s = d.stats;
    const css = 'body{font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#18242b;max-width:860px;margin:0 auto;padding:40px 28px}' +
      'h1{font-size:28px;margin:0 0 4px}h2{margin:36px 0 12px;font-size:19px;border-bottom:2px solid #e3ecee;padding-bottom:6px}' +
      '.sub{color:#5b6b73;margin:0 0 20px}.cards{display:flex;gap:12px;margin:12px 0}.card{flex:1;border:1px solid #dbe5e8;border-radius:12px;padding:12px 14px}' +
      '.card b{display:block;font-size:26px}.bar{height:8px;background:#e6eef0;border-radius:99px;overflow:hidden;margin:6px 0 2px}.bar i{display:block;height:100%;background:#16a34a}' +
      '.node{border:1px solid #dbe5e8;border-left:5px solid #94a3b8;border-radius:10px;padding:14px 16px;margin:14px 0;break-inside:avoid}' +
      '.node.s-approved{border-left-color:#16a34a}.node.s-review{border-left-color:#2563eb}.node.s-todo{border-left-color:#d97706}' +
      '.node h3{margin:0 0 2px;font-size:16px}.meta{font-size:12.5px;color:#5b6b73;margin-bottom:8px}.pill{display:inline-block;padding:1px 9px;border-radius:99px;font-size:11.5px;font-weight:600;background:#eef2f4;color:#41525a}' +
      '.s-approved .pill{background:#dcfce7;color:#166534}.s-review .pill{background:#dbeafe;color:#1e40af}.s-todo .pill{background:#fef3c7;color:#92400e}' +
      '.msg{background:#f4f8f8;border-radius:8px;padding:9px 12px;margin:8px 0}ul{margin:6px 0 6px 18px;padding:0}li{margin:2px 0}.q{background:#fff7e6;border:1px solid #fcd9a0;border-radius:8px;padding:8px 12px;margin-top:8px}' +
      'code{background:#e6f4f2;color:#0b6b61;padding:0 4px;border-radius:4px}.cmt{font-size:13px;color:#41525a;margin-top:4px}.todo{color:#b45309}footer{margin-top:40px;color:#8a99a0;font-size:12px}' +
      '@media print{body{padding:0}.node{page-break-inside:avoid}}';
    let h = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(flow.meta.name) + '</title><style>' + css + '</style></head><body>';
    h += '<h1>' + esc(flow.meta.name) + '</h1><p class="sub">' + esc(flow.meta.description || '') + ' Bot: <b>' + esc(flow.meta.brand) + '</b> · gerado em ' + dateBR(new Date()) + '</p>';
    h += '<div class="cards"><div class="card"><b>' + s.approved + '</b>aprovados</div><div class="card"><b>' + s.review + '</b>em validação</div><div class="card"><b>' + s.todo + '</b>a definir</div></div>';
    h += '<div class="bar"><i style="width:' + s.progress + '%"></i></div><small>' + s.progress + '% aprovado · ' + s.total + ' nós</small>';
    if (d.open.length) {
      h += '<h2>Pontos em aberto</h2><ul>' + d.open.map(x => '<li><b>#' + x.num + ' ' + esc(x.n.title) + '</b> <span class="pill">' + esc(x.status) + '</span>' +
        (x.n.notes && x.n.notes.trim() ? ' — ' + esc(x.n.notes.trim().replace(/\n+/g, ' ')) : '') + '</li>').join('') + '</ul>';
    }
    h += '<h2>Fluxo</h2>';
    d.sections.forEach(x => {
      h += '<div class="node s-' + x.n.status + '"><h3>' + x.num + '. ' + esc(x.n.title) + '</h3><div class="meta">' + esc(x.type) + ' · <span class="pill">' + esc(x.status) + '</span>' +
        (x.loose ? ' · <b>fora do fluxo</b>' : '') + (x.n.type === 'action' ? ' · sistema: ' + esc(x.n.system || '—') : '') + (x.kind ? ' · formato: ' + esc(KIND[x.kind]) : '') + '</div>';
      if (x.n.text) h += '<div class="msg">' + rich(x.n.text) + '</div>';
      if (x.n.type === 'input') h += '<div class="meta">Guarda em <code>' + esc(x.n.variable || '—') + '</code> · validação: ' + esc(Flow.VALIDATIONS[x.n.validation]) + '</div>';
      if (x.dests.length) h += '<ul>' + x.dests.map(p => '<li>' + esc(p.label) + ' → ' + (p.to ? esc(p.to) : '<span class="todo">a definir</span>') + '</li>').join('') + '</ul>';
      if (x.n.notes && x.n.notes.trim()) h += '<div class="q"><b>Pergunta em aberto:</b> ' + esc(x.n.notes.trim()) + '</div>';
      (x.n.comments || []).forEach(c => { h += '<div class="cmt">💬 <b>' + esc(c.author || 'Sem nome') + '</b> (' + dateBR(c.date) + '): ' + esc(c.text) + '</div>'; });
      h += '</div>';
    });
    h += '<footer>Gerado com Chatbot Mapper</footer></body></html>';
    return h;
  }

  /* ---------- 4. simulador em HTML único ---------- */
  function playerHTML(flow) {
    const clean = JSON.parse(flowJSON(flow));
    clean.nodes.forEach(n => { delete n.notes; delete n.comments; });
    const data = JSON.stringify(clean).replace(/</g, '\\u003c');
    const page = 'html,body{height:100%;margin:0}body{display:flex;flex-direction:column;align-items:center;background:radial-gradient(circle at 20% 10%,#e3f4f1,#f4f7fb 55%,#eceef9);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#18242b}' +
      'header{text-align:center;padding:22px 16px 8px}h1{margin:0;font-size:21px}header p{margin:4px 0 0;color:#5b6b73;font-size:13.5px}' +
      '#phone{flex:1;width:100%;min-height:0;padding:12px 16px}label.opt{font-size:13px;color:#41525a;display:flex;gap:6px;align-items:center;padding:6px 0 14px;cursor:pointer}footer{font-size:11.5px;color:#8a99a0;padding:0 0 14px}';
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(flow.meta.name) + ' — simulador</title>' +
      '<style>' + page + '\n' + PLAYER_CSS + '</style></head><body>' +
      '<header><h1>' + esc(flow.meta.name) + '</h1><p>Simulador interativo — toque nas opções ou digite como no WhatsApp.</p></header>' +
      '<div id="phone"></div><label class="opt"><input type="checkbox" id="tags"> Mostrar o nome de cada passo do fluxo</label>' +
      '<footer>Gerado com Chatbot Mapper em ' + dateBR(new Date()) + '</footer>' +
      '<script>\nvar FLOW = ' + data + ';\n' + ChatPlayer.toString() + '\n' +
      'var player = ChatPlayer(document.getElementById("phone"), FLOW, { delay: 600 });\n' +
      'document.getElementById("tags").addEventListener("change", function (e) { player.setShowNodes(e.target.checked); });\n</scr' + 'ipt></body></html>';
  }

  root.Exporters = { download, fileBase, flowJSON, metaMessages, markdown, docHTML, playerHTML, docModel };
})(window);

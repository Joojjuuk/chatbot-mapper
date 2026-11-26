/* inspector.js — painel "Editar": passo selecionado, vários passos (em massa) ou ajustes do fluxo
   (linhas/grupos, subfluxos, início). */
(function (root) {
  'use strict';

  let el = null;
  let ids = [];

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const flowNow = () => Store.get();
  const node = () => { const f = flowNow(); return f && ids.length === 1 ? f.nodes.find(n => n.id === ids[0]) : null; };
  const scope = () => Graph.getScope();
  const dateBR = d => { try { return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

  function init(container) {
    el = container;
    el.addEventListener('input', onInput);
    el.addEventListener('change', onChange);
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);
  }

  function show(sel) { ids = Array.isArray(sel) ? sel.slice() : (sel ? [sel] : []); render(); }
  function current() { return ids.length === 1 ? ids[0] : null; }

  function render() {
    if (!el || !flowNow()) return;
    const f = flowNow();
    ids = ids.filter(id => f.nodes.some(n => n.id === id));
    if (ids.length > 1) renderBulk();
    else if (node()) renderNode();
    else renderFlow();
    updateCounters();
  }

  /* ---------- campos reutilizáveis ---------- */
  function targetSelect(flow, n, port, value) {
    const opts = ['<option value="">Sem destino</option>'].concat(Flow.scopeNodes(flow, n.subflow).filter(x => x.id !== n.id).map(x =>
      '<option value="' + esc(x.id) + '"' + (x.id === value ? ' selected' : '') + '>' + esc(x.title) + ' · ' + esc(Flow.TYPES[x.type].label) + '</option>'));
    return '<select data-link="' + esc(port) + '" aria-label="Destino">' + opts.join('') + '</select>';
  }
  function field(label, inner, hint) {
    return '<label class="fld"><span class="fld-l">' + label + '</span>' + inner + (hint ? '<small class="hint">' + hint + '</small>' : '') + '</label>';
  }
  const counter = key => '<span class="counter" data-counter="' + esc(key) + '"></span>';
  const sec = (title, extra) => '<h3 class="sec">' + title + (extra || '') + '</h3>';

  function groupSelect(flow, value, attr) {
    return '<select ' + attr + '><option value="">Sem linha</option>' + (flow.groups || []).map((g, i) =>
      '<option value="' + esc(g.id) + '"' + (g.id === value ? ' selected' : '') + '>' + (i + 1) + ' · ' + esc(g.name) + '</option>').join('') + '</select>';
  }

  function statusSeg(value, attr) {
    return '<div class="seg" role="radiogroup" aria-label="Status">' + Object.keys(Flow.STATUS).map(s =>
      '<button type="button" role="radio" aria-checked="' + (value === s) + '" class="' + (value === s ? 'on' : '') + '" ' + attr + '="' + s + '">' + Icons.mark(s) + esc(Flow.STATUS[s]) + '</button>').join('') + '</div>';
  }

  function textLabel(type) {
    return { message: 'Mensagem do bot', menu: 'Texto do menu', input: 'Pergunta ao cliente', action: 'O que o sistema faz', handoff: 'Mensagem antes de transferir (opcional)', end: 'Mensagem final (opcional)', call: 'Observação', return: 'Observação' }[type];
  }

  /* ---------- um passo ---------- */
  function renderNode() {
    const flow = flowNow(), n = node();
    const issues = Flow.lint(flow, Meta).filter(i => i.nodeId === n.id && i.severity !== 'info');
    const isStart = Flow.scopeStart(flow, n.subflow) === n.id;
    let h = '<div class="ins-head"><span class="tico">' + Icons.get(n.type) + '</span><div><b>' + esc(Flow.TYPES[n.type].label) + '</b><small>' + esc(Flow.TYPES[n.type].hint) + '</small></div></div>';
    h += '<div class="ins-actions">' +
      (isStart ? '<span class="pill">Início ' + (n.subflow ? 'do subfluxo' : 'do fluxo') + '</span>' : '<button type="button" class="btn sm" data-act="setstart">Definir como início</button>') +
      '<button type="button" class="btn sm" data-act="next" title="Cria o próximo passo ligado a este (Tab)">' + Icons.get('plus') + 'Próximo passo</button>' +
      '<button type="button" class="btn sm" data-act="duplicate">' + Icons.get('copy') + 'Duplicar</button>' +
      '<button type="button" class="btn sm danger" data-act="delete">' + Icons.get('trash') + 'Excluir</button></div>';
    if (issues.length) h += '<ul class="issues">' + issues.map(i => '<li class="' + i.severity + '">' + Icons.get(i.severity === 'error' ? 'error' : 'warn') + '<span>' + esc(i.message) + '</span></li>').join('') + '</ul>';

    h += field('Título', '<input type="text" data-f="title" value="' + esc(n.title) + '">');
    h += '<div class="row2">' + field('Linha (grupo)', groupSelect(flow, n.group, 'data-group-select')) +
      '<div class="fld"><span class="fld-l">Tipo</span><div class="kind" style="margin:0;padding:7px 10px">' + esc(Flow.TYPES[n.type].label) + '</div></div></div>';
    h += '<div class="fld"><span class="fld-l">Status</span>' + statusSeg(n.status, 'data-status') + '</div>';

    if (n.type === 'call') {
      const opts = '<option value="">Escolha o subfluxo</option>' + (flow.subflows || []).filter(s => s.id !== n.subflow).map(s => '<option value="' + esc(s.id) + '"' + (s.id === n.target ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('');
      h += field('Subfluxo chamado', '<select data-f="target">' + opts + '</select>', 'O subfluxo roda e, ao chegar em "Voltar ao fluxo", a conversa segue pelo próximo passo abaixo.');
      if (n.target) h += '<div class="btn-row"><button type="button" class="btn sm" data-act="openscope" data-sf="' + esc(n.target) + '">' + Icons.get('enter') + 'Abrir o subfluxo</button></div>';
      h += '<div class="btn-row"><button type="button" class="btn sm" data-act="newsubflow">' + Icons.get('plus') + 'Criar subfluxo novo para este passo</button></div>';
      h += field('Depois do subfluxo, segue para', targetSelect(flow, n, 'next', n.next));
    } else if (n.type !== 'return') {
      h += field(textLabel(n.type) + ' ' + (n.type === 'action' ? '' : counter('text')), '<textarea rows="4" data-f="text">' + esc(n.text) + '</textarea>',
        n.type === 'action' ? '' : 'Use {{variavel}} para dados do cliente, *negrito* e _itálico_.');
    }

    if (n.type === 'message') {
      h += field('Depois, segue para', targetSelect(flow, n, 'next', n.next));
      const t = n.template || {};
      h += '<label class="chk"><input type="checkbox" data-f="template.enabled"' + (t.enabled ? ' checked' : '') + '> Enviar como <b>template da Meta</b> (fora da janela de 24 h)</label>';
      if (t.enabled) {
        h += '<div class="row2">' + field('Nome do template', '<input type="text" data-f="template.name" value="' + esc(t.name) + '" placeholder="ex.: aviso_pedido">') +
          field('Categoria', '<select data-f="template.category">' + Object.keys(Flow.TEMPLATE_CATEGORIES).map(c => '<option value="' + c + '"' + (t.category === c ? ' selected' : '') + '>' + esc(Flow.TEMPLATE_CATEGORIES[c]) + '</option>').join('') + '</select>') + '</div>';
        h += '<div class="row2">' + field('Idioma', '<input type="text" data-f="template.language" value="' + esc(t.language || 'pt_BR') + '">') +
          field('Aprovação na Meta', '<select data-f="template.approval">' + Object.keys(Flow.TEMPLATE_APPROVAL).map(c => '<option value="' + c + '"' + (t.approval === c ? ' selected' : '') + '>' + esc(Flow.TEMPLATE_APPROVAL[c]) + '</option>').join('') + '</select>') + '</div>';
      }
    }

    if (n.type === 'menu') {
      h += '<div class="row2">' + field('Cabeçalho ' + counter('header'), '<input type="text" data-f="header" value="' + esc(n.header) + '">') +
        field('Rodapé ' + counter('footer'), '<input type="text" data-f="footer" value="' + esc(n.footer) + '">') + '</div>';
      h += '<div class="row2">' + field('Formato no WhatsApp', '<select data-f="menuStyle">' +
        [['auto', 'Automático'], ['buttons', 'Botões (até 3)'], ['list', 'Lista']].map(o => '<option value="' + o[0] + '"' + (n.menuStyle === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>') +
        field('Botão da lista ' + counter('listButton'), '<input type="text" data-f="listButton" value="' + esc(n.listButton) + '">') + '</div>';
      h += '<div class="kind" data-kind></div>';
      h += '<div class="fld"><span class="fld-l">Opções</span><div class="opts">' + (n.options || []).map((o, i) =>
        '<div class="opt"><div class="opt-top"><span class="opt-n">' + (i + 1) + '</span>' +
        '<input type="text" data-opt="' + i + '" data-of="label" value="' + esc(o.label) + '" placeholder="Rótulo" aria-label="Rótulo da opção ' + (i + 1) + '">' + counter('optlabel:' + i) +
        '<button type="button" class="ico-btn" data-act="upopt" data-i="' + i + '" title="Subir"' + (i === 0 ? ' disabled' : '') + '>' + Icons.get('up') + '</button>' +
        '<button type="button" class="ico-btn" data-act="downopt" data-i="' + i + '" title="Descer"' + (i === n.options.length - 1 ? ' disabled' : '') + '>' + Icons.get('down') + '</button>' +
        '<button type="button" class="ico-btn" data-act="delopt" data-i="' + i + '" title="Remover">' + Icons.get('x') + '</button></div>' +
        '<input type="text" class="opt-desc" data-opt="' + i + '" data-of="description" value="' + esc(o.description) + '" placeholder="Descrição (só na lista, opcional)">' + counter('optdesc:' + i) +
        '<div class="opt-to">' + Icons.get('chevronRight') + targetSelect(flow, n, 'opt:' + o.id, o.next) + '</div></div>').join('') +
        '</div><button type="button" class="btn sm" data-act="addopt">' + Icons.get('plus') + 'Adicionar opção</button></div>';
    }

    if (n.type === 'input') {
      h += '<div class="row2">' + field('Guardar em (variável)', '<input type="text" data-f="variable" value="' + esc(n.variable) + '" placeholder="ex.: documento">') +
        field('Validação', '<select data-f="validation">' + Object.keys(Flow.VALIDATIONS).map(v => '<option value="' + v + '"' + (n.validation === v ? ' selected' : '') + '>' + esc(Flow.VALIDATIONS[v]) + '</option>').join('') + '</select>') + '</div>';
      h += field('Exemplo (aparece no simulador)', '<input type="text" data-f="example" value="' + esc(n.example) + '" placeholder="ex.: 123456">');
      h += field('Se a resposta for válida', targetSelect(flow, n, 'next', n.next));
      h += field('Se a resposta for inválida', targetSelect(flow, n, 'invalid', n.invalid));
    }

    if (n.type === 'action') {
      h += field('Sistema / integração', '<input type="text" data-f="system" value="' + esc(n.system) + '" placeholder="ex.: ERP — pedidos">');
      const cases = n.cases || [];
      if (cases.length) {
        const fields = fieldOptions(flow);
        h += '<div class="fld"><span class="fld-l">Cenários do resultado</span><div class="opts">' + cases.map((c, i) =>
          '<div class="opt"><div class="opt-top"><span class="opt-n">' + (i + 1) + '</span>' +
          '<input type="text" data-cs="' + i + '" value="' + esc(c.label) + '" placeholder="Ex.: Em trânsito com ocorrência" aria-label="Nome do cenário ' + (i + 1) + '">' +
          '<button type="button" class="ico-btn" data-act="upcase" data-i="' + i + '" title="Subir"' + (i === 0 ? ' disabled' : '') + '>' + Icons.get('up') + '</button>' +
          '<button type="button" class="ico-btn" data-act="downcase" data-i="' + i + '" title="Descer"' + (i === cases.length - 1 ? ' disabled' : '') + '>' + Icons.get('down') + '</button>' +
          '<button type="button" class="ico-btn" data-act="delcase" data-i="' + i + '" title="Remover">' + Icons.get('x') + '</button></div>' +
          '<div class="rules">' + (c.when || []).map((w, j) => ruleRow(i, j, w, fields)).join('') + '</div>' +
          '<div class="btn-row" style="margin:4px 0 6px"><button type="button" class="linkbtn" data-act="addrule" data-i="' + i + '">+ condição</button></div>' +
          ((c.when || []).length ? '<div class="rule-text" data-rule-text="' + i + '">' + esc(Flow.ruleText(c, flow)) + '</div>' : '') +
          '<div class="opt-to" style="margin-top:6px">' + Icons.get('chevronRight') + targetSelect(flow, n, 'case:' + c.id, c.next) + '</div></div>').join('') +
          '</div><button type="button" class="btn sm" data-act="addcase">' + Icons.get('plus') + 'Adicionar cenário</button>' +
          '<small class="hint">O sistema consulta e o bot responde direto conforme o cenário. As condições usam os campos do dicionário de dados.</small></div>';
        h += field('Se não encontrar ou der erro', targetSelect(flow, n, 'failure', n.onFailure));
      } else {
        h += field('Em caso de sucesso', targetSelect(flow, n, 'success', n.onSuccess));
        h += field('Em caso de falha', targetSelect(flow, n, 'failure', n.onFailure));
        h += '<div class="btn-row"><button type="button" class="btn sm" data-act="addcase">' + Icons.get('plus') + 'Responder por cenários (entregue, em trânsito…)</button></div>';
      }
    }

    h += field('Pergunta em aberto', '<textarea rows="3" data-f="notes" placeholder="O que ainda precisa ser decidido neste passo?">' + esc(n.notes) + '</textarea>',
      'Aparece no mapa como "Em aberto" e na pauta de pendências.');

    h += commentsHtml(n);
    h += historyHtml(n);
    el.innerHTML = h;
    refreshKind();
  }

  function fieldOptions(flow) {
    const names = (flow.variables || []).map(v => v.name);
    Object.keys(Flow.discoverVariables(flow).used).forEach(k => { if (names.indexOf(k) < 0) names.push(k); });
    return names.sort();
  }
  function ruleRow(i, j, w, fields) {
    const list = fields.indexOf(w.field) < 0 && w.field ? fields.concat([w.field]) : fields;
    const op = Flow.RULE_OPS[w.op] || Flow.RULE_OPS.eq;
    return '<div class="rule-row">' +
      '<select data-rule="' + i + ':' + j + ':field" aria-label="Campo"><option value="">Campo…</option>' + list.map(f => '<option' + (f === w.field ? ' selected' : '') + '>' + esc(f) + '</option>').join('') + '</select>' +
      '<select data-rule="' + i + ':' + j + ':op" aria-label="Operador">' + Object.keys(Flow.RULE_OPS).map(k => '<option value="' + k + '"' + (k === w.op ? ' selected' : '') + '>' + esc(Flow.RULE_OPS[k].label) + '</option>').join('') + '</select>' +
      (op.value ? '<input type="text" class="inp" data-rule="' + i + ':' + j + ':value" value="' + esc(w.value) + '" placeholder="valor" aria-label="Valor">' : '<span></span>') +
      '<button type="button" class="ico-btn" data-act="delrule" data-i="' + i + '" data-j="' + j + '" title="Remover condição">' + Icons.get('x') + '</button></div>';
  }

  let onlyOpen = false;
  function commentsHtml(n) {
    const author = Store.author();
    const list = (n.comments || []).map((c, i) => ({ c, i })).filter(x => !onlyOpen || !x.c.resolved);
    const open = (n.comments || []).filter(c => !c.resolved).length;
    const body = t => esc(t).replace(/@([A-Za-zÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ]*(?:\s[A-ZÀ-ÖØ-Þ][\wÀ-ÖØ-öø-ÿ]*)?)/g, '<span class="mention">@$1</span>').replace(/\n/g, '<br>');
    return sec('Comentários', '<span class="count">' + open + ' em aberto</span>') +
      ((n.comments || []).length ? '<label class="cmt-filter"><input type="checkbox" data-act="onlyopen"' + (onlyOpen ? ' checked' : '') + '> Só não resolvidos</label>' : '') +
      '<div class="comments">' + list.map(({ c, i }) =>
        '<div class="cmt' + (c.resolved ? ' resolved' : '') + '"><div class="cmt-h"><b>' + esc(c.author || 'Sem nome') + '</b><small>' + esc(dateBR(c.date)) + '</small>' +
        '<button type="button" class="ico-btn" data-act="resolve" data-i="' + i + '" title="' + (c.resolved ? 'Reabrir' : 'Marcar como resolvido') + '" aria-label="' + (c.resolved ? 'Reabrir' : 'Resolver') + '">' + Icons.get(c.resolved ? 'restart' : 'check') + '</button>' +
        '<button type="button" class="ico-btn" data-act="delcomment" data-i="' + i + '" title="Remover" aria-label="Remover comentário">' + Icons.get('x') + '</button></div><div class="cmt-body">' + body(c.text) + '</div></div>').join('') +
      '</div><div class="cmt-new"><input type="text" id="cmt-author" placeholder="Seu nome" value="' + esc(author) + '" aria-label="Seu nome"><textarea id="cmt-text" rows="2" placeholder="Escreva um comentário. Use @ para marcar alguém." aria-label="Comentário"></textarea>' +
      '<button type="button" class="btn sm" data-act="addcomment">' + Icons.get('comment') + 'Comentar</button></div>';
  }

  function historyHtml(n) {
    const h = (n.history || []).slice().reverse();
    if (!h.length) return '';
    const label = x => x.action === 'review' ? (x.note || 'Revisão') : 'Status: ' + (Flow.STATUS[x.from] || x.from) + ' → ' + (Flow.STATUS[x.to] || x.to);
    return sec('Histórico', '<span class="count">' + h.length + '</span>') + '<ul class="hist">' + h.slice(0, 12).map(x =>
      '<li><b>' + esc(label(x)) + '</b><small>' + esc(x.by || 'Sem nome') + ' · ' + esc(dateBR(x.at)) + '</small></li>').join('') + '</ul>';
  }

  /* ---------- vários passos ---------- */
  function renderBulk() {
    const flow = flowNow();
    const sel = flow.nodes.filter(n => ids.indexOf(n.id) >= 0);
    let h = '<div class="ins-head"><span class="tico">' + Icons.get('layout') + '</span><div><b>' + sel.length + ' passos selecionados</b><small>Mudanças valem para todos e voltam com um único Ctrl+Z.</small></div></div>';
    h += '<div class="fld"><span class="fld-l">Status</span>' + statusSeg(sel.every(n => n.status === sel[0].status) ? sel[0].status : '', 'data-bulk-status') + '</div>';
    h += field('Linha (grupo)', groupSelect(flow, sel.every(n => n.group === sel[0].group) ? sel[0].group : '__mix', 'data-bulk-group'));
    h += '<div class="btn-row"><button type="button" class="btn sm" data-act="bulkcopy">' + Icons.get('copy') + 'Copiar (Ctrl+C)</button>' +
      '<button type="button" class="btn sm danger" data-act="bulkdelete">' + Icons.get('trash') + 'Excluir ' + sel.length + '</button></div>';
    h += sec('Selecionados') + '<div class="list">' + sel.map(n => '<div class="li">' + Icons.mark(n.status) + '<div class="grow"><b>' + esc(n.title) + '</b><small>' + esc(Flow.TYPES[n.type].label) + '</small></div></div>').join('') + '</div>';
    el.innerHTML = h;
  }

  /* ---------- fluxo (nada selecionado) ---------- */
  function renderFlow() {
    const flow = flowNow(), s = Flow.stats(flow), sc = scope();
    let h = '';
    if (sc) {
      const sf = Flow.subflow(flow, sc);
      h += '<div class="ins-head"><span class="tico">' + Icons.get('call') + '</span><div><b>Subfluxo</b><small>Bloco reutilizável. Termine os caminhos em "Voltar ao fluxo".</small></div></div>';
      h += field('Nome do subfluxo', '<input type="text" data-sff="name" value="' + esc(sf.name) + '">');
      h += field('Descrição', '<textarea rows="2" data-sff="description">' + esc(sf.description) + '</textarea>');
      h += field('Passo inicial', '<select data-sff="start">' + Flow.scopeNodes(flow, sc).map(n => '<option value="' + esc(n.id) + '"' + (sf.start === n.id ? ' selected' : '') + '>' + esc(n.title) + '</option>').join('') + '</select>');
      const callers = flow.nodes.filter(n => n.type === 'call' && n.target === sc);
      h += sec('Quem chama', '<span class="count">' + callers.length + '</span>') + (callers.length ? '<div class="list">' + callers.map(n => '<div class="li">' + Icons.mark('call') + '<div class="grow"><b>' + esc(n.title) + '</b><small>' + esc(Flow.scopeName(flow, n.subflow)) + '</small></div><button type="button" class="btn sm" data-act="goto" data-id="' + esc(n.id) + '">Ver</button></div>').join('') + '</div>' : '<div class="empty">Nenhum passo chama este subfluxo ainda.</div>');
      h += '<div class="btn-row" style="margin-top:14px"><button type="button" class="btn sm" data-act="openscope" data-sf="">' + Icons.get('back') + 'Voltar ao fluxo principal</button></div>';
      el.innerHTML = h;
      return;
    }
    h += '<div class="ins-head"><span class="tico">' + Icons.get('layout') + '</span><div><b>Ajustes do fluxo</b><small>Clique em um passo para editá-lo. Shift+clique seleciona vários.</small></div></div>';
    h += field('Nome do fluxo', '<input type="text" data-sf="name" value="' + esc(flow.meta.name) + '">');
    h += field('Descrição', '<textarea rows="2" data-sf="description">' + esc(flow.meta.description) + '</textarea>');
    h += '<div class="row2">' + field('Nome do bot', '<input type="text" data-sf="brand" value="' + esc(flow.meta.brand) + '">') +
      field('Passo inicial', '<select data-sf="startNode">' + Flow.scopeNodes(flow, null).map(n => '<option value="' + esc(n.id) + '"' + (flow.settings.startNode === n.id ? ' selected' : '') + '>' + esc(n.title) + '</option>').join('') + '</select>') + '</div>';
    h += field('Resposta para opção inválida', '<textarea rows="2" data-sf="fallbackText">' + esc(flow.settings.fallbackText) + '</textarea>', 'Enviada quando o cliente digita algo que não é uma das opções.');

    h += '<div class="statbox"><div class="bar" aria-hidden="true"><i class="b-ap" style="width:' + (s.total ? s.approved / s.total * 100 : 0) + '%"></i><i class="b-rv" style="width:' + (s.total ? s.review / s.total * 100 : 0) + '%"></i></div><div class="stat-row">' +
      '<span>' + Icons.mark('approved') + s.approved + ' aprovados</span><span>' + Icons.mark('review') + s.review + ' em validação</span><span>' + Icons.mark('todo') + s.todo + ' a definir</span></div></div>';

    h += sec('Linhas (grupos)', '<span class="count">' + flow.groups.length + '</span><button type="button" class="btn sm sec-act" data-act="addgroup">' + Icons.get('plus') + 'Linha</button>');
    h += flow.groups.length ? '<div class="list">' + flow.groups.map((g, i) => {
      const count = flow.nodes.filter(n => n.group === g.id).length;
      return '<div class="li" style="--lc:var(--' + g.color + ')"><span class="roundel' + (g.color === 'c4' ? ' dark-ink' : '') + '">' + (i + 1) + '</span>' +
        '<div class="grow"><input type="text" class="inp" data-gname="' + esc(g.id) + '" value="' + esc(g.name) + '" aria-label="Nome da linha ' + (i + 1) + '"><div class="swatches" style="margin-top:6px">' +
        Flow.GROUP_COLORS.map(c => '<button type="button" class="sw' + (c === g.color ? ' on' : '') + '" style="--lc:var(--' + c + ')" data-act="gcolor" data-g="' + esc(g.id) + '" data-c="' + c + '" aria-label="Cor ' + c + '"></button>').join('') +
        '</div><small>' + count + (count === 1 ? ' passo' : ' passos') + '</small></div>' +
        '<button type="button" class="ico-btn" data-act="gup" data-g="' + esc(g.id) + '" title="Subir"' + (i === 0 ? ' disabled' : '') + '>' + Icons.get('up') + '</button>' +
        '<button type="button" class="ico-btn" data-act="gdel" data-g="' + esc(g.id) + '" title="Excluir a linha (os passos ficam)">' + Icons.get('trash') + '</button></div>';
    }).join('') + '</div>' : '<div class="empty">Crie linhas (Entrada, Cliente, Problema…) para separar o mapa em faixas coloridas.</div>';

    h += sec('Subfluxos', '<span class="count">' + flow.subflows.length + '</span><button type="button" class="btn sm sec-act" data-act="newsubflow">' + Icons.get('plus') + 'Subfluxo</button>');
    h += flow.subflows.length ? '<div class="list">' + flow.subflows.map(sf => {
      const callers = flow.nodes.filter(n => n.type === 'call' && n.target === sf.id).length, count = flow.nodes.filter(n => n.subflow === sf.id).length;
      return '<div class="li">' + Icons.mark('call') + '<div class="grow"><b>' + esc(sf.name) + '</b><small>' + count + ' passos · chamado por ' + callers + '</small></div>' +
        '<button type="button" class="btn sm" data-act="openscope" data-sf="' + esc(sf.id) + '">' + Icons.get('enter') + 'Abrir</button>' +
        '<button type="button" class="ico-btn" data-act="sfdel" data-sf="' + esc(sf.id) + '" title="Excluir o subfluxo">' + Icons.get('trash') + '</button></div>';
    }).join('') + '</div>' : '<div class="empty">Blocos usados em vários pontos (falar com a central, validar código) viram subfluxos chamados por um passo "Chamar subfluxo".</div>';

    h += sec('Atalhos') + '<div class="tips"><ul>' +
      '<li><kbd>Duplo clique</kbd> no mapa cria um passo · <kbd>Tab</kbd> cria o próximo ligado</li>' +
      '<li>Arraste a bolinha de uma saída até outro passo para ligar</li>' +
      '<li><kbd>Shift</kbd>+clique ou <kbd>Shift</kbd>+arrastar seleciona vários</li>' +
      '<li><kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>Ctrl</kbd>+<kbd>V</kbd> copia e cola, inclusive entre fluxos</li>' +
      '<li><kbd>/</kbd> busca · <kbd>F</kbd> enquadra · <kbd>Del</kbd> exclui · <kbd>Ctrl</kbd>+<kbd>Z</kbd> desfaz</li></ul></div>';
    el.innerHTML = h;
  }

  /* ---------- contadores e indicadores ---------- */
  function limitFor(key, n) {
    const L = Meta.LIMITS;
    if (key === 'text') return n.type === 'menu' ? L.interactiveBody : L.textBody;
    if (key === 'header') return L.header;
    if (key === 'footer') return L.footer;
    if (key === 'listButton') return L.listButtonLabel;
    if (key.indexOf('optlabel:') === 0) return Meta.menuKind(n) === 'buttons' ? L.buttonTitle : L.listRowTitle;
    if (key.indexOf('optdesc:') === 0) return L.listRowDescription;
    return null;
  }
  function valueFor(key, n) {
    if (key.indexOf('optlabel:') === 0) return (n.options[+key.split(':')[1]] || {}).label;
    if (key.indexOf('optdesc:') === 0) return (n.options[+key.split(':')[1]] || {}).description;
    return n[key];
  }
  function updateCounters() {
    const n = node();
    if (!n) return;
    el.querySelectorAll('[data-counter]').forEach(c => {
      const key = c.dataset.counter, max = limitFor(key, n);
      if (max == null) return;
      const len = Meta.chars(valueFor(key, n));
      c.textContent = len + '/' + max;
      c.classList.toggle('over', len > max);
    });
  }
  function refreshKind() {
    const n = node(), k = el.querySelector('[data-kind]');
    if (!n || !k) return;
    const kind = Meta.menuKind(n);
    const text = {
      buttons: 'Vai como <b>botões de resposta</b> (até ' + Meta.LIMITS.buttons + ' opções, rótulo até ' + Meta.LIMITS.buttonTitle + ' caracteres).',
      list: 'Vai como <b>lista</b> (até ' + Meta.LIMITS.listRows + ' opções, título até ' + Meta.LIMITS.listRowTitle + ' caracteres).',
      toomany: 'Mais de ' + Meta.LIMITS.listRows + ' opções: o WhatsApp não aceita. Divida em um submenu.',
      empty: 'Adicione ao menos uma opção.'
    }[kind];
    k.className = 'kind' + (kind === 'toomany' || kind === 'empty' ? ' bad' : '');
    k.innerHTML = text;
  }

  /* ---------- eventos ---------- */
  function setPath(obj, path, value) {
    const parts = path.split('.');
    let o = obj;
    while (parts.length > 1) { const k = parts.shift(); o[k] = o[k] || {}; o = o[k]; }
    o[parts[0]] = value;
  }

  function onInput(e) {
    const t = e.target, n = node(), f = flowNow();
    if (t.dataset.f && n && t.tagName !== 'SELECT' && t.type !== 'checkbox') {
      const k = t.dataset.f;
      Store.update(() => setPath(n, k, t.value), { source: 'inspector', coalesce: 'f:' + n.id + ':' + k });
      updateCounters(); refreshKind();
    } else if (t.dataset.opt !== undefined && n) {
      const i = +t.dataset.opt, of = t.dataset.of;
      Store.update(() => { n.options[i][of] = t.value; }, { source: 'inspector', coalesce: 'o:' + n.id + ':' + i + ':' + of });
      updateCounters(); refreshKind();
    } else if (t.dataset.cs !== undefined && n) {
      const i = +t.dataset.cs;
      Store.update(() => { n.cases[i].label = t.value; }, { source: 'inspector', coalesce: 'c:' + n.id + ':' + i });
      updateRuleText(n, i);
    } else if (t.dataset.rule && n && t.tagName === 'INPUT') {
      const [i, j, k] = t.dataset.rule.split(':');
      Store.update(() => { n.cases[+i].when[+j][k] = t.value; }, { source: 'inspector', coalesce: 'r:' + n.id + ':' + t.dataset.rule });
      updateRuleText(n, +i);
    } else if (t.dataset.sf) {
      const key = t.dataset.sf;
      if (key === 'startNode') return;
      Store.update(() => { if (key === 'fallbackText') f.settings.fallbackText = t.value; else f.meta[key] = t.value; }, { source: 'inspector', coalesce: 'sf:' + key });
    } else if (t.dataset.sff && t.tagName !== 'SELECT') {
      const sf = Flow.subflow(f, scope()), key = t.dataset.sff;
      Store.update(() => { sf[key] = t.value; }, { source: 'inspector', coalesce: 'sff:' + sf.id + ':' + key });
    } else if (t.dataset.gname) {
      const g = f.groups.find(x => x.id === t.dataset.gname);
      Store.update(() => { g.name = t.value; }, { source: 'inspector', coalesce: 'g:' + g.id });
    } else if (t.id === 'cmt-text') {
      mentionAssist(t);
    }
  }

  function updateRuleText(n, i) {
    const box = el.querySelector('[data-rule-text="' + i + '"]');
    if (box) box.textContent = Flow.ruleText(n.cases[i], flowNow());
  }

  function onChange(e) {
    const t = e.target, n = node(), f = flowNow();
    if (t.dataset.link && n) {
      Store.update(() => Flow.setLink(n, t.dataset.link, t.value || null), { source: 'inspector' });
    } else if (t.dataset.f && n && (t.tagName === 'SELECT' || t.type === 'checkbox')) {
      Store.update(() => setPath(n, t.dataset.f, t.type === 'checkbox' ? t.checked : (t.value || null)), { source: 'inspector' });
      render();
    } else if (t.dataset.rule && n && t.tagName === 'SELECT') {
      const [i, j, k] = t.dataset.rule.split(':');
      Store.update(() => { n.cases[+i].when[+j][k] = t.value; }, { source: 'inspector' });
      render();
    } else if (t.hasAttribute('data-group-select') && n) {
      Store.update(() => { n.group = t.value || null; }, { source: 'inspector' });
    } else if (t.hasAttribute('data-bulk-group')) {
      if (t.value === '__mix') return;
      root.App.bulk('group', t.value || null);
    } else if (t.dataset.sf === 'startNode') {
      Store.update(() => { f.settings.startNode = t.value; }, { source: 'inspector' });
    } else if (t.dataset.sff === 'start') {
      Store.update(() => { Flow.subflow(f, scope()).start = t.value; }, { source: 'inspector' });
    } else if (t.id === 'cmt-author') {
      Store.setAuthor(t.value);
    } else if (t.dataset.act === 'onlyopen') {
      onlyOpen = t.checked; render();
    }
  }

  function onKey(e) {
    const t = e.target;
    if (t.id === 'cmt-text') {
      const list = el.querySelector('.mention-list');
      if (list && (e.key === 'Enter' || e.key === 'Tab')) {
        const on = list.querySelector('button.on') || list.querySelector('button');
        if (on) { e.preventDefault(); insertMention(t, on.dataset.name); }
      } else if (list && e.key === 'Escape') { list.remove(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); el.querySelector('[data-act="addcomment"]').click(); }
    }
  }

  /* @menção: sugere nomes já usados em comentários e no histórico */
  function people() {
    const set = new Set();
    flowNow().nodes.forEach(n => { (n.comments || []).forEach(c => c.author && set.add(c.author)); (n.history || []).forEach(h => h.by && set.add(h.by)); });
    if (Store.author()) set.add(Store.author());
    return Array.from(set).sort();
  }
  function mentionAssist(t) {
    const before = t.value.slice(0, t.selectionStart), m = before.match(/@([\wÀ-ÖØ-öø-ÿ]*)$/);
    const old = el.querySelector('.mention-list');
    if (old) old.remove();
    if (!m) return;
    const q = Flow.fold(m[1]);
    const names = people().filter(p => Flow.fold(p).indexOf(q) === 0).slice(0, 6);
    if (!names.length) return;
    const list = document.createElement('div');
    list.className = 'mention-list';
    list.innerHTML = names.map((p, i) => '<button type="button" data-name="' + esc(p) + '"' + (i === 0 ? ' class="on"' : '') + '>@' + esc(p) + '</button>').join('');
    list.addEventListener('mousedown', ev => { const b = ev.target.closest('button'); if (b) { ev.preventDefault(); insertMention(t, b.dataset.name); } });
    t.parentNode.appendChild(list);
  }
  function insertMention(t, name) {
    const pos = t.selectionStart, before = t.value.slice(0, pos).replace(/@[\wÀ-ÖØ-öø-ÿ]*$/, '@' + name + ' ');
    t.value = before + t.value.slice(pos);
    t.selectionStart = t.selectionEnd = before.length;
    const list = el.querySelector('.mention-list');
    if (list) list.remove();
    t.focus();
  }

  function onClick(e) {
    const flow = flowNow(), n = node();
    const st = e.target.closest('[data-status]');
    if (st && n) {
      Store.update(() => { Flow.setStatus(n, st.dataset.status, Store.author()); }, { source: 'inspector' });
      render();
      return;
    }
    const bs = e.target.closest('[data-bulk-status]');
    if (bs) { root.App.bulk('status', bs.dataset.bulkStatus); return; }
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    const act = b.dataset.act, i = +b.dataset.i;
    if (act === 'setstart' && n) { Store.update(f => { Flow.setScopeStart(f, n.subflow, n.id); }, { source: 'inspector' }); render(); }
    else if (act === 'next' && n) root.App.createNext(n.id);
    else if (act === 'duplicate' && n) {
      let copy;
      Store.update(f => { copy = Flow.duplicateNode(f, n.id); }, { source: 'inspector' });
      if (copy) root.App.selectNode(copy.id);
    }
    else if (act === 'delete' && n) root.App.deleteNodes([n.id]);
    else if (act === 'bulkdelete') root.App.deleteNodes(ids.slice());
    else if (act === 'bulkcopy') root.App.copy();
    else if (act === 'addopt' && n) {
      Store.update(() => { const label = 'Opção ' + (n.options.length + 1); n.options.push({ id: Flow.uniqueOptionId(n, label), label, description: '', next: null }); }, { source: 'inspector' });
      render();
    }
    else if (act === 'delopt' && n) { Store.update(() => { n.options.splice(i, 1); }, { source: 'inspector' }); render(); }
    else if ((act === 'upopt' || act === 'downopt') && n) {
      const j = act === 'upopt' ? i - 1 : i + 1;
      if (j >= 0 && j < n.options.length) { Store.update(() => { const t = n.options[i]; n.options[i] = n.options[j]; n.options[j] = t; }, { source: 'inspector' }); render(); }
    }
    else if (act === 'addcase' && n) {
      Store.update(() => {
        if (!n.cases) n.cases = [];
        if (!n.cases.length) { n.cases.push({ id: Flow.uniqueCaseId(n, 'Cenário 1'), label: 'Cenário 1', next: n.onSuccess || null, when: [] }); n.onSuccess = null; }
        const label = 'Cenário ' + (n.cases.length + 1);
        n.cases.push({ id: Flow.uniqueCaseId(n, label), label, next: null, when: [] });
      }, { source: 'inspector' });
      render();
    }
    else if (act === 'delcase' && n) { Store.update(() => { n.cases.splice(i, 1); }, { source: 'inspector' }); render(); }
    else if ((act === 'upcase' || act === 'downcase') && n) {
      const j = act === 'upcase' ? i - 1 : i + 1;
      if (j >= 0 && j < n.cases.length) { Store.update(() => { const t = n.cases[i]; n.cases[i] = n.cases[j]; n.cases[j] = t; }, { source: 'inspector' }); render(); }
    }
    else if (act === 'addrule' && n) { Store.update(() => { (n.cases[i].when = n.cases[i].when || []).push({ field: '', op: 'filled', value: '' }); }, { source: 'inspector' }); render(); }
    else if (act === 'delrule' && n) { Store.update(() => { n.cases[i].when.splice(+b.dataset.j, 1); }, { source: 'inspector' }); render(); }
    else if (act === 'addcomment' && n) {
      const text = el.querySelector('#cmt-text').value.trim(), author = el.querySelector('#cmt-author').value.trim();
      if (!text) { el.querySelector('#cmt-text').focus(); return; }
      Store.setAuthor(author);
      Store.update(() => { n.comments.push({ author, text, date: new Date().toISOString(), resolved: false, mentions: Flow.mentions(text) }); }, { source: 'inspector' });
      render();
    }
    else if (act === 'resolve' && n) { Store.update(() => { n.comments[i].resolved = !n.comments[i].resolved; }, { source: 'inspector' }); render(); }
    else if (act === 'delcomment' && n) { Store.update(() => { n.comments.splice(i, 1); }, { source: 'inspector' }); render(); }
    else if (act === 'openscope') root.App.openScope(b.dataset.sf || null);
    else if (act === 'goto') root.App.goToNode(b.dataset.id);
    else if (act === 'newsubflow') root.App.newSubflow(n && n.type === 'call' ? n.id : null);
    else if (act === 'sfdel') {
      const sf = Flow.subflow(flow, b.dataset.sf);
      if (sf && confirm('Excluir o subfluxo "' + sf.name + '" e os passos dele? Dá para desfazer com Ctrl+Z.')) Store.update(f => Flow.removeSubflow(f, sf.id), { source: 'inspector' });
    }
    else if (act === 'addgroup') {
      Store.update(f => {
        const used = new Set(f.groups.map(g => g.color));
        const color = Flow.GROUP_COLORS.find(c => !used.has(c)) || Flow.GROUP_COLORS[f.groups.length % 8];
        f.groups.push({ id: Flow.uid(new Set(f.groups.map(g => g.id)), 'g'), name: 'Linha ' + (f.groups.length + 1), color, collapsed: false });
      }, { source: 'inspector' });
      render();
      const last = el.querySelectorAll('[data-gname]'); if (last.length) { last[last.length - 1].focus(); last[last.length - 1].select(); }
    }
    else if (act === 'gcolor') { Store.update(f => { f.groups.find(g => g.id === b.dataset.g).color = b.dataset.c; }, { source: 'inspector' }); render(); }
    else if (act === 'gup') {
      Store.update(f => { const k = f.groups.findIndex(g => g.id === b.dataset.g); if (k > 0) { const t = f.groups[k - 1]; f.groups[k - 1] = f.groups[k]; f.groups[k] = t; } }, { source: 'inspector' });
      render();
    }
    else if (act === 'gdel') { Store.update(f => Flow.removeGroup(f, b.dataset.g), { source: 'inspector' }); render(); }
  }

  root.Inspector = { init, show, render, current };
})(window);

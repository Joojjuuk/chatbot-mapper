/* inspector.js — painel "Editar": formulário do nó selecionado ou ajustes gerais do fluxo. */
(function (root) {
  'use strict';

  const AUTHOR_KEY = 'chatbot-mapper:author';
  let el = null;
  let currentId = null;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const node = () => { const f = Store.get(); return f && currentId ? f.nodes.find(n => n.id === currentId) : null; };

  function init(container) {
    el = container;
    el.addEventListener('input', onInput);
    el.addEventListener('change', onChange);
    el.addEventListener('click', onClick);
  }

  function show(id) { currentId = id; render(); }
  function current() { return currentId; }

  function render() {
    if (!el || !Store.get()) return;
    if (!node()) { currentId = null; renderFlow(); } else renderNode();
    updateCounters();
  }

  /* ---------- campos reutilizáveis ---------- */
  function targetSelect(flow, n, port, value) {
    const opts = ['<option value="">— sem destino —</option>'].concat(flow.nodes.filter(x => x.id !== n.id).map(x =>
      '<option value="' + esc(x.id) + '"' + (x.id === value ? ' selected' : '') + '>' + esc(x.title) + ' · ' + esc(Flow.TYPES[x.type].label) + '</option>'));
    return '<select data-link="' + esc(port) + '">' + opts.join('') + '</select>';
  }

  function field(label, inner, hint) {
    return '<label class="fld"><span class="fld-l">' + label + '</span>' + inner + (hint ? '<small class="hint">' + hint + '</small>' : '') + '</label>';
  }

  const counter = key => '<span class="counter" data-counter="' + esc(key) + '"></span>';

  function textLabel(type) {
    return { message: 'Mensagem do bot', menu: 'Texto do menu', input: 'Pergunta ao cliente', action: 'O que o sistema faz', handoff: 'Mensagem antes de transferir (opcional)', end: 'Mensagem final (opcional)', call: 'Observação', return: 'Observação' }[type];
  }

  /* ---------- nó ---------- */
  function renderNode() {
    const flow = Store.get(), n = node();
    const issues = Flow.lint(flow, Meta).filter(i => i.nodeId === n.id && i.severity !== 'info');
    let h = '<div class="ins-head"><span class="n-ico t-' + n.type + '">' + Graph.ICONS[n.type] + '</span><div><b>' + esc(Flow.TYPES[n.type].label) + '</b><small>' + esc(Flow.TYPES[n.type].hint) + '</small></div></div>';
    h += '<div class="ins-actions">' +
      (flow.settings.startNode === n.id ? '<span class="pill">É o início do fluxo</span>' : '<button type="button" class="btn sm" data-act="setstart">Definir como início</button>') +
      '<button type="button" class="btn sm" data-act="duplicate">Duplicar</button>' +
      '<button type="button" class="btn sm danger" data-act="delete">Excluir</button></div>';
    if (issues.length) {
      h += '<ul class="issues">' + issues.map(i => '<li class="' + i.severity + '">' + (i.severity === 'error' ? '⛔' : '⚠') + ' ' + esc(i.message) + '</li>').join('') + '</ul>';
    }
    h += field('Título', '<input type="text" data-f="title" value="' + esc(n.title) + '">');
    h += '<div class="fld"><span class="fld-l">Status</span><div class="seg">' + Object.keys(Flow.STATUS).map(s =>
      '<button type="button" class="s-' + s + (n.status === s ? ' on' : '') + '" data-status="' + s + '">' + esc(Flow.STATUS[s]) + '</button>').join('') + '</div></div>';

    h += field(textLabel(n.type) + ' ' + (n.type === 'action' ? '' : counter('text')), '<textarea rows="4" data-f="text">' + esc(n.text) + '</textarea>',
      n.type === 'action' ? '' : 'Use {{variavel}} para inserir dados do cliente, *negrito* e _itálico_.');

    if (n.type === 'message') {
      h += field('Depois, segue para', targetSelect(flow, n, 'next', n.next));
      const t = n.template || {};
      h += '<label class="chk"><input type="checkbox" data-f="template.enabled"' + (t.enabled ? ' checked' : '') + '> Enviar como <b>template</b> (fora da janela de 24 h)</label>';
      if (t.enabled) {
        h += '<div class="row2">' + field('Nome do template', '<input type="text" data-f="template.name" value="' + esc(t.name) + '" placeholder="ex.: aviso_pedido">') +
          field('Categoria', '<select data-f="template.category">' + ['utility', 'marketing', 'authentication'].map(c => '<option value="' + c + '"' + (t.category === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>') + '</div>';
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
        '<input type="text" data-opt="' + i + '" data-of="label" value="' + esc(o.label) + '" placeholder="Rótulo">' + counter('optlabel:' + i) +
        '<button type="button" class="ico-btn" data-act="upopt" data-i="' + i + '" title="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="ico-btn" data-act="downopt" data-i="' + i + '" title="Descer"' + (i === n.options.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" class="ico-btn" data-act="delopt" data-i="' + i + '" title="Remover">×</button></div>' +
        '<input type="text" class="opt-desc" data-opt="' + i + '" data-of="description" value="' + esc(o.description) + '" placeholder="Descrição (só na lista, opcional)">' + counter('optdesc:' + i) +
        '<div class="opt-to">→ ' + targetSelect(flow, n, 'opt:' + o.id, o.next) + '</div></div>').join('') +
        '</div><button type="button" class="btn sm" data-act="addopt">+ Adicionar opção</button></div>';
    }

    if (n.type === 'input') {
      h += '<div class="row2">' + field('Guardar em (variável)', '<input type="text" data-f="variable" value="' + esc(n.variable) + '" placeholder="ex.: documento">') +
        field('Validação', '<select data-f="validation">' + Object.keys(Flow.VALIDATIONS).map(v => '<option value="' + v + '"' + (n.validation === v ? ' selected' : '') + '>' + esc(Flow.VALIDATIONS[v]) + '</option>').join('') + '</select>') + '</div>';
      h += field('Exemplo (aparece no simulador)', '<input type="text" data-f="example" value="' + esc(n.example) + '" placeholder="ex.: 123456">');
      h += field('Se a resposta for válida', targetSelect(flow, n, 'next', n.next));
      h += field('Se a resposta for inválida', targetSelect(flow, n, 'invalid', n.invalid));
    }

    if (n.type === 'action') {
      h += field('Sistema / integração', '<input type="text" data-f="system" value="' + esc(n.system) + '" placeholder="ex.: Cadastro de clientes">');
      const cases = n.cases || [];
      if (cases.length) {
        h += '<div class="fld"><span class="fld-l">Cenários do resultado</span><div class="opts">' + cases.map((c, i) =>
          '<div class="opt"><div class="opt-top"><span class="opt-n">' + (i + 1) + '</span>' +
          '<input type="text" data-cs="' + i + '" value="' + esc(c.label) + '" placeholder="Ex.: Em trânsito com ocorrência">' +
          '<button type="button" class="ico-btn" data-act="upcase" data-i="' + i + '" title="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" class="ico-btn" data-act="downcase" data-i="' + i + '" title="Descer"' + (i === cases.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button type="button" class="ico-btn" data-act="delcase" data-i="' + i + '" title="Remover">×</button></div>' +
          '<div class="opt-to">→ ' + targetSelect(flow, n, 'case:' + c.id, c.next) + '</div></div>').join('') +
          '</div><button type="button" class="btn sm" data-act="addcase">+ Adicionar cenário</button>' +
          '<small class="hint">O sistema consulta e o bot responde direto, conforme o cenário (ex.: entregue, em trânsito, atrasada).</small></div>';
        h += field('Se não encontrar ou der erro', targetSelect(flow, n, 'failure', n.onFailure));
      } else {
        h += field('Em caso de sucesso', targetSelect(flow, n, 'success', n.onSuccess));
        h += field('Em caso de falha', targetSelect(flow, n, 'failure', n.onFailure));
        h += '<button type="button" class="btn sm" data-act="addcase" style="margin:-4px 0 14px">Resposta por cenários (status da nota, etc.)</button>';
      }
    }

    h += field('Pergunta em aberto / observações', '<textarea rows="3" data-f="notes" placeholder="O que ainda precisa ser decidido neste passo?">' + esc(n.notes) + '</textarea>',
      'Aparece no mapa como "? aberta" e no documento de validação.');

    h += '<div class="fld"><span class="fld-l">Comentários</span>' + commentsHtml(n) + '</div>';
    el.innerHTML = h;
    refreshKind();
  }

  function commentsHtml(n) {
    const author = localStorage.getItem(AUTHOR_KEY) || '';
    return '<div class="comments">' + (n.comments || []).map((c, i) =>
      '<div class="cmt"><div class="cmt-h"><b>' + esc(c.author || 'Sem nome') + '</b><small>' + esc(new Date(c.date).toLocaleString('pt-BR')) + '</small>' +
      '<button type="button" class="ico-btn" data-act="delcomment" data-i="' + i + '" title="Remover">×</button></div><div>' + esc(c.text).replace(/\n/g, '<br>') + '</div></div>').join('') +
      '</div><div class="cmt-new"><input type="text" id="cmt-author" placeholder="Seu nome" value="' + esc(author) + '"><textarea id="cmt-text" rows="2" placeholder="Escreva um comentário…"></textarea>' +
      '<button type="button" class="btn sm" data-act="addcomment">Comentar</button></div>';
  }

  /* ---------- fluxo (nada selecionado) ---------- */
  function renderFlow() {
    const flow = Store.get(), s = Flow.stats(flow);
    let h = '<div class="ins-head"><span class="n-ico t-flow">' + Graph.ICONS.message + '</span><div><b>Ajustes do fluxo</b><small>Clique em um nó para editá-lo.</small></div></div>';
    h += field('Nome do fluxo', '<input type="text" data-sf="name" value="' + esc(flow.meta.name) + '">');
    h += field('Descrição', '<textarea rows="2" data-sf="description">' + esc(flow.meta.description) + '</textarea>');
    h += field('Nome do bot (aparece no simulador)', '<input type="text" data-sf="brand" value="' + esc(flow.meta.brand) + '">');
    h += field('Resposta para opção inválida', '<textarea rows="2" data-sf="fallbackText">' + esc(flow.settings.fallbackText) + '</textarea>', 'Enviada quando o cliente digita algo que não é uma das opções.');
    h += field('Nó inicial', '<select data-sf="startNode">' + flow.nodes.map(n => '<option value="' + esc(n.id) + '"' + (flow.settings.startNode === n.id ? ' selected' : '') + '>' + esc(n.title) + '</option>').join('') + '</select>');
    h += '<div class="statbox"><div class="bar"><i style="width:' + s.progress + '%"></i></div><div class="stat-row">' +
      '<span><i class="dot s-approved"></i>' + s.approved + ' aprovados</span><span><i class="dot s-review"></i>' + s.review + ' em validação</span><span><i class="dot s-todo"></i>' + s.todo + ' a definir</span></div></div>';
    h += '<div class="tips"><b>Atalhos</b><ul>' +
      '<li><kbd>Duplo clique</kbd> no mapa cria um nó</li>' +
      '<li>Arraste a bolinha de uma saída até outro nó para ligar</li>' +
      '<li>Solte a ligação no vazio para criar o próximo nó</li>' +
      '<li><kbd>Del</kbd> exclui o nó · <kbd>Ctrl</kbd>+<kbd>Z</kbd> desfaz</li>' +
      '<li>Roda do mouse dá zoom · arraste o fundo para mover</li></ul></div>';
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
      buttons: 'Será enviado como <b>botões de resposta</b> (até ' + Meta.LIMITS.buttons + ' opções, rótulo até ' + Meta.LIMITS.buttonTitle + ' caracteres).',
      list: 'Será enviado como <b>lista</b> (até ' + Meta.LIMITS.listRows + ' opções, título até ' + Meta.LIMITS.listRowTitle + ' caracteres).',
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
    const t = e.target;
    const n = node();
    if (t.dataset.f && n) {
      const f = t.dataset.f;
      Store.update(() => setPath(n, f, t.type === 'checkbox' ? t.checked : t.value), { source: 'inspector', coalesce: 'f:' + n.id + ':' + f });
      updateCounters(); refreshKind();
    } else if (t.dataset.opt !== undefined && n) {
      const i = +t.dataset.opt, of = t.dataset.of;
      Store.update(() => { n.options[i][of] = t.value; }, { source: 'inspector', coalesce: 'o:' + n.id + ':' + i + ':' + of });
      updateCounters(); refreshKind();
    } else if (t.dataset.cs !== undefined && n) {
      const i = +t.dataset.cs;
      Store.update(() => { n.cases[i].label = t.value; }, { source: 'inspector', coalesce: 'c:' + n.id + ':' + i });
    } else if (t.dataset.sf) {
      const f = Store.get(), key = t.dataset.sf;
      if (key === 'startNode') return;
      Store.update(() => {
        if (key === 'fallbackText') f.settings.fallbackText = t.value; else f.meta[key] = t.value;
      }, { source: 'inspector', coalesce: 'sf:' + key });
    }
  }

  function onChange(e) {
    const t = e.target;
    const n = node();
    if (t.dataset.link && n) {
      Store.update(() => Flow.setLink(n, t.dataset.link, t.value || null), { source: 'inspector' });
    } else if (t.dataset.f && n && (t.tagName === 'SELECT' || t.type === 'checkbox')) {
      render();
    } else if (t.dataset.sf === 'startNode') {
      Store.update(f => { f.settings.startNode = t.value; }, { source: 'inspector' });
    } else if (t.id === 'cmt-author') {
      localStorage.setItem(AUTHOR_KEY, t.value.trim());
    }
  }

  function onClick(e) {
    const flow = Store.get(), n = node();
    const st = e.target.closest('[data-status]');
    if (st && n) {
      Store.update(() => { n.status = st.dataset.status; }, { source: 'inspector' });
      render();
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, i = +b.dataset.i;
    if (act === 'setstart' && n) { Store.update(f => { f.settings.startNode = n.id; }, { source: 'inspector' }); render(); }
    else if (act === 'duplicate' && n) {
      let copy;
      Store.update(f => { copy = Flow.duplicateNode(f, n.id); }, { source: 'inspector' });
      if (copy && root.App) root.App.selectNode(copy.id);
    }
    else if (act === 'delete' && n) { if (root.App) root.App.deleteNode(n.id); }
    else if (act === 'addopt' && n) {
      Store.update(() => {
        const label = 'Opção ' + (n.options.length + 1);
        n.options.push({ id: Flow.uniqueOptionId(n, label), label, description: '', next: null });
      }, { source: 'inspector' });
      render();
    }
    else if (act === 'delopt' && n) { Store.update(() => { n.options.splice(i, 1); }, { source: 'inspector' }); render(); }
    else if ((act === 'upopt' || act === 'downopt') && n) {
      const j = act === 'upopt' ? i - 1 : i + 1;
      if (j >= 0 && j < n.options.length) {
        Store.update(() => { const t = n.options[i]; n.options[i] = n.options[j]; n.options[j] = t; }, { source: 'inspector' });
        render();
      }
    }
    else if (act === 'addcase' && n) {
      Store.update(() => {
        if (!n.cases) n.cases = [];
        if (!n.cases.length) { n.cases.push({ id: Flow.uniqueCaseId(n, 'Cenário 1'), label: 'Cenário 1', next: n.onSuccess || null }); n.onSuccess = null; }
        const label = 'Cenário ' + (n.cases.length + 1);
        n.cases.push({ id: Flow.uniqueCaseId(n, label), label, next: null });
      }, { source: 'inspector' });
      render();
    }
    else if (act === 'delcase' && n) { Store.update(() => { n.cases.splice(i, 1); }, { source: 'inspector' }); render(); }
    else if ((act === 'upcase' || act === 'downcase') && n) {
      const j = act === 'upcase' ? i - 1 : i + 1;
      if (j >= 0 && j < n.cases.length) {
        Store.update(() => { const t = n.cases[i]; n.cases[i] = n.cases[j]; n.cases[j] = t; }, { source: 'inspector' });
        render();
      }
    }
    else if (act === 'addcomment' && n) {
      const text = el.querySelector('#cmt-text').value.trim();
      const author = el.querySelector('#cmt-author').value.trim();
      if (!text) return;
      localStorage.setItem(AUTHOR_KEY, author);
      Store.update(() => { n.comments.push({ author, text, date: new Date().toISOString() }); }, { source: 'inspector' });
      render();
    }
    else if (act === 'delcomment' && n) { Store.update(() => { n.comments.splice(i, 1); }, { source: 'inspector' }); render(); }
  }

  root.Inspector = { init, show, render, current };
})(window);

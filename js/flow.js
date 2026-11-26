/* flow.js — modelo do fluxo: tipos, ligações entre nós, layout automático e verificação.
   Sem dependências. Funciona no navegador (window.Flow) e no Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Flow = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCHEMA = 'chatbot-mapper/1';

  const TYPES = {
    message: { label: 'Mensagem', hint: 'O bot envia um texto e segue adiante.' },
    menu: { label: 'Menu de opções', hint: 'O cliente escolhe uma opção (botões ou lista).' },
    input: { label: 'Pergunta ao cliente', hint: 'O bot pede um dado e guarda a resposta.' },
    action: { label: 'Ação do sistema', hint: 'Consulta ou grava algo em um sistema.' },
    handoff: { label: 'Atendente humano', hint: 'Transfere a conversa para uma pessoa.' },
    end: { label: 'Encerramento', hint: 'Finaliza a conversa.' }
  };

  const STATUS = {
    todo: 'A definir',
    review: 'Em validação',
    approved: 'Aprovado'
  };

  const VALIDATIONS = {
    none: 'Qualquer texto',
    number: 'Somente números',
    cnpj: 'CNPJ',
    cpf: 'CPF',
    email: 'E-mail'
  };

  function uid(existing) {
    let id;
    do { id = 'n' + Math.random().toString(36).slice(2, 7); } while (existing && existing.has(id));
    return id;
  }

  function slug(text) {
    return String(text || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      .slice(0, 30) || 'opcao';
  }

  function uniqueOptionId(node, label) {
    const used = new Set((node.options || []).map(o => o.id));
    const base = slug(label);
    let id = base, i = 2;
    while (used.has(id)) id = base + '_' + i++;
    return id;
  }

  function uniqueCaseId(node, label) {
    const used = new Set((node.cases || []).map(o => o.id));
    const base = slug(label);
    let id = base, i = 2;
    while (used.has(id)) id = base + '_' + i++;
    return id;
  }

  function newNode(type, x, y, flow) {
    const ids = flow ? new Set(flow.nodes.map(n => n.id)) : null;
    const n = {
      id: uid(ids), type, title: TYPES[type].label, status: 'todo',
      x: Math.round(x || 0), y: Math.round(y || 0), text: '', notes: '', comments: []
    };
    if (type === 'message') { n.next = null; n.template = { enabled: false, name: '', category: 'utility' }; }
    if (type === 'menu') {
      n.header = ''; n.footer = ''; n.listButton = 'Ver opções'; n.menuStyle = 'auto';
      n.options = [{ id: 'opcao_1', label: 'Opção 1', description: '', next: null }];
    }
    if (type === 'input') { n.variable = ''; n.validation = 'none'; n.example = ''; n.next = null; n.invalid = null; }
    if (type === 'action') { n.system = ''; n.cases = []; n.onSuccess = null; n.onFailure = null; }
    return n;
  }

  function newFlow(name) {
    const start = newNode('message', 0, 0);
    start.id = 'inicio'; start.title = 'Boas-vindas'; start.text = 'Olá! Como podemos te ajudar?';
    const now = new Date().toISOString();
    return {
      schema: SCHEMA,
      meta: { name: name || 'Novo fluxo', description: '', brand: 'Minha Empresa', createdAt: now, updatedAt: now },
      settings: { startNode: start.id, fallbackText: 'Não entendi. Por favor, escolha uma das opções.' },
      nodes: [start]
    };
  }

  /* Garante que um fluxo importado tenha todos os campos esperados. */
  function normalize(flow) {
    if (!flow || typeof flow !== 'object' || !Array.isArray(flow.nodes)) throw new Error('Arquivo não parece um fluxo do Chatbot Mapper.');
    const now = new Date().toISOString();
    flow.schema = SCHEMA;
    flow.meta = Object.assign({ name: 'Fluxo importado', description: '', brand: 'Minha Empresa', createdAt: now, updatedAt: now }, flow.meta || {});
    flow.settings = Object.assign({ startNode: null, fallbackText: 'Não entendi. Por favor, escolha uma das opções.' }, flow.settings || {});
    const seen = new Set();
    flow.nodes.forEach((n, i) => {
      if (!TYPES[n.type]) throw new Error('Tipo de nó desconhecido: ' + n.type);
      if (!n.id || seen.has(n.id)) n.id = uid(seen);
      seen.add(n.id);
      const hasPos = typeof n.x === 'number' && typeof n.y === 'number';
      const d = newNode(n.type, 0, 0);
      Object.keys(d).forEach(k => { if (n[k] === undefined) n[k] = d[k]; });
      if (!hasPos) { n.x = i * 40; n.y = i * 40; n._needsLayout = true; }
      if (!STATUS[n.status]) n.status = 'todo';
      if (!Array.isArray(n.comments)) n.comments = [];
      if (n.type === 'action') { if (!Array.isArray(n.cases)) n.cases = []; n.cases.forEach(c => { if (!c.id) c.id = uniqueCaseId(n, c.label); if (c.next === undefined) c.next = null; }); }
      if (n.type === 'menu') (n.options || []).forEach(o => { if (!o.id) o.id = uniqueOptionId(n, o.label); if (o.description == null) o.description = ''; if (o.next === undefined) o.next = null; });
    });
    if (!flow.settings.startNode || !seen.has(flow.settings.startNode)) flow.settings.startNode = flow.nodes[0] ? flow.nodes[0].id : null;
    return flow;
  }

  function map(flow) {
    const m = {};
    flow.nodes.forEach(n => { m[n.id] = n; });
    return m;
  }

  /* Portas de saída de um nó (inclui as que ainda não têm destino). */
  function ports(n) {
    switch (n.type) {
      case 'message': return [{ port: 'next', label: 'Próximo', kind: 'next', to: n.next }];
      case 'menu': return (n.options || []).map((o, i) => ({ port: 'opt:' + o.id, label: (i + 1) + ' · ' + (o.label || '(sem rótulo)'), kind: 'option', to: o.next }));
      case 'input': return [
        { port: 'next', label: 'Resposta válida', kind: 'ok', to: n.next },
        { port: 'invalid', label: 'Resposta inválida', kind: 'invalid', to: n.invalid }];
      case 'action':
        if (n.cases && n.cases.length) {
          return n.cases.map(c => ({ port: 'case:' + c.id, label: c.label || '(sem nome)', kind: 'case', to: c.next }))
            .concat([{ port: 'failure', label: 'Falha / não encontrado', kind: 'fail', to: n.onFailure }]);
        }
        return [
          { port: 'success', label: 'Sucesso', kind: 'ok', to: n.onSuccess },
          { port: 'failure', label: 'Falha', kind: 'fail', to: n.onFailure }];
      default: return [];
    }
  }

  function outLinks(n) {
    return ports(n).filter(p => p.to).map(p => ({ from: n.id, port: p.port, kind: p.kind, label: p.label, to: p.to }));
  }

  function setLink(n, port, to) {
    to = to || null;
    if (port === 'next') n.next = to;
    else if (port === 'invalid') n.invalid = to;
    else if (port === 'success') n.onSuccess = to;
    else if (port === 'failure') n.onFailure = to;
    else if (port.indexOf('case:') === 0) {
      const c = (n.cases || []).find(x => x.id === port.slice(5));
      if (c) c.next = to;
    }
    else if (port.indexOf('opt:') === 0) {
      const o = (n.options || []).find(x => x.id === port.slice(4));
      if (o) o.next = to;
    }
  }

  function clearLinksTo(flow, id) {
    flow.nodes.forEach(n => ports(n).forEach(p => { if (p.to === id) setLink(n, p.port, null); }));
  }

  function removeNode(flow, id) {
    flow.nodes = flow.nodes.filter(n => n.id !== id);
    clearLinksTo(flow, id);
    if (flow.settings.startNode === id) flow.settings.startNode = flow.nodes[0] ? flow.nodes[0].id : null;
  }

  function duplicateNode(flow, id) {
    const src = flow.nodes.find(n => n.id === id);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid(new Set(flow.nodes.map(n => n.id)));
    copy.title = src.title + ' (cópia)';
    copy.x = src.x + 40; copy.y = src.y + 40; copy.comments = [];
    flow.nodes.push(copy);
    return copy;
  }

  /* Ordem de leitura: busca em largura a partir do início; nós soltos vão ao final. */
  function order(flow) {
    const m = map(flow), seen = new Set(), out = [];
    const queue = [];
    if (m[flow.settings.startNode]) { queue.push(flow.settings.startNode); seen.add(flow.settings.startNode); }
    while (queue.length) {
      const n = m[queue.shift()];
      out.push(n);
      outLinks(n).forEach(l => { if (m[l.to] && !seen.has(l.to)) { seen.add(l.to); queue.push(l.to); } });
    }
    const loose = flow.nodes.filter(n => !seen.has(n.id));
    return { reachable: out, loose };
  }

  function estimateHeight(n) {
    return 92 + Math.max(1, ports(n).length) * 30;
  }

  /* Layout em colunas por profundidade (esquerda → direita). */
  function autoLayout(flow) {
    const m = map(flow), depth = {}, queue = [];
    const start = flow.settings.startNode;
    if (m[start]) { depth[start] = 0; queue.push(start); }
    while (queue.length) {
      const id = queue.shift();
      outLinks(m[id]).forEach(l => { if (m[l.to] && depth[l.to] === undefined) { depth[l.to] = depth[id] + 1; queue.push(l.to); } });
    }
    let maxD = Math.max(-1, ...Object.values(depth));
    flow.nodes.forEach(n => { if (depth[n.id] === undefined) depth[n.id] = maxD + 2; });
    const cols = {};
    flow.nodes.forEach(n => { (cols[depth[n.id]] = cols[depth[n.id]] || []).push(n); });
    Object.keys(cols).forEach(d => {
      let y = 0;
      cols[d].forEach(n => { n.x = d * 340; n.y = y; y += estimateHeight(n) + 36; delete n._needsLayout; });
    });
  }

  function stats(flow) {
    const s = { total: flow.nodes.length, todo: 0, review: 0, approved: 0 };
    flow.nodes.forEach(n => { s[n.status] = (s[n.status] || 0) + 1; });
    s.progress = s.total ? Math.round((s.approved / s.total) * 100) : 0;
    return s;
  }

  /* Verificação do fluxo inteiro. Usa Meta.validateNode para as regras do canal. */
  function lint(flow, Meta) {
    const issues = [];
    const add = (severity, nodeId, message) => issues.push({ severity, nodeId: nodeId || null, message });
    if (!flow.nodes.length) { add('error', null, 'O fluxo não tem nenhum nó.'); return issues; }
    const m = map(flow);
    if (!m[flow.settings.startNode]) add('error', null, 'Defina o nó inicial do fluxo.');
    const o = order(flow);
    const reach = new Set(o.reachable.map(n => n.id));
    flow.nodes.forEach(n => {
      if (Meta) Meta.validateNode(n).forEach(i => add(i.severity, n.id, i.message));
      ports(n).forEach(p => {
        if (p.to && !m[p.to]) add('error', n.id, 'Ligação para um nó que não existe (' + p.label + ').');
        if (!p.to && n.type === 'input' && p.port === 'invalid' && (n.validation || 'none') === 'none') return; // texto livre nunca é inválido
        if (!p.to && n.type !== 'handoff' && n.type !== 'end') {
          const where = n.type === 'menu' ? 'A opção "' + p.label.replace(/^\d+ · /, '') + '" não tem destino.'
            : n.type === 'message' ? 'Este nó não tem próximo passo.'
              : n.type === 'input' ? (p.port === 'invalid' ? 'Falta definir o que acontece se a resposta for inválida.' : 'Falta o próximo passo após a resposta válida.')
                : p.kind === 'case' ? 'O cenário "' + p.label + '" não tem destino.'
                  : 'Falta o destino em caso de ' + p.label.toLowerCase() + '.';
          add('warn', n.id, where);
        }
      });
      if (!reach.has(n.id) && m[flow.settings.startNode]) add('warn', n.id, 'Nó fora do fluxo: nenhum caminho chega até ele.');
      if (n.status === 'todo') add('info', n.id, 'Ainda a definir.');
      if (n.notes && n.notes.trim()) add('info', n.id, 'Pergunta em aberto: ' + n.notes.trim().split('\n')[0]);
    });
    const rank = { error: 0, warn: 1, info: 2 };
    issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
    return issues;
  }

  return {
    SCHEMA, TYPES, STATUS, VALIDATIONS, uid, slug, uniqueOptionId, uniqueCaseId, newNode, newFlow, normalize,
    map, ports, outLinks, setLink, clearLinksTo, removeNode, duplicateNode, order, autoLayout, stats, lint, estimateHeight
  };
});

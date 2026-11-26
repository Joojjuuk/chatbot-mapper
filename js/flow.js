/* flow.js — modelo do fluxo: tipos, escopos (principal e subfluxos), ligações, migração,
   layout em faixas por grupo, busca, variáveis, regras e verificação.
   Sem dependências. Funciona no navegador (window.Flow) e no Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Flow = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCHEMA = 'chatbot-mapper/2';
  const SCHEMAS_OK = ['chatbot-mapper/1', 'chatbot-mapper/2'];

  const TYPES = {
    message: { label: 'Mensagem', hint: 'O bot envia um texto e segue adiante.' },
    menu: { label: 'Menu de opções', hint: 'O cliente escolhe uma opção (botões ou lista).' },
    input: { label: 'Pergunta ao cliente', hint: 'O bot pede um dado e guarda a resposta.' },
    action: { label: 'Ação do sistema', hint: 'Consulta ou grava algo em um sistema.' },
    call: { label: 'Chamar subfluxo', hint: 'Roda um bloco reutilizável e volta para cá.' },
    return: { label: 'Voltar ao fluxo', hint: 'Termina o subfluxo e volta para quem chamou.' },
    handoff: { label: 'Atendente humano', hint: 'Transfere a conversa para uma pessoa.' },
    end: { label: 'Encerramento', hint: 'Finaliza a conversa.' }
  };

  const STATUS = { todo: 'A definir', review: 'Em validação', approved: 'Aprovado' };

  const VALIDATIONS = { none: 'Qualquer texto', number: 'Somente números', cnpj: 'CNPJ', cpf: 'CPF', email: 'E-mail' };

  /* Paleta de grupos: chaves estáveis no arquivo; as cores ficam no CSS (--c1 … --c8). */
  const GROUP_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];

  const TEMPLATE_CATEGORIES = { utility: 'Utilidade', marketing: 'Marketing', authentication: 'Autenticação' };
  const TEMPLATE_APPROVAL = { draft: 'Rascunho', submitted: 'Enviado à Meta', approved: 'Aprovado', rejected: 'Rejeitado' };

  const RULE_OPS = {
    filled: { label: 'preenchido', value: false },
    empty: { label: 'vazio', value: false },
    eq: { label: '=', value: true },
    neq: { label: '≠', value: true },
    gt: { label: '>', value: true },
    lt: { label: '<', value: true },
    contains: { label: 'contém', value: true }
  };

  const VAR_TYPES = { texto: 'Texto', numero: 'Número', data: 'Data', moeda: 'Moeda', documento: 'Documento', lista: 'Lista' };

  /* ---------- utilidades ---------- */
  function uid(existing, prefix) {
    let id;
    do { id = (prefix || 'n') + Math.random().toString(36).slice(2, 7); } while (existing && existing.has(id));
    return id;
  }

  function slug(text) {
    return String(text || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      .slice(0, 30) || 'opcao';
  }

  const fold = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function uniqueIn(list, label) {
    const used = new Set((list || []).map(o => o.id));
    const base = slug(label);
    let id = base, i = 2;
    while (used.has(id)) id = base + '_' + i++;
    return id;
  }
  const uniqueOptionId = (node, label) => uniqueIn(node.options, label);
  const uniqueCaseId = (node, label) => uniqueIn(node.cases, label);

  /* "@Ana Souza" → "Ana Souza" (segunda palavra só entra se começar com maiúscula). */
  function mentions(text) {
    const out = [];
    String(text || '').replace(/@([A-Za-zÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ]*(?:\s[A-ZÀ-ÖØ-Þ][\wÀ-ÖØ-öø-ÿ]*)?)/g, (m, name) => {
      if (out.indexOf(name) < 0) out.push(name);
      return m;
    });
    return out;
  }

  /* ---------- criação ---------- */
  function newNode(type, x, y, flow, scope) {
    const ids = flow ? new Set(flow.nodes.map(n => n.id)) : null;
    const n = {
      id: uid(ids), type, title: TYPES[type].label, status: 'todo',
      x: Math.round(x || 0), y: Math.round(y || 0), text: '', notes: '',
      group: null, subflow: scope || null, comments: [], history: []
    };
    if (type === 'message') { n.next = null; n.template = { enabled: false, name: '', category: 'utility', language: 'pt_BR', approval: 'draft' }; }
    if (type === 'menu') {
      n.header = ''; n.footer = ''; n.listButton = 'Ver opções'; n.menuStyle = 'auto';
      n.options = [{ id: 'opcao_1', label: 'Opção 1', description: '', next: null }];
    }
    if (type === 'input') { n.variable = ''; n.validation = 'none'; n.example = ''; n.next = null; n.invalid = null; }
    if (type === 'action') { n.system = ''; n.cases = []; n.onSuccess = null; n.onFailure = null; }
    if (type === 'call') { n.target = null; n.next = null; n.title = 'Chamar subfluxo'; }
    return n;
  }

  function newFlow(name) {
    const start = newNode('message', 0, 0);
    start.id = 'inicio'; start.title = 'Boas-vindas'; start.text = 'Olá! Como podemos te ajudar?';
    const now = new Date().toISOString();
    return {
      schema: SCHEMA,
      meta: { name: name || 'Novo fluxo', description: '', brand: 'Minha Empresa', createdAt: now, updatedAt: now },
      settings: { startNode: start.id, fallbackText: 'Não entendi. Por favor, escolha uma das opções.', persona: null },
      groups: [], subflows: [], variables: [], personas: [], tests: [],
      nodes: [start]
    };
  }

  /* ---------- migração e normalização ---------- */
  function normalize(flow) {
    if (!flow || typeof flow !== 'object' || !Array.isArray(flow.nodes)) throw new Error('Arquivo não parece um fluxo do Chatbot Mapper.');
    if (flow.schema && SCHEMAS_OK.indexOf(flow.schema) < 0) throw new Error('Versão de arquivo desconhecida: ' + flow.schema);
    const now = new Date().toISOString();
    flow.schema = SCHEMA;
    flow.meta = Object.assign({ name: 'Fluxo importado', description: '', brand: 'Minha Empresa', createdAt: now, updatedAt: now }, flow.meta || {});
    flow.settings = Object.assign({ startNode: null, fallbackText: 'Não entendi. Por favor, escolha uma das opções.', persona: null }, flow.settings || {});
    ['groups', 'subflows', 'variables', 'personas', 'tests'].forEach(k => { if (!Array.isArray(flow[k])) flow[k] = []; });

    /* /1 → /2: valores de exemplo viram a persona "Padrão". */
    if (flow.settings.sample && typeof flow.settings.sample === 'object') {
      if (Object.keys(flow.settings.sample).length && !flow.personas.length) {
        flow.personas.push({ id: 'padrao', name: 'Padrão', values: Object.assign({}, flow.settings.sample) });
        if (!flow.settings.persona) flow.settings.persona = 'padrao';
      }
      delete flow.settings.sample;
    }

    const gids = new Set();
    flow.groups.forEach((g, i) => {
      if (!g.id || gids.has(g.id)) g.id = uid(gids, 'g');
      gids.add(g.id);
      if (!g.name) g.name = 'Grupo ' + (i + 1);
      if (GROUP_COLORS.indexOf(g.color) < 0) g.color = GROUP_COLORS[i % GROUP_COLORS.length];
      g.collapsed = !!g.collapsed;
    });
    const sids = new Set();
    flow.subflows.forEach((s, i) => {
      if (!s.id || sids.has(s.id)) s.id = uid(sids, 'sf');
      sids.add(s.id);
      if (!s.name) s.name = 'Subfluxo ' + (i + 1);
      if (s.start === undefined) s.start = null;
      if (s.description == null) s.description = '';
    });
    flow.variables = flow.variables.filter(v => v && v.name).map(v => Object.assign({ label: '', source: '', field: '', rule: '', type: 'texto', example: '' }, v));
    const pids = new Set();
    flow.personas.forEach((p, i) => {
      if (!p.id || pids.has(p.id)) p.id = uid(pids, 'p');
      pids.add(p.id);
      if (!p.name) p.name = 'Persona ' + (i + 1);
      if (!p.values || typeof p.values !== 'object') p.values = {};
    });
    if (flow.settings.persona && !pids.has(flow.settings.persona)) flow.settings.persona = null;
    const tids = new Set();
    flow.tests.forEach((t, i) => {
      if (!t.id || tids.has(t.id)) t.id = uid(tids, 't');
      tids.add(t.id);
      if (!t.name) t.name = 'Cenário ' + (i + 1);
      if (!Array.isArray(t.steps)) t.steps = [];
      if (t.startAt === undefined) t.startAt = null;
      if (t.persona === undefined) t.persona = null;
      if (t.expectEnd === undefined) t.expectEnd = null;
    });

    const seen = new Set();
    flow.nodes.forEach((n, i) => {
      if (!TYPES[n.type]) throw new Error('Tipo de nó desconhecido: ' + n.type);
      if (!n.id || seen.has(n.id)) n.id = uid(seen);
      seen.add(n.id);
      const hasPos = typeof n.x === 'number' && typeof n.y === 'number';
      const d = newNode(n.type, 0, 0);
      Object.keys(d).forEach(k => { if (n[k] === undefined) n[k] = d[k]; });
      if (n.type === 'call' && n.title === undefined) n.title = d.title;
      if (!hasPos) { n.x = i * 40; n.y = i * 40; n._needsLayout = true; }
      if (!STATUS[n.status]) n.status = 'todo';
      if (n.group && !gids.has(n.group)) n.group = null;
      if (n.subflow && !sids.has(n.subflow)) n.subflow = null;
      if (!Array.isArray(n.comments)) n.comments = [];
      n.comments.forEach(c => { c.resolved = !!c.resolved; c.mentions = mentions(c.text); });
      if (!Array.isArray(n.history)) n.history = [];
      if (n.type === 'message') n.template = Object.assign({ enabled: false, name: '', category: 'utility', language: 'pt_BR', approval: 'draft' }, n.template || {});
      if (n.type === 'action') {
        if (!Array.isArray(n.cases)) n.cases = [];
        n.cases.forEach(c => {
          if (!c.id) c.id = uniqueCaseId(n, c.label);
          if (c.next === undefined) c.next = null;
          if (!Array.isArray(c.when)) c.when = [];
        });
      }
      if (n.type === 'menu') (n.options || []).forEach(o => { if (!o.id) o.id = uniqueOptionId(n, o.label); if (o.description == null) o.description = ''; if (o.next === undefined) o.next = null; });
      if (n.type === 'call' && n.target && !sids.has(n.target)) n.target = null;
    });
    flow.subflows.forEach(s => {
      if (s.start && !flow.nodes.some(n => n.id === s.start && n.subflow === s.id)) s.start = null;
      if (!s.start) { const first = flow.nodes.find(n => n.subflow === s.id); s.start = first ? first.id : null; }
    });
    const main = flow.nodes.filter(n => !n.subflow);
    if (!flow.settings.startNode || !main.some(n => n.id === flow.settings.startNode)) flow.settings.startNode = main[0] ? main[0].id : null;
    return flow;
  }

  /* ---------- escopos ---------- */
  const scopeOf = n => (n && n.subflow) || null;
  function scopeNodes(flow, scope) { scope = scope || null; return flow.nodes.filter(n => scopeOf(n) === scope); }
  function subflow(flow, id) { return (flow.subflows || []).find(s => s.id === id) || null; }
  function scopeStart(flow, scope) { return scope ? ((subflow(flow, scope) || {}).start || null) : flow.settings.startNode; }
  function setScopeStart(flow, scope, id) { if (scope) { const s = subflow(flow, scope); if (s) s.start = id; } else flow.settings.startNode = id; }
  function scopeName(flow, scope) { return scope ? ((subflow(flow, scope) || {}).name || 'Subfluxo') : 'Fluxo principal'; }

  function map(flow) {
    const m = {};
    flow.nodes.forEach(n => { m[n.id] = n; });
    return m;
  }

  /* ---------- portas e ligações ---------- */
  function ports(n) {
    switch (n.type) {
      case 'message': return [{ port: 'next', label: 'Próximo', kind: 'next', to: n.next }];
      case 'call': return [{ port: 'next', label: 'Depois do subfluxo', kind: 'next', to: n.next }];
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
    else if (port.indexOf('case:') === 0) { const c = (n.cases || []).find(x => x.id === port.slice(5)); if (c) c.next = to; }
    else if (port.indexOf('opt:') === 0) { const o = (n.options || []).find(x => x.id === port.slice(4)); if (o) o.next = to; }
  }

  function firstFreePort(n) {
    const p = ports(n).find(x => !x.to && !(n.type === 'input' && x.port === 'invalid'));
    return p ? p.port : null;
  }

  function clearLinksTo(flow, id) {
    flow.nodes.forEach(n => ports(n).forEach(p => { if (p.to === id) setLink(n, p.port, null); }));
  }

  function removeNode(flow, id) {
    const gone = flow.nodes.find(n => n.id === id);
    flow.nodes = flow.nodes.filter(n => n.id !== id);
    clearLinksTo(flow, id);
    const scope = scopeOf(gone);
    if (scopeStart(flow, scope) === id) { const rest = scopeNodes(flow, scope); setScopeStart(flow, scope, rest[0] ? rest[0].id : null); }
  }

  function removeSubflow(flow, sfId) {
    flow.nodes.filter(n => n.subflow === sfId).map(n => n.id).forEach(id => removeNode(flow, id));
    flow.subflows = flow.subflows.filter(s => s.id !== sfId);
    flow.nodes.forEach(n => { if (n.type === 'call' && n.target === sfId) n.target = null; });
  }

  function removeGroup(flow, gid) {
    flow.groups = flow.groups.filter(g => g.id !== gid);
    flow.nodes.forEach(n => { if (n.group === gid) n.group = null; });
  }

  function duplicateNode(flow, id) {
    const src = flow.nodes.find(n => n.id === id);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid(new Set(flow.nodes.map(n => n.id)));
    copy.title = src.title + ' (cópia)';
    copy.x = src.x + 40; copy.y = src.y + 40; copy.comments = []; copy.history = [];
    flow.nodes.push(copy);
    return copy;
  }

  /* Muda o status registrando no histórico. */
  function setStatus(n, status, by, action, note) {
    if (!STATUS[status] || n.status === status) return false;
    n.history = n.history || [];
    n.history.push({ at: new Date().toISOString(), by: by || '', action: action || 'status', from: n.status, to: status, note: note || '' });
    n.status = status;
    return true;
  }

  /* ---------- ordem de leitura ---------- */
  function order(flow, scope) {
    scope = scope || null;
    const m = map(flow), seen = new Set(), out = [], queue = [];
    const start = scopeStart(flow, scope);
    if (m[start] && scopeOf(m[start]) === scope) { queue.push(start); seen.add(start); }
    while (queue.length) {
      const n = m[queue.shift()];
      out.push(n);
      outLinks(n).forEach(l => { if (m[l.to] && scopeOf(m[l.to]) === scope && !seen.has(l.to)) { seen.add(l.to); queue.push(l.to); } });
    }
    const loose = scopeNodes(flow, scope).filter(n => !seen.has(n.id));
    return { reachable: out, loose };
  }

  /* Todos os escopos: principal primeiro, depois os subfluxos na ordem da lista. */
  function orderAll(flow) {
    return [null].concat((flow.subflows || []).map(s => s.id)).map(scope => Object.assign({ scope, name: scopeName(flow, scope) }, order(flow, scope)));
  }

  function estimateHeight(n) { return 92 + Math.max(1, ports(n).length) * 30; }

  /* ---------- layout: linhas por grupo, colunas por profundidade ---------- */
  const COL_W = 340, ROW_GAP = 32, LANE_GAP = 72;
  function autoLayout(flow, scope) {
    scope = scope === undefined ? null : scope;
    const nodes = scopeNodes(flow, scope);
    if (!nodes.length) return;
    const m = map(flow), ids = new Set(nodes.map(n => n.id));
    const depth = {}, queue = [];
    const start = scopeStart(flow, scope);
    if (ids.has(start)) { depth[start] = 0; queue.push(start); }
    while (queue.length) {
      const id = queue.shift();
      outLinks(m[id]).forEach(l => { if (ids.has(l.to) && depth[l.to] === undefined) { depth[l.to] = depth[id] + 1; queue.push(l.to); } });
    }
    const maxD = Math.max(-1, ...Object.values(depth));
    nodes.forEach(n => { if (depth[n.id] === undefined) depth[n.id] = maxD + 1; });

    const laneOrder = (flow.groups || []).map(g => g.id).concat([null]);
    const laneIdx = n => { const i = laneOrder.indexOf(n.group || null); return i < 0 ? laneOrder.length - 1 : i; };
    const preds = {}, succs = {};
    nodes.forEach(n => { preds[n.id] = []; succs[n.id] = []; });
    nodes.forEach(n => outLinks(n).forEach(l => { if (ids.has(l.to) && l.to !== n.id) { preds[l.to].push(n.id); succs[n.id].push(l.to); } }));

    /* células (faixa, coluna) com ordem inicial = ordem do arquivo */
    const cells = {};
    nodes.forEach(n => { const k = laneIdx(n) + ':' + depth[n.id]; (cells[k] = cells[k] || []).push(n); });
    const rank = {};
    const recompute = () => {
      Object.keys(cells).forEach(k => { const lane = +k.split(':')[0]; cells[k].forEach((n, i) => { rank[n.id] = lane * 1000 + i; }); });
    };
    recompute();
    const bary = (list, rel) => list.map(n => {
      const r = rel[n.id].filter(id => rank[id] !== undefined);
      return { n, b: r.length ? r.reduce((s, id) => s + rank[id], 0) / r.length : rank[n.id] };
    }).sort((a, b) => a.b - b.b).map(x => x.n);
    const cols = [...new Set(nodes.map(n => depth[n.id]))].sort((a, b) => a - b);
    const sweep = (colsSeq, rel) => colsSeq.forEach(d => {
      Object.keys(cells).filter(k => +k.split(':')[1] === d).forEach(k => { cells[k] = bary(cells[k], rel); });
      recompute();
    });
    sweep(cols, preds); sweep(cols.slice().reverse(), succs); sweep(cols, preds);

    let y0 = 0;
    laneOrder.forEach((gid, li) => {
      const keys = Object.keys(cells).filter(k => +k.split(':')[0] === li);
      if (!keys.length) return;
      let laneH = 0;
      keys.forEach(k => {
        const d = +k.split(':')[1];
        let y = y0;
        cells[k].forEach(n => { n.x = d * COL_W; n.y = y; y += estimateHeight(n) + ROW_GAP; delete n._needsLayout; });
        laneH = Math.max(laneH, y - y0 - ROW_GAP);
      });
      y0 += laneH + LANE_GAP;
    });
  }

  function stats(flow) {
    const s = { total: flow.nodes.length, todo: 0, review: 0, approved: 0 };
    flow.nodes.forEach(n => { s[n.status] = (s[n.status] || 0) + 1; });
    s.progress = s.total ? Math.round((s.approved / s.total) * 100) : 0;
    return s;
  }

  /* ---------- busca ---------- */
  function searchText(n) {
    return [n.title, n.text, n.notes, n.system, n.variable,
      (n.options || []).map(o => o.label + ' ' + (o.description || '')).join(' '),
      (n.cases || []).map(c => c.label).join(' ')].join(' \n ');
  }
  function search(flow, q) {
    const t = fold(q).trim();
    if (!t) return [];
    const words = t.split(/\s+/);
    return flow.nodes.map(n => {
      const title = fold(n.title), all = fold(searchText(n));
      if (!words.every(w => all.indexOf(w) >= 0)) return null;
      const score = (title.indexOf(t) === 0 ? 0 : title.indexOf(t) >= 0 ? 1 : words.every(w => title.indexOf(w) >= 0) ? 2 : 3);
      return { node: n, score };
    }).filter(Boolean).sort((a, b) => a.score - b.score || fold(a.node.title).localeCompare(fold(b.node.title)));
  }

  /* Filtro do mapa: {status:[], open:bool, unresolved:bool, groups:[]} → nó passa? */
  function matchesFilter(n, f) {
    if (!f) return true;
    if (f.status && f.status.length && f.status.indexOf(n.status) < 0) return false;
    if (f.groups && f.groups.length && f.groups.indexOf(n.group || '') < 0) return false;
    if (f.open && !(n.notes && n.notes.trim())) return false;
    if (f.unresolved && !(n.comments || []).some(c => !c.resolved)) return false;
    return true;
  }

  /* ---------- variáveis ---------- */
  function textVars(text) {
    const out = [];
    String(text || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => { if (out.indexOf(k) < 0) out.push(k); return m; });
    return out;
  }
  function discoverVariables(flow) {
    const used = {};
    const add = (name, id) => { (used[name] = used[name] || []).indexOf(id) < 0 && used[name].push(id); };
    flow.nodes.forEach(n => {
      [n.text, n.header, n.footer].concat((n.options || []).map(o => o.label + ' ' + o.description)).forEach(t => textVars(t).forEach(v => add(v, n.id)));
      if (n.type === 'input' && n.variable) add(n.variable, n.id);
      (n.cases || []).forEach(c => (c.when || []).forEach(w => { if (w.field) add(w.field, n.id); }));
    });
    const defined = (flow.variables || []).map(v => v.name);
    return {
      used, defined,
      undefined: Object.keys(used).filter(k => defined.indexOf(k) < 0).sort(),
      unused: defined.filter(k => !used[k])
    };
  }
  const validVarName = s => /^[a-z0-9_.]+$/i.test(String(s || ''));

  function personaValues(flow, id) {
    const p = (flow.personas || []).find(x => x.id === (id === undefined ? flow.settings.persona : id));
    return p ? Object.assign({}, p.values) : {};
  }

  /* ---------- regras estruturadas ---------- */
  function condText(w, flow) {
    const v = (flow && flow.variables || []).find(x => x.name === w.field);
    const field = v && v.label ? v.label : (w.field || '(campo)');
    const op = RULE_OPS[w.op] || RULE_OPS.eq;
    return field + ' ' + op.label + (op.value ? ' ' + (w.value === '' || w.value == null ? '(valor)' : w.value) : '');
  }
  function ruleText(c, flow) {
    const conds = (c.when || []).map(w => condText(w, flow));
    return conds.length ? conds.join(' e ') + ' → ' + (c.label || 'cenário') : '';
  }

  /* ---------- verificação ---------- */
  function lint(flow, Meta) {
    const issues = [];
    const add = (severity, nodeId, message) => issues.push({ severity, nodeId: nodeId || null, message });
    if (!flow.nodes.length) { add('error', null, 'O fluxo não tem nenhum nó.'); return issues; }
    const m = map(flow);
    if (!m[flow.settings.startNode]) add('error', null, 'Defina o nó inicial do fluxo.');
    const reach = new Set();
    orderAll(flow).forEach(o => o.reachable.forEach(n => reach.add(n.id)));
    const called = new Set(flow.nodes.filter(n => n.type === 'call' && n.target).map(n => n.target));

    (flow.subflows || []).forEach(s => {
      if (!s.start) { add('warn', null, 'O subfluxo "' + s.name + '" não tem passo inicial.'); return; }
      if (!order(flow, s.id).reachable.some(n => n.type === 'return')) add('warn', s.start, 'O subfluxo "' + s.name + '" não volta para quem chamou (falta um passo "Voltar ao fluxo").');
      if (!called.has(s.id)) add('info', s.start, 'O subfluxo "' + s.name + '" não é chamado por nenhum passo.');
    });

    flow.nodes.forEach(n => {
      if (Meta) Meta.validateNode(n).forEach(i => add(i.severity, n.id, i.message));
      if (n.type === 'call') {
        if (!n.target || !subflow(flow, n.target)) add('warn', n.id, 'Este passo não chama nenhum subfluxo.');
        else if (n.target === n.subflow) add('warn', n.id, 'O subfluxo chama a si mesmo.');
      }
      if (n.type === 'return' && !n.subflow) add('warn', n.id, '"Voltar ao fluxo" só faz sentido dentro de um subfluxo.');
      ports(n).forEach(p => {
        if (p.to && !m[p.to]) { add('error', n.id, 'Ligação para um nó que não existe (' + p.label + ').'); return; }
        if (p.to && scopeOf(m[p.to]) !== scopeOf(n)) add('warn', n.id, 'Ligação "' + p.label + '" atravessa para outro escopo. Use "Chamar subfluxo".');
        if (!p.to && n.type === 'input' && p.port === 'invalid' && (n.validation || 'none') === 'none') return;
        if (!p.to) {
          const where = n.type === 'menu' ? 'A opção "' + p.label.replace(/^\d+ · /, '') + '" não tem destino.'
            : n.type === 'message' ? 'Este nó não tem próximo passo.'
              : n.type === 'call' ? 'Falta o próximo passo depois do subfluxo.'
                : n.type === 'input' ? (p.port === 'invalid' ? 'Falta definir o que acontece se a resposta for inválida.' : 'Falta o próximo passo após a resposta válida.')
                  : p.kind === 'case' ? 'O cenário "' + p.label + '" não tem destino.'
                    : 'Falta o destino em caso de ' + p.label.toLowerCase() + '.';
          add('warn', n.id, where);
        }
      });
      if (!reach.has(n.id)) add('warn', n.id, 'Nó fora do fluxo: nenhum caminho chega até ele.');
      if (n.status === 'todo') add('info', n.id, 'Ainda a definir.');
      if (n.notes && n.notes.trim()) add('info', n.id, 'Pergunta em aberto: ' + n.notes.trim().split('\n')[0]);
    });
    const vars = discoverVariables(flow);
    if ((flow.variables || []).length) vars.undefined.forEach(v => add('info', vars.used[v][0], 'Variável {{' + v + '}} sem definição no dicionário de dados.'));
    const rank = { error: 0, warn: 1, info: 2 };
    issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
    return issues;
  }

  return {
    SCHEMA, TYPES, STATUS, VALIDATIONS, GROUP_COLORS, TEMPLATE_CATEGORIES, TEMPLATE_APPROVAL, RULE_OPS, VAR_TYPES,
    uid, slug, fold, uniqueOptionId, uniqueCaseId, mentions, newNode, newFlow, normalize,
    scopeOf, scopeNodes, subflow, scopeStart, setScopeStart, scopeName,
    map, ports, outLinks, setLink, firstFreePort, clearLinksTo, removeNode, removeSubflow, removeGroup, duplicateNode, setStatus,
    order, orderAll, autoLayout, estimateHeight, stats, search, matchesFilter,
    textVars, discoverVariables, validVarName, personaValues, condText, ruleText, lint
  };
});

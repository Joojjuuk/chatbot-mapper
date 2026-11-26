// Testes (Node >= 18, sem dependências):  node tests/run.js
// Os nomes com prefixo "S01-AC-3" apontam para o critério de aceite da spec em docs/specs/.
const assert = require('assert');
const Flow = require('../js/flow.js');
const Meta = require('../js/meta.js');
const Analysis = require('../js/analysis.js');
const makeExample = require('../js/example.js');

let ok = 0;
const t = (name, fn) => { try { fn(); ok++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; } };
const example = () => Flow.normalize(makeExample());
const tiny = (nodes, extra) => Flow.normalize(Object.assign({ schema: 'chatbot-mapper/2', meta: { name: 't' }, settings: { startNode: nodes[0].id }, nodes }, extra || {}));
const N = (id, type, extra) => Object.assign({ id, type, title: id, status: 'todo', text: 'x' }, extra || {});

console.log('Fluxo');
t('exemplo normaliza e tem nó inicial', () => {
  const f = example();
  assert(f.nodes.length > 20);
  assert(f.nodes.some(n => n.id === f.settings.startNode));
});
t('lint não reporta erros no exemplo', () => {
  const errs = Flow.lint(example(), Meta).filter(i => i.severity === 'error');
  assert.strictEqual(errs.length, 0, JSON.stringify(errs));
});
t('lint do exemplo não tem avisos de estrutura', () => {
  const warns = Flow.lint(example(), Meta).filter(i => i.severity === 'warn');
  assert.strictEqual(warns.length, 0, JSON.stringify(warns));
});
t('autoLayout atribui posições distintas em cada escopo', () => {
  const f = example();
  [null, 'sf_central', 'sf_token'].forEach(s => Flow.autoLayout(f, s));
  [null, 'sf_central', 'sf_token'].forEach(s => {
    const ns = Flow.scopeNodes(f, s), keys = new Set(ns.map(n => n.x + ',' + n.y));
    assert.strictEqual(keys.size, ns.length, 'escopo ' + s);
  });
});

console.log('Spec 01 — organização do mapa');
t('S01-AC-1 arquivo /1 ganha grupos e subfluxos vazios', () => {
  const f = Flow.normalize({ schema: 'chatbot-mapper/1', meta: { name: 'v1' }, settings: { startNode: 'a' }, nodes: [N('a', 'message', { next: null })] });
  assert.strictEqual(f.schema, 'chatbot-mapper/2');
  assert.deepStrictEqual(f.groups, []); assert.deepStrictEqual(f.subflows, []);
  assert.strictEqual(f.nodes[0].group, null); assert.strictEqual(f.nodes[0].subflow, null);
});
t('S01-AC-2 call tem porta next e não gera aviso', () => {
  const f = tiny([N('a', 'call', { target: 'sf', next: 'b' }), N('b', 'end'), N('r', 'return', { subflow: 'sf' })], { subflows: [{ id: 'sf', name: 'S', start: 'r' }] });
  assert.deepStrictEqual(Flow.ports(f.nodes[0]).map(p => p.port), ['next']);
  assert(!Flow.lint(f, Meta).some(i => i.nodeId === 'a' && i.severity !== 'info'), JSON.stringify(Flow.lint(f, Meta)));
});
t('S01-AC-3 call sem alvo é avisado', () => {
  const f = tiny([N('a', 'call', { next: 'b' }), N('b', 'end')]);
  assert(Flow.lint(f, Meta).some(i => /não chama nenhum subfluxo/.test(i.message)));
});
t('S01-AC-4 subfluxo sem retorno é avisado', () => {
  const f = tiny([N('a', 'call', { target: 'sf', next: 'b' }), N('b', 'end'), N('s1', 'message', { subflow: 'sf', next: null })], { subflows: [{ id: 'sf', name: 'S', start: 's1' }] });
  assert(Flow.lint(f, Meta).some(i => /não volta para quem chamou/.test(i.message)));
});
t('S01-AC-5 layout coloca cada grupo em sua faixa', () => {
  const f = example();
  Flow.autoLayout(f, null);
  const main = Flow.scopeNodes(f, null);
  const ys = g => main.filter(n => n.group === g).map(n => n.y);
  assert(Math.max(...ys('g_entrada')) < Math.min(...ys('g_ident')));
  assert(Math.max(...ys('g_ident')) < Math.min(...ys('g_pedidos')));
});
t('S01-AC-6 busca ignora acento e caixa', () => {
  const r = Flow.search(example(), 'previsao');
  assert(r.some(x => x.node.id === 'st_transito'));
});
t('S01 ligação entre escopos é avisada', () => {
  const f = tiny([N('a', 'message', { next: 's1' }), N('s1', 'return', { subflow: 'sf' })], { subflows: [{ id: 'sf', name: 'S', start: 's1' }] });
  assert(Flow.lint(f, Meta).some(i => /atravessa para outro escopo/.test(i.message)));
});
t('S01 excluir subfluxo limpa call e nós', () => {
  const f = example();
  Flow.removeSubflow(f, 'sf_token');
  assert(!f.nodes.some(n => n.subflow === 'sf_token'));
  assert.strictEqual(f.nodes.find(n => n.id === 'docs_token').target, null);
});
t('S01 filtro por status e pergunta em aberto', () => {
  const n = { status: 'todo', notes: 'x', comments: [] };
  assert(Flow.matchesFilter(n, { status: ['todo'], open: true }));
  assert(!Flow.matchesFilter(n, { status: ['approved'] }));
});

console.log('Spec 02 — simulação');
t('S02-AC-1 cenários do exemplo passam', () => {
  const f = example();
  Analysis.runAll(f).forEach(r => assert(r.result.ok, r.test.name + ': ' + r.result.reason));
  assert(Analysis.runTest(f, f.tests[0]).visited.includes('encerramento'));
});
t('S02-AC-2 mudança de destino quebra o cenário com motivo', () => {
  const f = example();
  f.nodes.find(n => n.id === 'consulta_cadastro').onSuccess = 'pedido_numero';
  const r = Analysis.runTest(f, f.tests[0]);
  assert(!r.ok); assert(/Esperava a conversa em "Menu principal"/.test(r.reason), r.reason);
});
t('S02-AC-3 opção removida quebra o cenário', () => {
  const f = example();
  const m = f.nodes.find(n => n.id === 'menu_principal');
  m.options = m.options.filter(o => o.id !== 'rastreio');
  const r = Analysis.runTest(f, f.tests[0]);
  assert(!r.ok); assert(/não existe mais/.test(r.reason), r.reason);
});
t('S02-AC-4 cobertura lista nós não visitados', () => {
  const c = Analysis.coverage(example());
  assert(c.unvisited.includes('todo_devolucao'));
  assert(!c.unvisited.includes('menu_principal'));
});
t('S02-AC-5 cenário entra no subfluxo e volta ao next do call', () => {
  const f = example();
  const r = Analysis.runTest(f, f.tests[1]);
  assert(r.ok, r.reason);
  const v = r.visited;
  assert(v.indexOf('t_ok') > v.indexOf('t_pede'));
  assert.strictEqual(v[v.indexOf('t_ok') + 1], 'docs_menu');
});
t('S02-AC-6 settings.sample vira persona Padrão', () => {
  const f = Flow.normalize({ schema: 'chatbot-mapper/1', meta: {}, settings: { startNode: 'a', sample: { previsao: '25/11' } }, nodes: [N('a', 'message')] });
  assert.strictEqual(f.settings.sample, undefined);
  assert.strictEqual(f.personas[0].name, 'Padrão');
  assert.strictEqual(Flow.personaValues(f).previsao, '25/11');
});
t('S02 início apagado falha com motivo', () => {
  const f = example();
  const r = Analysis.runTest(f, { steps: [], startAt: 'nao_existe' });
  assert(!r.ok); assert(/início/.test(r.reason));
});
t('S02 laço sem interação é detectado', () => {
  const f = tiny([N('a', 'message', { next: 'b' }), N('b', 'message', { next: 'a' })]);
  const r = Analysis.runTest(f, { steps: [] });
  assert(!r.ok); assert(/laço/.test(r.reason));
});

console.log('Spec 03 — validação com o cliente');
t('S03-AC-1 mescla aprovação e pedido de ajuste', () => {
  const f = example();
  const r = Analysis.mergeReview(f, { schema: 'chatbot-mapper/review/1', reviewer: 'Revisor', at: '2026-11-26T10:00:00Z',
    items: [{ node: 'menu_principal', decision: 'approved' }, { node: 'st_transito', decision: 'changes', comment: 'Mostrar também a transportadora.' }] });
  const m = Flow.map(f);
  assert.strictEqual(m.menu_principal.status, 'approved');
  assert.strictEqual(m.st_transito.status, 'review');
  assert.strictEqual(m.st_transito.comments.slice(-1)[0].author, 'Revisor');
  assert(m.menu_principal.history.length && m.st_transito.history.length);
  assert.deepStrictEqual(r.applied, ['menu_principal', 'st_transito']);
});
t('S03-AC-2 id inexistente é ignorado e listado', () => {
  const r = Analysis.mergeReview(example(), { schema: 'chatbot-mapper/review/1', items: [{ node: 'sumiu', decision: 'approved' }] });
  assert.deepStrictEqual(r.skipped, ['sumiu']);
});
t('S03-AC-3 diff encontra adicionado, removido e alterado', () => {
  const a = example(), b = example();
  b.nodes.find(n => n.id === 'inicio').text = 'Oi!';
  b.nodes = b.nodes.filter(n => n.id !== 'todo_elogio');
  b.nodes.push(Flow.newNode('end', 0, 0, b));
  const d = Analysis.diff(a, b);
  assert.strictEqual(d.added.length, 1);
  assert.deepStrictEqual(d.removed.map(x => x.id), ['todo_elogio']);
  const c = d.changed.find(x => x.id === 'inicio');
  assert(c && c.fields.includes('text'));
});
t('S03-AC-4 pendências trazem pergunta e comentário não resolvido', () => {
  const f = example();
  f.nodes.find(n => n.id === 'inicio').comments.push({ author: 'A', text: 'Trocar emoji?', date: '', resolved: false });
  const rows = Analysis.openQuestions(f, Flow.lint(f, Meta));
  assert(rows.some(r => r.kind === 'Pergunta em aberto' && r.nodeId === 'identificacao'));
  assert(rows.some(r => r.kind === 'Comentário' && r.nodeId === 'inicio'));
});
t('S03-AC-5 menções em comentários', () => {
  assert.deepStrictEqual(Flow.mentions('fala com @Ana Souza e @joao'), ['Ana Souza', 'joao']);
});
t('S03 mudança de status grava histórico', () => {
  const n = { status: 'todo', history: [] };
  assert(Flow.setStatus(n, 'approved', 'Ana'));
  assert.strictEqual(n.history[0].by, 'Ana'); assert.strictEqual(n.history[0].from, 'todo');
});

console.log('Spec 04 — ponte com o técnico');
t('S04-AC-1 descobre variáveis indefinidas e não usadas', () => {
  const f = tiny([N('a', 'message', { text: 'Previsão {{previsao}}', next: 'b' }), N('b', 'input', { variable: 'pedido', next: null })],
    { variables: [{ name: 'pedido' }, { name: 'cnpj' }] });
  const v = Flow.discoverVariables(f);
  assert.deepStrictEqual(v.undefined, ['previsao']);
  assert.deepStrictEqual(v.unused, ['cnpj']);
});
t('S04-AC-2 frase da regra usa rótulo do dicionário', () => {
  const f = { variables: [{ name: 'data_entrega', label: 'Data de entrega' }] };
  assert.strictEqual(Flow.ruleText({ label: 'Entregue', when: [{ field: 'data_entrega', op: 'filled' }] }, f), 'Data de entrega preenchido → Entregue');
  assert.strictEqual(Flow.ruleText({ label: 'X', when: [{ field: 'uf', op: 'eq', value: 'SP' }] }, {}), 'uf = SP → X');
});
t('S04-AC-3 fluxo linear tem volume fixo', () => {
  const f = tiny([N('a', 'message', { next: 'b' }), N('b', 'message', { next: 'c' }), N('c', 'message', { next: null })]);
  const v = Analysis.volume(f);
  assert.strictEqual(v.min, 3); assert.strictEqual(v.max, 3);
});
t('S04-AC-4 ramos de tamanhos diferentes', () => {
  const f = tiny([N('m', 'menu', { options: [{ id: 'a', label: 'A', next: 'x' }, { id: 'b', label: 'B', next: 'y' }] }),
    N('x', 'end', { text: '' }), N('y', 'message', { next: 'z' }), N('z', 'end', { text: 'tchau' })]);
  const v = Analysis.volume(f);
  assert.strictEqual(v.min, 1); assert.strictEqual(v.max, 3);
});
t('S04-AC-5 payload Meta traz as condições do cenário', () => {
  const n = example().nodes.find(x => x.id === 'busca_pedido');
  const r = Meta.buildNode(n);
  assert.strictEqual(r.action.cases[0].when[0].op, 'filled');
});
t('S04 volume do exemplo termina e conta cenários', () => {
  const v = Analysis.volume(example());
  assert(v.paths > 3 && v.max >= v.min && !v.truncated);
  assert.strictEqual(v.tests.length, 3);
});
t('S04 template leva idioma e variáveis', () => {
  const n = example().nodes.find(x => x.id === 'docs_nf');
  const r = Meta.buildNode(n);
  assert.strictEqual(r.template.language, 'pt_BR');
  assert.deepStrictEqual(r.template.variables, ['nf', 'email_cadastro']);
});

console.log('Spec 05 — qualidade de vida');
t('S05-AC-1 colar remapeia ids e corta ligações externas', () => {
  const f = example();
  const clip = Analysis.copySelection(f, ['pedido_numero', 'pedido_invalido']);
  const dest = Flow.normalize(Flow.newFlow('outro'));
  const nodes = Analysis.remapPaste(clip, dest, { dx: 40 });
  const a = nodes.find(n => n.title === 'Número do pedido'), b = nodes.find(n => n.title === 'Número inválido');
  assert.notStrictEqual(a.id, 'pedido_numero');
  assert.strictEqual(a.invalid, b.id);
  assert.strictEqual(b.next, a.id);
  assert.strictEqual(a.next, null);
  assert.strictEqual(a.group, null);
});
t('S05-AC-2 primeira saída livre', () => {
  const n = { type: 'menu', options: [{ id: 'a', label: 'A', next: 'x' }, { id: 'b', label: 'B', next: null }] };
  assert.strictEqual(Flow.firstFreePort(n), 'opt:b');
});

console.log('Limites da Meta');
const menu = (opts, extra) => Object.assign({ id: 'm', type: 'menu', title: 'm', text: 'Escolha', menuStyle: 'auto', options: opts }, extra || {});
const opt = (label, description) => ({ id: label.toLowerCase().replace(/\W+/g, '_'), label, description: description || '' });
t('até 3 opções curtas viram botões', () => assert.strictEqual(Meta.menuKind(menu([opt('Sim'), opt('Não')])), 'buttons'));
t('4 opções viram lista', () => assert.strictEqual(Meta.menuKind(menu([opt('a'), opt('b'), opt('c'), opt('d')])), 'list'));
t('mais de 10 opções não cabem', () => assert.strictEqual(Meta.menuKind(menu(Array.from({ length: 11 }, (_, i) => opt('Op ' + i)))), 'toomany'));
t('título de opção maior que 24 caracteres é sinalizado', () => {
  assert(Meta.validateNode(menu([opt('a'), opt('b'), opt('c'), opt('Solicitação de documentação')])).some(i => /24/.test(i.message)));
});
t('payload de lista respeita a estrutura da Cloud API', () => {
  const p = Meta.menuPayload(menu([opt('a'), opt('b'), opt('c'), opt('d')]));
  assert.strictEqual(p.interactive.type, 'list');
  assert.strictEqual(p.interactive.action.sections[0].rows.length, 4);
});

console.log('Cenários em ações');
const actionWithCases = () => ({ id: 'a', type: 'action', title: 'a', status: 'todo', system: 's', text: '', onSuccess: null, onFailure: null,
  cases: [{ id: 'x', label: 'Entregue', next: 'b' }, { id: 'y', label: 'Atrasada', next: null }] });
t('portas: um cenário por saída mais a falha', () => assert.deepStrictEqual(Flow.ports(actionWithCases()).map(p => p.port), ['case:x', 'case:y', 'failure']));
t('setLink grava o destino no cenário', () => { const a = actionWithCases(); Flow.setLink(a, 'case:y', 'c'); assert.strictEqual(a.cases[1].next, 'c'); });
t('ação sem cenários continua com sucesso/falha', () => assert.deepStrictEqual(Flow.ports({ type: 'action', cases: [] }).map(p => p.port), ['success', 'failure']));
t('lint avisa cenário sem destino', () => {
  const f = tiny([Object.assign(actionWithCases(), { onFailure: 'b' }), N('b', 'end', { text: '' })]);
  assert(Flow.lint(f, Meta).some(i => /cenário "Atrasada"/.test(i.message)));
});

console.log('\n' + ok + ' testes ok');

// Testes básicos (Node >= 18, sem dependências):  node tests/run.js
const assert = require('assert');
const Flow = require('../js/flow.js');
const Meta = require('../js/meta.js');
const makeExample = require('../js/example.js');

let ok = 0;
const t = (name, fn) => { try { fn(); ok++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; } };

console.log('Fluxo');
t('exemplo normaliza e tem nó inicial', () => {
  const f = Flow.normalize(makeExample());
  assert(f.nodes.length > 10);
  assert(f.nodes.some(n => n.id === f.settings.startNode));
});
t('autoLayout atribui posições distintas', () => {
  const f = Flow.normalize(makeExample());
  Flow.autoLayout(f);
  const keys = new Set(f.nodes.map(n => n.x + ',' + n.y));
  assert.strictEqual(keys.size, f.nodes.length);
});
t('lint não reporta erros no exemplo', () => {
  const f = Flow.normalize(makeExample());
  const errs = Flow.lint(f, Meta).filter(i => i.severity === 'error');
  assert.strictEqual(errs.length, 0, JSON.stringify(errs));
});

console.log('Limites da Meta');
const menu = (opts, extra) => Object.assign({ id: 'm', type: 'menu', title: 'm', text: 'Escolha', menuStyle: 'auto', options: opts, links: {} }, extra || {});
const opt = (label, description) => ({ id: label.toLowerCase().replace(/\W+/g, '_'), label, description: description || '' });
t('até 3 opções curtas viram botões', () => {
  assert.strictEqual(Meta.menuKind(menu([opt('Sim'), opt('Não')])), 'buttons');
});
t('4 opções viram lista', () => {
  assert.strictEqual(Meta.menuKind(menu([opt('a'), opt('b'), opt('c'), opt('d')])), 'list');
});
t('mais de 10 opções não cabem', () => {
  const many = Array.from({ length: 11 }, (_, i) => opt('Op ' + i));
  assert.strictEqual(Meta.menuKind(menu(many)), 'toomany');
});
t('título de opção maior que 24 caracteres é sinalizado', () => {
  const n = menu([opt('a'), opt('b'), opt('c'), opt('Solicitação de documentação')]);
  assert(Meta.validateNode(n).some(i => /24/.test(i.message)));
});
t('payload de lista respeita a estrutura da Cloud API', () => {
  const n = menu([opt('a'), opt('b'), opt('c'), opt('d')]);
  const p = Meta.menuPayload(n);
  assert.strictEqual(p.type, 'interactive');
  assert.strictEqual(p.interactive.type, 'list');
  assert.strictEqual(p.interactive.action.sections[0].rows.length, 4);
});
console.log('\n' + ok + ' testes ok');

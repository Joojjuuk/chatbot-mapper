/* review.js — página de revisão para o cliente (exportada como .revisao.html de arquivo único).
   O revisor lê cada passo, aprova ou pede ajuste com comentário e baixa um .json de respostas,
   que volta para o Chatbot Mapper (aba Revisão → Importar respostas).

   IMPORTANTE: ReviewPage é autossuficiente (vai embutida com toString). Usa ChatPlayer se existir. */
var REVIEW_CSS = `
:root{--c0:#8b939c;--c1:#1f5bd6;--c2:#0b8a48;--c3:#d42b2b;--c4:#e3a000;--c5:#8a45c6;--c6:#078fa3;--c7:#e85d2c;--c8:#66727f;
  --ink:#111923;--ink2:#334050;--mute:#556070;--line:#d6dbe1;--ground:#eceef1;--panel:#fff;--sign:#0d1b2e;--ok:#0b7a40;--okbg:#e3f5ea;--warn:#a85800;--warnbg:#fff3dc}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--ground);color:var(--ink);font:15.5px/1.5 "Barlow",system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-variant-numeric:tabular-nums}
button,input,textarea{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--c1);outline-offset:2px}
.rv-top{background:var(--sign);color:#fff;padding:18px 22px 16px}
.rv-top h1{margin:0;font-size:22px;line-height:1.2}
.rv-top p{margin:4px 0 0;color:#b7c3d4;font-size:14px;max-width:70ch}
.rv-bar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;background:var(--panel);border-bottom:1px solid var(--line);padding:10px 22px}
.rv-bar label{display:flex;gap:8px;align-items:center;font-weight:600;font-size:14px}
.rv-bar input{border:1px solid #aeb5bf;border-radius:6px;padding:6px 10px;min-width:200px}
.rv-prog{flex:1;min-width:200px;font-size:14px;color:var(--ink2)}
.rv-meter{height:8px;background:#e3e7ec;border-radius:4px;overflow:hidden;display:flex;margin-top:4px}
.rv-meter i{display:block;height:100%}
.rv-meter .a{background:var(--ok)}.rv-meter .c{background:var(--warn)}
.rv-btn{display:inline-flex;align-items:center;gap:6px;height:36px;border:1px solid #aeb5bf;background:var(--panel);border-radius:6px;padding:0 14px;font-weight:600;cursor:pointer}
.rv-btn:hover{background:#f5f6f8;border-color:var(--ink2)}
.rv-btn.primary{background:var(--sign);border-color:var(--sign);color:#fff}
.rv-btn.primary:hover{background:#16273f}
.rv-main{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:22px;padding:22px;max-width:1280px;margin:0 auto;align-items:start}
.rv-sim{position:sticky;top:76px;height:calc(100vh - 100px);min-height:520px;display:flex;flex-direction:column}
.rv-sim h2{font-size:15px;margin:0 0 8px}
.rv-sim .ph{flex:1;min-height:0}
.rv-scope{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--mute);margin:26px 0 8px}
.rv-scope:first-child{margin-top:0}
.rv-lane{display:flex;align-items:center;gap:8px;margin:18px 0 8px;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:.06em}
.rv-rd{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:12px;background:var(--lc,var(--c0));color:#fff;font-size:13px}
.rv-card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:0 16px 14px;margin-bottom:12px;overflow:hidden}
.rv-card.done-a{border:2.5px solid var(--ok)}
.rv-card.done-c{border:2.5px solid var(--warn)}
.rv-h{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 -16px 4px;padding:9px 16px;background:color-mix(in srgb,var(--lc,var(--c0)) 9%,#fff);border-bottom:1px solid color-mix(in srgb,var(--lc,var(--c0)) 25%,#fff)}
.rv-dot{width:12px;height:12px;border-radius:50%;background:var(--lc,var(--c0));flex:none}
.rv-state{margin-left:auto;font-size:13px;font-weight:700}
.done-a .rv-state{color:var(--ok)}.done-c .rv-state{color:var(--warn)}
.rv-h b{font-size:16.5px}
.rv-h small{color:var(--mute);font-size:13.5px}
.rv-n{font-weight:700;color:var(--mute);font-size:13.5px}
.rv-bub{background:#fff;border:1px solid #dde2e8;border-radius:10px;border-top-left-radius:2px;padding:9px 12px;margin:10px 0 6px;max-width:62ch;box-shadow:0 1px 1px rgba(0,0,0,.06);white-space:normal}
.rv-wa{background:#efeae2;border-radius:10px;padding:10px}
.rv-var{background:#e6ecff;color:#1d3a8a;border-radius:4px;padding:0 4px;font-size:.92em}
.rv-opts{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:14px;color:var(--ink2)}
.rv-opts li b{color:var(--ink)}
.rv-sys{font-size:14px;color:var(--ink2);margin:8px 0 0}
.rv-dec{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center}
.rv-dec .rv-btn[aria-pressed="true"].ap{background:var(--ok);border-color:var(--ok);color:#fff}
.rv-dec .rv-btn[aria-pressed="true"].ch{background:var(--warn);border-color:var(--warn);color:#fff}
.rv-dec .lk{margin-left:auto;border:0;background:none;color:var(--c1);font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.rv-cm{width:100%;margin-top:8px;border:1px solid #aeb5bf;border-radius:6px;padding:8px 10px;min-height:56px;resize:vertical}
.rv-foot{text-align:center;color:var(--mute);font-size:13px;padding:24px}
.rv-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:var(--sign);color:#fff;padding:10px 16px;border-radius:8px;opacity:0;transition:opacity .2s;pointer-events:none}
.rv-toast.on{opacity:1}
@media (max-width:900px){.rv-main{grid-template-columns:1fr;padding:14px}.rv-sim{position:static;height:600px;order:-1}.rv-bar{padding:10px 14px}.rv-top{padding:16px 14px}}
`;

function ReviewPage(root, flow, opts) {
  opts = opts || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TYPE = { message: 'Mensagem', menu: 'Menu de opções', input: 'Pergunta ao cliente', action: 'Consulta ao sistema', call: 'Subfluxo', 'return': 'Volta ao fluxo', handoff: 'Atendente humano', end: 'Encerramento' };
  const STATUS = { todo: 'A definir', review: 'Em validação', approved: 'Aprovado' };
  const byId = {}; flow.nodes.forEach(n => { byId[n.id] = n; });
  const groups = {}; (flow.groups || []).forEach((g, i) => { groups[g.id] = { g, i }; });
  const KEY = 'cm-review:' + (flow.meta && flow.meta.name) + ':' + (flow.meta && flow.meta.updatedAt);
  let state = { reviewer: '', items: {} };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignora */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignora */ } };

  function fmt(t) {
    return esc(t).replace(/\{\{\s*([\w.]+)\s*\}\}/g, '<span class="rv-var">$1</span>').replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
      .replace(/(^|[\s(>])_([^_\n]+)_(?=$|[\s).,!?<])/g, '$1<i>$2</i>').replace(/\n/g, '<br>');
  }
  const title = id => (byId[id] ? byId[id].title : 'a definir');

  /* ordem: principal e depois subfluxos; dentro, por linha (grupo) e posição */
  const scopes = [{ id: null, name: 'Fluxo principal' }].concat((flow.subflows || []).map(s => ({ id: s.id, name: 'Subfluxo: ' + s.name })));
  const ordered = [];
  scopes.forEach(sc => {
    const list = flow.nodes.filter(n => (n.subflow || null) === sc.id)
      .sort((a, b) => ((groups[a.group] || { i: 99 }).i - (groups[b.group] || { i: 99 }).i) || (a.y - b.y) || (a.x - b.x));
    if (list.length) ordered.push({ scope: sc, nodes: list });
  });

  function detail(n) {
    if (n.type === 'menu') return '<ul class="rv-opts">' + (n.options || []).map((o, i) => '<li>' + (i + 1) + '. <b>' + esc(o.label) + '</b> → ' + esc(title(o.next)) + '</li>').join('') + '</ul>';
    if (n.type === 'input') return '<ul class="rv-opts"><li>Resposta válida → <b>' + esc(title(n.next)) + '</b></li>' + (n.invalid ? '<li>Resposta inválida → <b>' + esc(title(n.invalid)) + '</b></li>' : '') + '</ul>';
    if (n.type === 'action') {
      const rows = (n.cases && n.cases.length ? n.cases.map(c => [c.label, c.next]) : [['Sucesso', n.onSuccess]]).concat([['Não encontrado ou erro', n.onFailure]]);
      return '<p class="rv-sys">O sistema ' + esc(n.system || '') + ' consulta: ' + esc(n.text || '') + '</p><ul class="rv-opts">' + rows.map(r => '<li>' + esc(r[0]) + ' → <b>' + esc(title(r[1])) + '</b></li>').join('') + '</ul>';
    }
    if (n.type === 'call') { const s = (flow.subflows || []).find(x => x.id === n.target); return '<p class="rv-sys">Executa o subfluxo <b>' + esc(s ? s.name : '') + '</b> e depois segue para <b>' + esc(title(n.next)) + '</b>.</p>'; }
    if (n.type === 'message' && n.next) return '<ul class="rv-opts"><li>Depois → <b>' + esc(title(n.next)) + '</b></li></ul>';
    return '';
  }

  function card(n, num) {
    const g = groups[n.group], it = state.items[n.id] || {};
    const showText = n.text && n.type !== 'action' && n.type !== 'call' && n.type !== 'return';
    return '<article class="rv-card' + (it.decision === 'approved' ? ' done-a' : it.decision === 'changes' ? ' done-c' : '') + '" data-node="' + esc(n.id) + '" style="--lc:var(--' + (g ? g.g.color : 'c0') + ')">' +
      '<div class="rv-h"><span class="rv-dot" aria-hidden="true"></span><span class="rv-n">' + num + '.</span><b>' + esc(n.title) + '</b><small>' + esc(TYPE[n.type] || '') + ' · hoje: ' + esc(STATUS[n.status] || '') + '</small><span class="rv-state">' + (it.decision === 'approved' ? 'Aprovado por você' : it.decision === 'changes' ? 'Ajuste pedido' : '') + '</span></div>' +
      (showText ? '<div class="rv-wa"><div class="rv-bub">' + fmt(n.text) + '</div></div>' : '') + detail(n) +
      '<div class="rv-dec"><button type="button" class="rv-btn ap" data-d="approved" aria-pressed="' + (it.decision === 'approved') + '">Aprovar</button>' +
      '<button type="button" class="rv-btn ch" data-d="changes" aria-pressed="' + (it.decision === 'changes') + '">Pedir ajuste</button>' +
      (opts.player ? '<button type="button" class="lk" data-sim="' + esc(n.id) + '">Simular a partir daqui</button>' : '') + '</div>' +
      '<textarea class="rv-cm" placeholder="Comentário (opcional ao aprovar, recomendado ao pedir ajuste)" aria-label="Comentário sobre ' + esc(n.title) + '">' + esc(it.comment || '') + '</textarea></article>';
  }

  let num = 0;
  root.innerHTML = '<header class="rv-top"><h1>' + esc(flow.meta.name) + '</h1><p>' + esc(flow.meta.description || '') + ' Leia cada passo, aprove ou peça ajuste. No fim, baixe suas respostas e envie o arquivo de volta.</p></header>' +
    '<div class="rv-bar"><label>Seu nome <input type="text" id="rv-name" value="' + esc(state.reviewer) + '" placeholder="Quem está revisando"></label>' +
    '<div class="rv-prog"><span id="rv-ptext"></span><div class="rv-meter"><i class="a"></i><i class="c"></i></div></div>' +
    '<button type="button" class="rv-btn primary" id="rv-dl">Baixar minhas respostas (.json)</button></div>' +
    '<div class="rv-main"><main>' + ordered.map(sec => {
      let lastG = '__';
      return '<div class="rv-scope">' + esc(sec.scope.name) + '</div>' + sec.nodes.map(n => {
        let h = '';
        if ((n.group || '') !== lastG) {
          lastG = n.group || '';
          const g = groups[n.group];
          if (g) h += '<div class="rv-lane" style="--lc:var(--' + g.g.color + ')"><span class="rv-rd">' + (g.i + 1) + '</span>' + esc(g.g.name) + '</div>';
        }
        return h + card(n, ++num);
      }).join('');
    }).join('') + '</main>' +
    (opts.player ? '<aside class="rv-sim"><h2>Testar a conversa</h2><div class="ph" id="rv-phone"></div></aside>' : '') + '</div>' +
    '<div class="rv-foot">Gerado com Chatbot Mapper. Suas respostas ficam salvas neste navegador até você baixar o arquivo.</div><div class="rv-toast" id="rv-toast"></div>';

  const $ = s => root.querySelector(s);
  const total = flow.nodes.length;
  let player = null;
  if (opts.player) player = opts.player($('#rv-phone'), null);

  function toast(t) { const el = $('#rv-toast'); el.textContent = t; el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 2600); }
  function progress() {
    const v = Object.values(state.items), a = v.filter(x => x.decision === 'approved').length, c = v.filter(x => x.decision === 'changes').length;
    $('#rv-ptext').textContent = (a + c) + ' de ' + total + ' passos avaliados · ' + a + ' aprovados · ' + c + ' com ajuste';
    root.querySelector('.rv-meter .a').style.width = (a / total * 100) + '%';
    root.querySelector('.rv-meter .c').style.width = (c / total * 100) + '%';
  }
  progress();

  root.addEventListener('click', e => {
    const d = e.target.closest('[data-d]');
    if (d) {
      const art = d.closest('[data-node]'), id = art.dataset.node, it = state.items[id] = state.items[id] || {};
      it.decision = it.decision === d.dataset.d ? '' : d.dataset.d;
      art.querySelectorAll('[data-d]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === it.decision)));
      art.classList.toggle('done-a', it.decision === 'approved'); art.classList.toggle('done-c', it.decision === 'changes');
      art.querySelector('.rv-state').textContent = it.decision === 'approved' ? 'Aprovado por você' : it.decision === 'changes' ? 'Ajuste pedido' : '';
      if (it.decision === 'changes') art.querySelector('.rv-cm').focus();
      save(); progress();
      return;
    }
    const s = e.target.closest('[data-sim]');
    if (s && opts.player) { if (player) player.destroy(); player = opts.player($('#rv-phone'), s.dataset.sim); $('#rv-phone').scrollIntoView({ block: 'nearest' }); }
  });
  root.addEventListener('input', e => {
    if (e.target.id === 'rv-name') { state.reviewer = e.target.value; save(); return; }
    if (e.target.classList.contains('rv-cm')) { const id = e.target.closest('[data-node]').dataset.node; (state.items[id] = state.items[id] || {}).comment = e.target.value; save(); }
  });
  $('#rv-dl').addEventListener('click', () => {
    const name = $('#rv-name').value.trim();
    if (!name) { $('#rv-name').focus(); toast('Escreva seu nome antes de baixar as respostas.'); return; }
    const items = Object.keys(state.items).map(id => ({ node: id, decision: state.items[id].decision || '', comment: (state.items[id].comment || '').trim() }))
      .filter(x => x.decision || x.comment);
    if (!items.length) { toast('Avalie ao menos um passo antes de baixar.'); return; }
    const out = { schema: 'chatbot-mapper/review/1', flow: flow.meta.name, flowUpdatedAt: flow.meta.updatedAt, reviewer: name, at: new Date().toISOString(), items };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    a.download = (String(flow.meta.name || 'fluxo').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'fluxo') + '.respostas-' + name.split(' ')[0].toLowerCase() + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Respostas baixadas. Envie o arquivo de volta para quem montou o fluxo.');
  });
}

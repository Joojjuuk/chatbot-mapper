/* player.js — simulador de conversa (celular) que "roda" o fluxo.

   IMPORTANTE: ChatPlayer é uma função autossuficiente (nenhuma dependência externa).
   O exportador usa ChatPlayer.toString() para embutir o simulador num HTML único,
   então tudo o que ele precisa tem de ficar DENTRO desta função. O estilo fica em player-css.js.

   Uso: const p = ChatPlayer(elemento, fluxo, { delay: 600, showNodes: false, startAt: 'id-do-no', onNode: (id, no) => {} }); */
function ChatPlayer(root, flow, opts) {
  opts = opts || {};
  const DELAY = opts.delay == null ? 600 : opts.delay;
  const nodes = {};
  (flow.nodes || []).forEach(n => { nodes[n.id] = n; });
  const settings = flow.settings || {};
  const brand = (flow.meta && flow.meta.brand) || 'Atendimento';
  let vars = {}, waiting = null, token = 0, autoSteps = 0, timers = [];

  root.innerHTML = [
    '<div class="cp-phone">',
    '<div class="cp-head"><div class="cp-avatar"></div><div class="cp-who"><b></b><small>conta comercial · online</small></div>',
    '<button type="button" class="cp-ico cp-restart" title="Reiniciar conversa" aria-label="Reiniciar conversa">&#8635;</button></div>',
    '<div class="cp-chat" aria-live="polite"></div>',
    '<form class="cp-composer"><input type="text" autocomplete="off" placeholder="Mensagem" aria-label="Mensagem"><button type="submit" aria-label="Enviar">&#10148;</button></form>',
    '<div class="cp-sheet"><div class="cp-card"><div class="cp-card-h"><span></span><button type="button" aria-label="Fechar">&times;</button></div><div class="cp-rows"></div></div></div>',
    '</div>'
  ].join('');
  root.classList.add('cp-root');

  const $ = s => root.querySelector(s);
  const phone = $('.cp-phone'), chat = $('.cp-chat'), form = $('.cp-composer'), input = $('.cp-composer input');
  const sendBtn = $('.cp-composer button'), sheet = $('.cp-sheet');
  $('.cp-avatar').textContent = (String(brand).trim()[0] || 'B').toUpperCase();
  $('.cp-who b').textContent = brand;
  phone.classList.toggle('cp-show-nodes', !!opts.showNodes);

  /* ---------- utilidades ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const chars = s => Array.from(String(s == null ? '' : s)).length;
  const pad = n => (n < 10 ? '0' : '') + n;
  const clock = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const scroll = () => { chat.scrollTop = chat.scrollHeight; };
  const wait = ms => new Promise(res => { timers.push(setTimeout(res, ms)); });
  const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  /* Formatação estilo WhatsApp (*negrito*, _itálico_, ~riscado~) e variáveis {{nome}}. */
  function fmt(text) {
    let h = esc(text).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => (vars[k] != null ? esc(vars[k]) : '<span class="cp-ph">' + k + '</span>'));
    h = h.replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
      .replace(/(^|[\s(>])_([^_\n]+)_(?=$|[\s).,!?<])/g, '$1<i>$2</i>')
      .replace(/~([^~\n]+)~/g, '<s>$1</s>')
      .replace(/\n/g, '<br>');
    return h;
  }

  function validCNPJ(s) {
    s = s.replace(/\D/g, '');
    if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false;
    const calc = len => {
      let sum = 0, pos = len - 7;
      for (let i = len; i >= 1; i--) { sum += +s[len - i] * pos--; if (pos < 2) pos = 9; }
      const r = sum % 11; return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === +s[12] && calc(13) === +s[13];
  }
  function validCPF(s) {
    s = s.replace(/\D/g, '');
    if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
    const calc = len => { let sum = 0; for (let i = 0; i < len; i++) sum += +s[i] * (len + 1 - i); const r = (sum * 10) % 11; return r === 10 ? 0 : r; };
    return calc(9) === +s[9] && calc(10) === +s[10];
  }
  function valid(kind, v) {
    switch (kind) {
      case 'number': return /^\d+$/.test(v.trim());
      case 'cnpj': return validCNPJ(v);
      case 'cpf': return validCPF(v);
      case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
      default: return true;
    }
  }

  /* Mesma regra de Meta.menuKind (botões até 3 opções curtas; senão lista). */
  function menuKind(n, options) {
    if (n.menuStyle === 'list') return 'list';
    if (n.menuStyle === 'buttons') return options.length <= 3 ? 'buttons' : 'list';
    return options.length <= 3 && options.every(o => !o.description && chars(o.label) <= 20) ? 'buttons' : 'list';
  }

  /* ---------- interface ---------- */
  function addBubble(kind, html, tagTitle, extra) {
    extra = extra || {};
    const wrap = document.createElement('div');
    wrap.className = 'cp-msg cp-' + kind;
    wrap.innerHTML = '<div class="cp-b">' +
      (tagTitle ? '<div class="cp-tag">' + esc(tagTitle) + '</div>' : '') +
      (extra.header ? '<div class="cp-hd">' + esc(extra.header) + '</div>' : '') +
      '<div class="cp-t">' + html + '</div>' +
      (extra.footer ? '<div class="cp-ft">' + esc(extra.footer) + '</div>' : '') +
      '<span class="cp-time">' + clock() + (kind === 'user' ? ' &#10003;&#10003;' : '') + '</span></div>';
    chat.appendChild(wrap); scroll();
    return wrap;
  }

  function note(text, cls) {
    const d = document.createElement('div');
    d.className = 'cp-note' + (cls ? ' cp-' + cls : '');
    d.textContent = text;
    chat.appendChild(d); scroll();
    return d;
  }

  async function bot(node, html, extra) {
    const my = token;
    if (DELAY > 0) {
      const t = document.createElement('div');
      t.className = 'cp-typing'; t.innerHTML = '<i></i><i></i><i></i>';
      chat.appendChild(t); scroll();
      await wait(DELAY);
      t.remove();
    } else await wait(0);
    if (my !== token) return null;
    return addBubble('bot', html, node && node.title, extra);
  }

  function setComposer(enabled, placeholder) {
    input.disabled = !enabled; sendBtn.disabled = !enabled;
    input.placeholder = enabled ? (placeholder || 'Mensagem') : 'Aguarde…';
    if (enabled) { try { input.focus({ preventScroll: true }); } catch (e) { /* ignora */ } }
  }

  function mkButton(cls, label, onclick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.textContent = label; b.addEventListener('click', onclick);
    return b;
  }

  /* ---------- execução do fluxo ---------- */
  async function go(id) {
    const my = token;
    if (++autoSteps > 60) { note('Fluxo interrompido: muitos passos seguidos sem resposta do cliente (possível laço).', 'warn'); return; }
    const n = nodes[id];
    if (!n) { note('Destino não encontrado no fluxo.', 'warn'); return; }
    waiting = null; setComposer(false);
    if (opts.onNode) opts.onNode(id, n);

    if (n.type === 'message') {
      await bot(n, fmt(n.text)); if (my !== token) return;
      if (n.next) return go(n.next);
      note('Fim do caminho: este passo não tem próximo nó.', 'end');
      return;
    }
    if (n.type === 'menu') return showMenu(n, my);
    if (n.type === 'input') {
      const b = await bot(n, fmt(n.text)); if (!b || my !== token) return;
      waiting = { type: 'input', node: n };
      setComposer(true, n.example ? 'ex.: ' + n.example : 'Digite sua resposta');
      return;
    }
    if (n.type === 'action') return showAction(n);
    if (n.type === 'handoff') {
      if (n.text) { await bot(n, fmt(n.text)); if (my !== token) return; }
      note('👤 Conversa transferida para um atendente humano', 'end');
      return;
    }
    if (n.type === 'end') {
      if (n.text) { await bot(n, fmt(n.text)); if (my !== token) return; }
      note('Conversa encerrada. Toque em ↻ para recomeçar.', 'end');
    }
  }

  async function showMenu(n, my) {
    const options = n.options || [];
    const wrap = await bot(n, fmt(n.text), { header: n.header, footer: n.footer });
    if (!wrap || my !== token) return;
    if (!options.length) { note('Este menu não tem opções.', 'warn'); return; }
    const kind = menuKind(n, options);
    const group = document.createElement('div');
    group.className = 'cp-btns'; wrap.appendChild(group);
    const ctx = { type: 'menu', node: n, wrap, kind, buttons: [] };
    if (kind === 'buttons') {
      options.forEach((o, i) => { const b = mkButton('cp-btn', o.label, () => pick(ctx, i)); group.appendChild(b); ctx.buttons.push(b); });
    } else {
      group.appendChild(mkButton('cp-btn', '☰  ' + (n.listButton || 'Ver opções'), () => openSheet(ctx)));
    }
    waiting = ctx;
    setComposer(true, 'Escolha uma opção');
  }

  function pick(ctx, i, fromText) {
    if (waiting !== ctx) return;
    const o = ctx.node.options[i];
    closeSheet();
    ctx.wrap.classList.add('cp-used');
    if (ctx.buttons[i]) ctx.buttons[i].classList.add('cp-chosen');
    waiting = null; setComposer(false); autoSteps = 0;
    if (!fromText) addBubble('user', esc(o.label));
    if (o.next) go(o.next); else note('Esta opção ainda não tem destino no fluxo.', 'warn');
  }

  function showAction(n) {
    note('⚙ ' + (n.system ? n.system + ' · ' : '') + (n.text || 'Consulta ao sistema'));
    const sim = document.createElement('div');
    sim.className = 'cp-sim';
    sim.appendChild(Object.assign(document.createElement('span'), { textContent: 'Simular resultado:' }));
    [['✓ Sucesso', 'cp-chip cp-ok', 'onSuccess'], ['✗ Falha', 'cp-chip cp-fail', 'onFailure']].forEach(([label, cls, key]) => {
      const chip = mkButton(cls, label, () => {
        if (sim.classList.contains('cp-used')) return;
        chip.classList.add('cp-chosen');
        sim.classList.add('cp-used'); waiting = null; setComposer(false); autoSteps = 0;
        if (n[key]) go(n[key]); else note('Sem destino definido para este resultado.', 'warn');
      });
      sim.appendChild(chip);
    });
    chat.appendChild(sim); scroll();
    waiting = { type: 'action', node: n };
    setComposer(false);
    input.placeholder = 'Escolha o resultado simulado';
  }

  function openSheet(ctx) {
    if (waiting !== ctx) return;
    $('.cp-card-h span').textContent = ctx.node.listButton || 'Opções';
    const rows = $('.cp-rows');
    rows.innerHTML = '';
    ctx.node.options.forEach((o, i) => {
      const r = document.createElement('button');
      r.type = 'button'; r.className = 'cp-row';
      r.innerHTML = '<b>' + esc(o.label) + '</b>' + (o.description ? '<small>' + esc(o.description) + '</small>' : '');
      r.addEventListener('click', () => pick(ctx, i));
      rows.appendChild(r);
    });
    sheet.classList.add('cp-open');
  }
  function closeSheet() { sheet.classList.remove('cp-open'); }
  $('.cp-card-h button').addEventListener('click', closeSheet);
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });

  function matchOption(ctx, text) {
    const options = ctx.node.options || [];
    const t = norm(text);
    if (/^\d+$/.test(t)) { const i = parseInt(t, 10) - 1; if (i >= 0 && i < options.length) return i; }
    return options.findIndex(o => norm(o.label) === t);
  }

  async function fallback() {
    await bot(null, fmt(settings.fallbackText || 'Não entendi. Por favor, escolha uma das opções.'));
  }

  function handleText(v) {
    const w = waiting;
    autoSteps = 0;
    addBubble('user', esc(v));
    if (!w) return;
    if (w.type === 'menu') {
      const i = matchOption(w, v);
      if (i >= 0) pick(w, i, true); else fallback();
      return;
    }
    if (w.type === 'input') {
      const n = w.node;
      if (valid(n.validation, v)) {
        if (n.variable) vars[n.variable] = (n.validation === 'cnpj' || n.validation === 'cpf' || n.validation === 'number') ? v.replace(/\D/g, '') : v.trim();
        waiting = null; setComposer(false);
        if (n.next) go(n.next); else note('Este passo não tem próximo nó.', 'end');
      } else if (n.invalid) {
        waiting = null; setComposer(false); go(n.invalid);
      } else fallback();
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v || input.disabled) return;
    input.value = '';
    handleText(v);
  });

  function restart() {
    token++; timers.forEach(clearTimeout); timers = [];
    vars = {}; waiting = null; autoSteps = 0; closeSheet();
    chat.innerHTML = ''; setComposer(false);
    const start = opts.startAt || settings.startNode || (flow.nodes && flow.nodes[0] && flow.nodes[0].id);
    if (start) go(start); else note('O fluxo não tem nó inicial.', 'warn');
  }
  $('.cp-restart').addEventListener('click', restart);

  restart();

  return {
    restart,
    setShowNodes: on => phone.classList.toggle('cp-show-nodes', !!on),
    getVars: () => Object.assign({}, vars),
    destroy() { token++; timers.forEach(clearTimeout); root.innerHTML = ''; }
  };
}

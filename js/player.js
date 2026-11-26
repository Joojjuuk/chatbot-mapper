/* player.js — simulador de conversa (celular) que "roda" o fluxo.

   IMPORTANTE: ChatPlayer é uma função autossuficiente (nenhuma dependência externa).
   Os exportadores usam ChatPlayer.toString() para embutir o simulador num HTML único,
   então tudo o que ele precisa tem de ficar DENTRO desta função. O estilo fica em player-css.js.

   Uso: const p = ChatPlayer(elemento, fluxo, {
     delay: 600, showNodes: false, startAt: 'id',
     values: { previsao: '25/11' },          // valores da persona (exemplo das variáveis)
     onNode: (id, no) => {},                  // passo em que a conversa está
     onChoice: ({node, port, text}) => {},    // escolha do cliente (para gravar cenários)
     script: [{node, port, text}],            // toca um cenário sozinho
     onScriptEnd: (ok, motivo) => {}
   }); */
function ChatPlayer(root, flow, opts) {
  opts = opts || {};
  const DELAY = opts.delay == null ? 600 : opts.delay;
  const nodes = {};
  (flow.nodes || []).forEach(n => { nodes[n.id] = n; });
  const subflows = {};
  (flow.subflows || []).forEach(s => { subflows[s.id] = s; });
  const settings = flow.settings || {};
  const sample = opts.values || settings.sample || {}; // valores de exemplo para as variáveis (só para demonstração)
  const brand = (flow.meta && flow.meta.brand) || 'Atendimento';
  const script = opts.script ? opts.script.slice() : null;
  let vars = {}, waiting = null, token = 0, autoSteps = 0, timers = [], stack = [], si = 0;

  root.innerHTML = [
    '<div class="cp-phone">',
    '<div class="cp-head"><div class="cp-avatar"></div><div class="cp-who"><b></b><small>conta comercial · online</small></div>',
    '<button type="button" class="cp-ico cp-restart" title="Reiniciar conversa" aria-label="Reiniciar conversa"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/></svg></button></div>',
    '<div class="cp-chat" aria-live="polite"></div>',
    '<form class="cp-composer"><input type="text" autocomplete="off" placeholder="Mensagem" aria-label="Mensagem"><button type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg></button></form>',
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
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const emit = (node, port, text) => { if (opts.onChoice) opts.onChoice(text == null ? { node: node.id, port } : { node: node.id, port, text }); };

  /* Formatação estilo WhatsApp (*negrito*, _itálico_, ~riscado~) e variáveis {{nome}}. */
  function fmt(text) {
    let h = esc(text).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => (vars[k] != null ? esc(vars[k]) : (sample[k] != null && sample[k] !== '' ? '<span class="cp-sm">' + esc(sample[k]) + '</span>' : '<span class="cp-ph">' + k + '</span>')));
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
    const ae = document.activeElement;
    if (enabled && !script && (!ae || ae === document.body || root.contains(ae))) { try { input.focus({ preventScroll: true }); } catch (e) { /* ignora */ } }
  }

  function mkButton(cls, label, onclick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.textContent = label; b.addEventListener('click', onclick);
    return b;
  }

  /* ---------- cenário tocado sozinho ---------- */
  function scriptEnd(ok, why) {
    if (!script || script.done) return;
    script.done = true;
    if (!ok) note('Cenário divergiu: ' + why, 'warn');
    else note('Cenário concluído.', 'end');
    if (opts.onScriptEnd) opts.onScriptEnd(ok, why || '');
  }
  function autoplay(node, act) {
    if (!script || script.done) return;
    const step = script[si];
    if (!step) { scriptEnd(true); return; }
    if (step.node !== node.id) { scriptEnd(false, 'esperava "' + ((nodes[step.node] || {}).title || step.node) + '", mas a conversa está em "' + node.title + '".'); return; }
    const my = token;
    timers.push(setTimeout(() => { if (my === token) { si++; act(step); } }, Math.max(450, DELAY * 1.2)));
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
      return finish('Fim do caminho: este passo não tem próximo.');
    }
    if (n.type === 'call') {
      const sf = subflows[n.target];
      if (!sf || !sf.start) { note('Este passo chama um subfluxo que não existe ou não tem início.', 'warn'); return; }
      if (stack.length >= 8) { note('Subfluxos encadeados demais (possível recursão).', 'warn'); return; }
      stack.push(n.next || null);
      note('Subfluxo: ' + sf.name, 'sf');
      return go(sf.start);
    }
    if (n.type === 'return') {
      if (!stack.length) return finish('Fim do subfluxo.');
      const back = stack.pop();
      if (back) return go(back);
      return finish('Fim do caminho: nada depois do subfluxo.');
    }
    if (n.type === 'menu') return showMenu(n, my);
    if (n.type === 'input') {
      const b = await bot(n, fmt(n.text)); if (!b || my !== token) return;
      waiting = { type: 'input', node: n };
      setComposer(true, n.example ? 'ex.: ' + n.example : 'Digite sua resposta');
      autoplay(n, step => { handleText(step.text || n.example || sample[n.variable] || '123', step.port); });
      return;
    }
    if (n.type === 'action') return showAction(n);
    if (n.type === 'handoff') {
      if (n.text) { await bot(n, fmt(n.text)); if (my !== token) return; }
      return finish('Conversa transferida para um atendente humano.');
    }
    if (n.type === 'end') {
      if (n.text) { await bot(n, fmt(n.text)); if (my !== token) return; }
      return finish('Conversa encerrada. Toque em reiniciar para recomeçar.');
    }
  }

  function finish(text) {
    note(text, 'end');
    if (script && !script.done) {
      if (si < script.length) scriptEnd(false, 'a conversa terminou antes do fim do cenário.');
      else scriptEnd(true);
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
      group.appendChild(mkButton('cp-btn cp-list', n.listButton || 'Ver opções', () => openSheet(ctx)));
    }
    waiting = ctx;
    setComposer(true, 'Escolha uma opção');
    autoplay(n, step => {
      const i = options.findIndex(o => 'opt:' + o.id === step.port);
      if (i < 0) scriptEnd(false, 'a opção do cenário não existe mais em "' + n.title + '".');
      else pick(ctx, i);
    });
  }

  function pick(ctx, i, fromText) {
    if (waiting !== ctx) return;
    const o = ctx.node.options[i];
    closeSheet();
    ctx.wrap.classList.add('cp-used');
    if (ctx.buttons[i]) ctx.buttons[i].classList.add('cp-chosen');
    waiting = null; setComposer(false); autoSteps = 0;
    if (!fromText) addBubble('user', esc(o.label));
    emit(ctx.node, 'opt:' + o.id);
    if (o.next) go(o.next); else note('Esta opção ainda não tem destino no fluxo.', 'warn');
  }

  function showAction(n) {
    const sysNote = note((n.system ? n.system + ' · ' : '') + (n.text || 'Consulta ao sistema'), 'sys');
    sysNote.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg> ');
    const sim = document.createElement('div');
    sim.className = 'cp-sim';
    const hasCases = n.cases && n.cases.length;
    sim.appendChild(Object.assign(document.createElement('span'), { textContent: hasCases ? 'Simular cenário:' : 'Simular resultado:' }));
    const results = hasCases
      ? n.cases.map(c => [c.label || 'Cenário', 'cp-chip cp-case', c.next, 'case:' + c.id]).concat([['Falha / não encontrado', 'cp-chip cp-fail', n.onFailure, 'failure']])
      : [['Sucesso', 'cp-chip cp-ok', n.onSuccess, 'success'], ['Falha', 'cp-chip cp-fail', n.onFailure, 'failure']];
    const chips = {};
    results.forEach(([label, cls, dest, port]) => {
      const chip = mkButton(cls, label, () => {
        if (sim.classList.contains('cp-used')) return;
        chip.classList.add('cp-chosen');
        sim.classList.add('cp-used'); waiting = null; setComposer(false); autoSteps = 0;
        emit(n, port);
        if (dest) go(dest); else note('Sem destino definido para este resultado.', 'warn');
      });
      chips[port] = chip;
      sim.appendChild(chip);
    });
    chat.appendChild(sim); scroll();
    waiting = { type: 'action', node: n };
    setComposer(false);
    input.placeholder = 'Escolha o resultado simulado';
    autoplay(n, step => { if (chips[step.port]) chips[step.port].click(); else scriptEnd(false, 'o resultado do cenário não existe mais em "' + n.title + '".'); });
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

  function handleText(v, forcedPort) {
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
      const ok = forcedPort ? forcedPort === 'next' : valid(n.validation, v);
      if (ok) {
        if (n.variable) vars[n.variable] = (n.validation === 'cnpj' || n.validation === 'cpf' || n.validation === 'number') ? v.replace(/\D/g, '') : v.trim();
        waiting = null; setComposer(false);
        emit(n, 'next', v);
        if (n.next) go(n.next); else note('Este passo não tem próximo nó.', 'end');
      } else if (n.invalid) {
        waiting = null; setComposer(false);
        emit(n, 'invalid', v);
        go(n.invalid);
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
    vars = {}; waiting = null; autoSteps = 0; stack = []; si = 0; closeSheet();
    if (script) script.done = false;
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

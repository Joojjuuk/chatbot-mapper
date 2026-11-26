/* search.js — busca de passos em todos os escopos (título, texto, opções, notas), sem acento e
   sem diferenciar maiúsculas. Teclado: / ou Ctrl+K abre, setas navegam, Enter vai, Esc fecha. */
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let input, list, onPick, results = [], cur = 0;

  function init(opts) {
    input = opts.input; list = opts.list; onPick = opts.onPick;
    input.addEventListener('input', update);
    input.addEventListener('focus', update);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(cur); }
      else if (e.key === 'Escape') { e.preventDefault(); input.value = ''; close(); input.blur(); }
    });
    input.addEventListener('blur', () => setTimeout(close, 150));
    list.addEventListener('mousedown', e => {
      const b = e.target.closest('[data-i]');
      if (b) { e.preventDefault(); pick(+b.dataset.i); }
    });
  }

  function highlight(text, q) {
    const words = Flow.fold(q).split(/\s+/).filter(Boolean);
    const folded = Flow.fold(text);
    let out = '', i = 0;
    const marks = [];
    words.forEach(w => { let at = folded.indexOf(w); if (at >= 0) marks.push([at, at + w.length]); });
    marks.sort((a, b) => a[0] - b[0]).forEach(([a, b]) => { if (a < i) return; out += esc(text.slice(i, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>'; i = b; });
    return out + esc(text.slice(i));
  }

  function snippet(n, q) {
    const t = [n.text, (n.options || []).map(o => o.label).join(' · '), (n.cases || []).map(c => c.label).join(' · '), n.notes].filter(Boolean).join(' — ').replace(/\s+/g, ' ');
    const at = Flow.fold(t).indexOf(Flow.fold(q).split(/\s+/)[0]);
    const s = at > 40 ? '…' + t.slice(at - 30) : t;
    return s.slice(0, 120);
  }

  function update() {
    const q = input.value.trim();
    if (!q) { close(); return; }
    const flow = Store.get();
    results = Flow.search(flow, q).slice(0, 12);
    cur = 0;
    const groups = {}; (flow.groups || []).forEach(g => { groups[g.id] = g; });
    list.innerHTML = results.length ? results.map((r, i) => {
      const n = r.node, g = groups[n.group];
      const where = [Flow.scopeName(flow, n.subflow), g ? g.name : '', Flow.TYPES[n.type].label].filter(Boolean).join(' · ');
      return '<button type="button" role="option" class="sr-item' + (i === cur ? ' on' : '') + '" data-i="' + i + '">' + Icons.mark(n.type === 'call' ? 'call' : n.status) +
        '<span><b>' + highlight(n.title, q) + '</b><small>' + esc(where) + '</small><small>' + highlight(snippet(n, q), q) + '</small></span></button>';
    }).join('') : '<div class="sr-empty">Nenhum passo com "' + esc(q) + '".</div>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function move(d) {
    if (!results.length) return;
    cur = (cur + d + results.length) % results.length;
    list.querySelectorAll('.sr-item').forEach((b, i) => b.classList.toggle('on', i === cur));
    const on = list.querySelector('.sr-item.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  }

  function pick(i) {
    const r = results[i];
    if (!r) return;
    close(); input.blur();
    onPick(r.node.id);
  }

  function close() { if (list) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); } }
  function focus() { input.focus(); input.select(); }

  root.Search = { init, focus, close };
})(window);

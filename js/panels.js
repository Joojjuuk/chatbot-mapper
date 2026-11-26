/* panels.js — abas Testes (cenários, cobertura, volume), Dados (personas e dicionário)
   e Revisão (pendências, revisão do cliente, versões e comparação, templates). */
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CALC_KEY = 'chatbot-mapper:calc';
  let els = {}, lastRun = null, coverageOn = false, diffState = null, lastImport = null;
  const sec = (title, extra) => '<h3 class="sec">' + title + (extra || '') + '</h3>';
  const dateBR = d => { try { return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const App = () => root.App;

  function init(o) {
    els = o;
    els.tests.addEventListener('click', onTestsClick);
    els.tests.addEventListener('input', onTestsInput);
    els.tests.addEventListener('change', onTestsChange);
    els.data.addEventListener('click', onDataClick);
    els.data.addEventListener('input', onDataInput);
    els.data.addEventListener('change', onDataChange);
    els.review.addEventListener('click', onReviewClick);
  }

  function render(which) {
    if (!Store.get()) return;
    if (!which || which === 'tests') renderTests();
    if (!which || which === 'data') renderData();
    if (!which || which === 'review') renderReview();
  }

  /* ================= TESTES ================= */
  function runAll() {
    const flow = Store.get();
    const res = {};
    Analysis.runAll(flow).forEach(r => { res[r.test.id] = r.result; });
    lastRun = { at: new Date(), updatedAt: flow.meta.updatedAt, res };
    renderTests();
    badge();
    return res;
  }

  function badge() {
    const b = document.getElementById('tests-badge');
    if (!b) return;
    if (!lastRun) { b.hidden = true; return; }
    const fails = Object.values(lastRun.res).filter(r => !r.ok).length;
    b.hidden = false; b.textContent = fails ? fails : '✓';
    b.className = 'badge ' + (fails ? 'err' : 'ok');
    b.title = fails ? fails + ' cenário(s) falhando' : 'Todos os cenários passaram';
  }

  function calc() { try { return JSON.parse(localStorage.getItem(CALC_KEY) || '{}'); } catch (e) { return {}; } }

  function renderTests() {
    const flow = Store.get(), m = Flow.map(flow), tests = flow.tests || [];
    const stale = lastRun && lastRun.updatedAt !== flow.meta.updatedAt;
    let h = sec('Cenários de teste', '<span class="count">' + tests.length + '</span>' + (tests.length ? '<button type="button" class="btn sm primary sec-act" data-act="runall">' + Icons.get('play') + 'Rodar todos</button>' : ''));
    if (lastRun && tests.length) {
      const fails = tests.filter(t => lastRun.res[t.id] && !lastRun.res[t.id].ok).length, ran = tests.filter(t => lastRun.res[t.id]).length;
      h += fails ? '<ul class="issues"><li class="error">' + Icons.get('error') + '<span><b>' + fails + ' de ' + ran + ' falharam.</b> Veja o motivo em cada cenário.</span></li></ul>'
        : '<div class="ok-box" style="margin-bottom:10px">' + Icons.get('check') + ran + ' de ' + ran + ' passaram · ' + dateBR(lastRun.at) + '</div>';
      if (stale) h += '<button type="button" class="stale" data-act="runall" style="width:100%">O fluxo mudou desde a última execução. Rodar de novo.</button>';
    }
    if (!tests.length) {
      h += '<div class="tips">Na aba <b>Simular</b>, clique em <b>Gravar</b>, faça a conversa e salve. O cenário guarda cada escolha e roda com um clique: serve para a demo e para checar se nada quebrou depois de uma mudança.<div class="btn-row"><button type="button" class="btn sm" data-act="gosim">' + Icons.get('record') + 'Gravar um cenário</button></div></div>';
    } else {
      h += '<div class="list">' + tests.map(t => {
        const r = lastRun && lastRun.res[t.id];
        const st = !r ? 'idle' : r.ok ? 'pass' : 'fail';
        const persona = (flow.personas || []).find(p => p.id === t.persona);
        const msgs = r ? r.messages : Analysis.runTest(flow, t).messages;
        return '<div class="t-row" data-test="' + esc(t.id) + '"><span class="t-st ' + st + '" title="' + (st === 'pass' ? 'Passou' : st === 'fail' ? 'Falhou' : 'Ainda não rodou') + '">' + (st === 'pass' ? Icons.get('check') : st === 'fail' ? Icons.get('x') : '') + '</span>' +
          '<div><input class="t-name" data-tname="' + esc(t.id) + '" value="' + esc(t.name) + '" aria-label="Nome do cenário">' +
          '<div class="t-meta">' + t.steps.length + ' escolhas · ' + msgs + ' mensagens do bot' + (persona ? ' · ' + esc(persona.name) : '') + (t.expectEnd && m[t.expectEnd] ? ' · termina em ' + esc(m[t.expectEnd].title) : '') + '</div>' +
          (r && !r.ok ? '<div class="t-why">' + esc(r.reason) + (r.at && m[r.at] ? ' <button type="button" class="linkbtn" data-act="goto" data-id="' + esc(r.at) + '">Ver no mapa</button>' : '') + '</div>' : '') + '</div>' +
          '<div class="t-acts"><button type="button" class="ico-btn" data-act="play" title="Tocar no simulador" aria-label="Tocar no simulador">' + Icons.get('phone') + '</button>' +
          '<button type="button" class="ico-btn" data-act="run" title="Rodar este cenário" aria-label="Rodar">' + Icons.get('play') + '</button>' +
          '<button type="button" class="ico-btn" data-act="deltest" title="Excluir" aria-label="Excluir cenário">' + Icons.get('trash') + '</button></div></div>';
      }).join('') + '</div>';
    }

    const cov = tests.length ? Analysis.coverage(flow) : { unvisited: flow.nodes.map(n => n.id) };
    h += sec('Cobertura', '<span class="count">' + (flow.nodes.length - cov.unvisited.length) + ' de ' + flow.nodes.length + '</span>');
    h += '<label class="chk"><input type="checkbox" data-act="coverage"' + (coverageOn ? ' checked' : '') + '> Marcar no mapa os ' + cov.unvisited.length + ' passos que nenhum cenário visita</label>';
    if (cov.unvisited.length && tests.length) h += '<div class="list">' + cov.unvisited.slice(0, 8).map(id => '<div class="li">' + Icons.mark(m[id].status) + '<div class="grow"><b>' + esc(m[id].title) + '</b><small>' + esc(Flow.scopeName(flow, m[id].subflow)) + '</small></div><button type="button" class="btn sm" data-act="goto" data-id="' + esc(id) + '">Ver</button></div>').join('') +
      (cov.unvisited.length > 8 ? '<div class="li"><small>e mais ' + (cov.unvisited.length - 8) + '</small></div>' : '') + '</div>';

    const v = Analysis.volume(flow), c = calc();
    h += sec('Volume de mensagens');
    h += '<div class="kpis"><div class="kpi"><b>' + v.min + '</b><small>mínimo por conversa</small></div><div class="kpi"><b>' + v.avg.toLocaleString('pt-BR') + '</b><small>média dos caminhos</small></div><div class="kpi"><b>' + v.max + '</b><small>máximo</small></div></div>';
    h += '<small class="hint" style="margin-bottom:12px">Mensagens enviadas pelo bot em ' + v.paths + ' caminhos possíveis' + (v.truncated ? ' (enumeração parou em 2.000)' : '') + '. Cada passo conta no máximo duas vezes por caminho.' + (v.templates ? ' Caminho com mais templates: ' + v.templates + '.' : '') + '</small>';
    h += '<div class="calc"><label class="fld" style="margin:0"><span class="fld-l">Conversas por mês</span><input type="number" min="0" step="100" data-calc="conv" value="' + esc(c.conv || '') + '" placeholder="ex.: 3000"></label>' +
      '<label class="fld" style="margin:0"><span class="fld-l">Mensagens no pacote</span><input type="number" min="0" step="1000" data-calc="pack" value="' + esc(c.pack || '') + '" placeholder="ex.: 20000"></label>' +
      '<div class="calc-out" id="calc-out"></div></div>';
    els.tests.innerHTML = h;
    renderCalc(v);
  }

  function renderCalc(v) {
    v = v || Analysis.volume(Store.get());
    const c = calc(), out = els.tests.querySelector('#calc-out');
    if (!out) return;
    const conv = +c.conv || 0, pack = +c.pack || 0;
    if (!conv) { out.innerHTML = 'Informe as conversas por mês para estimar o volume.'; return; }
    const avg = Math.round(conv * v.avg), max = conv * v.max;
    const fmt = n => n.toLocaleString('pt-BR');
    let h = '≈ <b>' + fmt(avg) + '</b> mensagens/mês na média · até <b>' + fmt(max) + '</b> se todos fizerem o caminho mais longo.';
    if (pack) {
      const pct = Math.round(avg / pack * 100);
      h += '<div class="meter' + (pct > 100 ? ' over' : '') + '" role="img" aria-label="' + pct + '% do pacote"><i style="width:' + Math.min(100, pct) + '%"></i></div><small>' + pct + '% do pacote de ' + fmt(pack) + (pct > 100 ? '. Acima do pacote.' : '.') + '</small>';
    }
    out.innerHTML = h;
  }

  function onTestsInput(e) {
    const t = e.target;
    if (t.dataset.tname) {
      const f = Store.get(), test = f.tests.find(x => x.id === t.dataset.tname);
      Store.update(() => { test.name = t.value; }, { source: 'panels', coalesce: 'tn:' + test.id });
    } else if (t.dataset.calc) {
      const c = calc(); c[t.dataset.calc] = t.value;
      try { localStorage.setItem(CALC_KEY, JSON.stringify(c)); } catch (err) { /* ignora */ }
      renderCalc();
    }
  }
  function onTestsChange(e) {
    if (e.target.dataset.act === 'coverage') { coverageOn = e.target.checked; App().refreshOverlay(); }
  }
  function onTestsClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    const row = b.closest('[data-test]'), flow = Store.get();
    const test = row && flow.tests.find(t => t.id === row.dataset.test);
    const act = b.dataset.act;
    if (act === 'runall') { runAll(); App().refreshOverlay(); }
    else if (act === 'run' && test) {
      const r = Analysis.runTest(flow, test);
      lastRun = lastRun || { at: new Date(), updatedAt: flow.meta.updatedAt, res: {} };
      lastRun.res[test.id] = r; lastRun.at = new Date(); lastRun.updatedAt = flow.meta.updatedAt;
      renderTests(); badge();
      App().toast(r.ok ? 'Cenário "' + test.name + '" passou.' : 'Falhou: ' + r.reason);
    }
    else if (act === 'play' && test) App().playTest(test);
    else if (act === 'deltest' && test) {
      Store.update(f => { f.tests = f.tests.filter(t => t.id !== test.id); }, { source: 'panels' });
      if (lastRun) delete lastRun.res[test.id];
      App().toast('Cenário excluído', { label: 'Desfazer', run: () => Store.undo() });
    }
    else if (act === 'goto') App().goToNode(b.dataset.id);
    else if (act === 'gosim') App().setTab('sim');
  }

  /* ================= DADOS ================= */
  function allVarNames(flow) {
    const names = (flow.variables || []).map(v => v.name);
    Object.keys(Flow.discoverVariables(flow).used).forEach(k => { if (names.indexOf(k) < 0) names.push(k); });
    return names;
  }

  function renderData() {
    const flow = Store.get(), m = Flow.map(flow), info = Flow.discoverVariables(flow), personas = flow.personas || [];
    let h = sec('Personas', '<span class="count">' + personas.length + '</span><button type="button" class="btn sm sec-act" data-act="addpersona">' + Icons.get('plus') + 'Persona</button>');
    h += '<small class="hint" style="margin:-4px 0 10px">Cada persona tem seus valores de exemplo. A persona ativa preenche as variáveis no simulador e nos arquivos para o cliente.</small>';
    const names = allVarNames(flow);
    if (!personas.length) h += '<div class="empty">Nenhuma persona ainda. Crie uma (ex.: "Cliente — Hospital", "Vendedor") para a demo mudar os textos sozinha.</div>';
    else {
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Variável</th>' + personas.map(p =>
        '<th><div class="p-head"><input type="text" data-pname="' + esc(p.id) + '" value="' + esc(p.name) + '" aria-label="Nome da persona"><button type="button" class="ico-btn" data-act="delpersona" data-p="' + esc(p.id) + '" title="Excluir persona" aria-label="Excluir persona">' + Icons.get('x') + '</button></div>' +
        '<label class="p-use"><input type="radio" name="persona-active" data-pact="' + esc(p.id) + '"' + (flow.settings.persona === p.id ? ' checked' : '') + '> Usar no simulador</label></th>').join('') + '</tr></thead><tbody>' +
        (names.length ? names.map(v => '<tr><td class="v">' + esc(v) + '</td>' + personas.map(p => '<td><input type="text" data-pval="' + esc(p.id) + '" data-var="' + esc(v) + '" value="' + esc(p.values[v] || '') + '" aria-label="' + esc(v) + ' para ' + esc(p.name) + '"></td>').join('') + '</tr>').join('')
          : '<tr><td colspan="' + (personas.length + 1) + '">Nenhuma variável no fluxo. Use {{nome}} nos textos.</td></tr>') + '</tbody></table></div>';
    }

    h += sec('Dicionário de dados', '<span class="count">' + flow.variables.length + '</span><button type="button" class="btn sm sec-act" data-act="addvar">' + Icons.get('plus') + 'Variável</button>');
    if (info.undefined.length) {
      h += '<ul class="issues"><li class="warn">' + Icons.get('warn') + '<span><b>' + info.undefined.length + ' variáveis usadas sem definição:</b> ' + info.undefined.map(v => '<code>' + esc(v) + '</code>').join(', ') +
        '. <button type="button" class="linkbtn" data-act="defineall">Adicionar ao dicionário</button></span></li></ul>';
    }
    if (!flow.variables.length) h += '<div class="empty">Ligue cada variável ({{previsao}}, {{nf}}) ao sistema e campo de origem e à regra de cálculo. É o que o desenvolvimento mais pergunta.</div>';
    h += flow.variables.map((v, i) => {
      const used = info.used[v.name] || [];
      return '<div class="var-card' + (used.length ? '' : ' warn') + '" data-vi="' + i + '"><div class="var-top"><code>{{' + esc(v.name) + '}}</code>' + (used.length ? '' : '<span class="b b-warn">não usada</span>') +
        '<span style="flex:1"></span><button type="button" class="ico-btn" data-act="delvar" data-i="' + i + '" title="Remover do dicionário">' + Icons.get('trash') + '</button></div>' +
        '<div class="var-grid">' +
        '<label>Nome<input class="inp mono" data-vf="name" data-i="' + i + '" value="' + esc(v.name) + '"></label>' +
        '<label>Rótulo<input class="inp" data-vf="label" data-i="' + i + '" value="' + esc(v.label) + '" placeholder="Previsão de entrega"></label>' +
        '<label>Origem (sistema)<input class="inp" data-vf="source" data-i="' + i + '" value="' + esc(v.source) + '" placeholder="ERP"></label>' +
        '<label>Campo<input class="inp mono" data-vf="field" data-i="' + i + '" value="' + esc(v.field) + '" placeholder="tabela.coluna"></label>' +
        '<label class="full">Regra de cálculo<input class="inp" data-vf="rule" data-i="' + i + '" value="' + esc(v.rule) + '" placeholder="Como o valor é obtido ou calculado"></label>' +
        '<label>Tipo<select class="inp" data-vf="type" data-i="' + i + '">' + Object.keys(Flow.VAR_TYPES).map(k => '<option value="' + k + '"' + (v.type === k ? ' selected' : '') + '>' + Flow.VAR_TYPES[k] + '</option>').join('') + '</select></label>' +
        '<label>Exemplo<input class="inp" data-vf="example" data-i="' + i + '" value="' + esc(v.example) + '"></label></div>' +
        '<div class="var-used">' + (used.length ? 'Usada em: ' + used.map(id => '<button type="button" class="linkbtn" data-act="goto" data-id="' + esc(id) + '">' + esc(m[id] ? m[id].title : id) + '</button>').join(', ') : 'Nenhum passo usa esta variável.') + '</div></div>';
    }).join('');
    els.data.innerHTML = h;
  }

  function onDataInput(e) {
    const t = e.target, f = Store.get();
    if (t.dataset.pname) { const p = f.personas.find(x => x.id === t.dataset.pname); Store.update(() => { p.name = t.value; }, { source: 'panels', coalesce: 'pn:' + p.id }); }
    else if (t.dataset.pval) { const p = f.personas.find(x => x.id === t.dataset.pval); Store.update(() => { p.values[t.dataset.var] = t.value; }, { source: 'panels', coalesce: 'pv:' + p.id + ':' + t.dataset.var }); }
    else if (t.dataset.vf && t.tagName === 'INPUT') {
      const v = f.variables[+t.dataset.i];
      if (t.dataset.vf === 'name') {
        const ok = Flow.validVarName(t.value) && !f.variables.some((x, j) => j !== +t.dataset.i && x.name === t.value);
        t.classList.toggle('bad', !ok);
        t.title = ok ? '' : 'Use letras sem acento, números, _ ou . e não repita um nome existente.';
        if (!ok) return;
      }
      Store.update(() => { v[t.dataset.vf] = t.value; }, { source: 'panels', coalesce: 'vf:' + t.dataset.i + ':' + t.dataset.vf });
    }
  }
  function onDataChange(e) {
    const t = e.target;
    if (t.dataset.pact) { Store.update(f => { f.settings.persona = t.dataset.pact; }, { source: 'panels' }); App().syncPersona(); }
    else if (t.dataset.vf === 'type') { Store.update(f => { f.variables[+t.dataset.i].type = t.value; }, { source: 'panels' }); }
    else if (t.dataset.vf === 'name') renderData();
  }
  function onDataClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    const act = b.dataset.act;
    if (act === 'addpersona') {
      Store.update(f => {
        const id = Flow.uid(new Set(f.personas.map(p => p.id)), 'p');
        const base = f.personas[0] ? Object.assign({}, f.personas[0].values) : {};
        f.personas.push({ id, name: 'Persona ' + (f.personas.length + 1), values: base });
        if (!f.settings.persona) f.settings.persona = id;
      }, { source: 'panels' });
      renderData(); App().syncPersona();
    } else if (act === 'delpersona') {
      Store.update(f => { f.personas = f.personas.filter(p => p.id !== b.dataset.p); if (f.settings.persona === b.dataset.p) f.settings.persona = f.personas[0] ? f.personas[0].id : null; }, { source: 'panels' });
      renderData(); App().syncPersona();
    } else if (act === 'addvar') {
      Store.update(f => { let i = 1; while (f.variables.some(v => v.name === 'variavel_' + i)) i++; f.variables.push({ name: 'variavel_' + i, label: '', source: '', field: '', rule: '', type: 'texto', example: '' }); }, { source: 'panels' });
      renderData();
      const cards = els.data.querySelectorAll('.var-card'); if (cards.length) { const inp = cards[cards.length - 1].querySelector('[data-vf="name"]'); inp.focus(); inp.select(); }
    } else if (act === 'defineall') {
      Store.update(f => { Flow.discoverVariables(f).undefined.forEach(name => { const ex = Flow.personaValues(f)[name] || ''; f.variables.push({ name, label: '', source: '', field: '', rule: '', type: 'texto', example: ex }); }); }, { source: 'panels' });
      renderData();
    } else if (act === 'delvar') { Store.update(f => { f.variables.splice(+b.dataset.i, 1); }, { source: 'panels' }); renderData(); }
    else if (act === 'goto') App().goToNode(b.dataset.id);
  }

  /* ================= REVISÃO ================= */
  function renderReview() {
    const flow = Store.get(), m = Flow.map(flow);
    const issues = Flow.lint(flow, Meta);
    const errs = issues.filter(i => i.severity === 'error'), warns = issues.filter(i => i.severity === 'warn');
    const rows = Analysis.openQuestions(flow, issues);
    const by = k => rows.filter(r => r.kind === k);
    const li = (cls, icon, nodeId, title, text) => '<li class="' + cls + '"' + (nodeId ? ' data-node="' + esc(nodeId) + '"' : '') + '>' + Icons.get(icon) + '<span>' + (title ? '<b>' + esc(title) + '</b> ' : '') + esc(text) + '</span></li>';

    let h = sec('Pendências', '<span class="count">' + rows.length + '</span>');
    h += '<div class="btn-row"><button type="button" class="btn sm" data-act="copytable">' + Icons.get('table') + 'Copiar tabela para e-mail</button>' +
      '<button type="button" class="btn sm" data-act="csv">' + Icons.get('download') + '.csv</button><button type="button" class="btn sm" data-act="pendmd">' + Icons.get('download') + '.md</button></div>';
    if (!errs.length && !warns.length) h += '<div class="ok-box" style="margin:8px 0 12px">' + Icons.get('check') + 'Sem erros nem avisos de estrutura e das regras do WhatsApp.</div>';
    if (errs.length) h += '<h4 class="pend-kind">Erros · ' + errs.length + '</h4><ul class="issues clickable">' + errs.map(i => li('error', 'error', i.nodeId, m[i.nodeId] && m[i.nodeId].title, i.message)).join('') + '</ul>';
    if (warns.length) h += '<h4 class="pend-kind">Avisos · ' + warns.length + '</h4><ul class="issues clickable">' + warns.map(i => li('warn', 'warn', i.nodeId, m[i.nodeId] && m[i.nodeId].title, i.message)).join('') + '</ul>';
    const q = by('Pergunta em aberto'), c = by('Comentário'), t = by('A definir');
    if (q.length) h += '<h4 class="pend-kind">Perguntas em aberto · ' + q.length + '</h4><ul class="issues clickable">' + q.map(r => li('', 'question', r.nodeId, r.title, r.text)).join('') + '</ul>';
    if (c.length) h += '<h4 class="pend-kind">Comentários não resolvidos · ' + c.length + '</h4><ul class="issues clickable">' + c.map(r => li('', 'comment', r.nodeId, r.title, (r.who ? r.who + ': ' : '') + r.text)).join('') + '</ul>';
    if (t.length) h += '<h4 class="pend-kind">A definir · ' + t.length + '</h4><ul class="issues clickable">' + t.map(r => li('', 'edit', r.nodeId, r.title, Flow.scopeName(flow, m[r.nodeId] && m[r.nodeId].subflow))).join('') + '</ul>';

    h += sec('Revisão do cliente');
    h += '<small class="hint" style="margin:-4px 0 10px">Gera um arquivo .html em que o cliente só aprova ou pede ajuste em cada passo, sem editar. Ele devolve um .json com as respostas.</small>';
    h += '<div class="btn-row"><button type="button" class="btn sm primary" data-act="exportreview">' + Icons.get('download') + 'Gerar arquivo de revisão</button><button type="button" class="btn sm" data-act="importreview">' + Icons.get('upload') + 'Importar respostas…</button></div>';
    if (lastImport) h += '<div class="ok-box" style="margin-top:8px">' + Icons.get('check') + '<span>' + esc(lastImport.reviewer) + ': ' + lastImport.applied.length + ' passos atualizados' + (lastImport.skipped.length ? ' · ' + lastImport.skipped.length + ' ignorados (não existem mais)' : '') + '.</span></div>';

    const vs = Store.versions();
    h += sec('Versões e comparação', '<span class="count">' + vs.length + '</span>');
    h += '<div class="btn-row"><input type="text" class="inp" id="ver-name" placeholder="Nome da versão (ex.: v3 enviada ao cliente)" style="flex:1;min-width:0"><button type="button" class="btn sm" data-act="saveversion">' + Icons.get('save') + 'Salvar</button></div>';
    h += '<div class="btn-row"><button type="button" class="btn sm" data-act="comparefile">' + Icons.get('compare') + 'Comparar com um .json…</button></div>';
    if (vs.length) h += '<div class="list">' + vs.map(v => '<div class="li"><div class="grow"><b>' + esc(v.name) + '</b><small>' + esc(dateBR(v.at)) + ' · ' + v.flow.nodes.length + ' passos</small></div>' +
      '<button type="button" class="btn sm" data-act="comparever" data-v="' + esc(v.id) + '">Comparar</button><button type="button" class="ico-btn" data-act="delver" data-v="' + esc(v.id) + '" title="Excluir versão">' + Icons.get('trash') + '</button></div>').join('') + '</div>';
    if (diffState) {
      const d = diffState.diff;
      h += '<div class="diff-sec"><h4>' + Icons.get('compare') + 'Comparando com: ' + esc(diffState.name) + ' <button type="button" class="linkbtn" data-act="cleardiff" style="margin-left:auto">Limpar</button></h4>';
      if (d.same) h += '<div class="ok-box">' + Icons.get('check') + 'Nenhuma diferença nos passos.</div>';
      if (d.added.length) h += '<h4><span class="b b-new">' + d.added.length + ' entraram</span></h4><ul class="diff-list">' + d.added.map(x => '<li data-node="' + esc(x.id) + '">' + esc(x.title) + '</li>').join('') + '</ul>';
      if (d.changed.length) h += '<h4><span class="b b-chg">' + d.changed.length + ' mudaram</span></h4><ul class="diff-list">' + d.changed.map(x => '<li data-node="' + esc(x.id) + '">' + esc(x.title) + ' <small>· ' + esc(x.labels.join(', ')) + '</small></li>').join('') + '</ul>';
      if (d.removed.length) h += '<h4><span class="b b-err">' + d.removed.length + ' saíram</span></h4><ul class="diff-list">' + d.removed.map(x => '<li>' + esc(x.title) + '</li>').join('') + '</ul>';
      h += '</div>';
    }

    const tpl = flow.nodes.filter(n => n.type === 'message' && n.template && n.template.enabled);
    h += sec('Templates da Meta', '<span class="count">' + tpl.length + '</span>');
    h += tpl.length ? '<div class="list">' + tpl.map(n => '<div class="li">' + Icons.get('template') + '<div class="grow"><b>' + esc(n.template.name || '(sem nome)') + '</b><small>' + esc(n.title) + ' · ' + esc(Flow.TEMPLATE_CATEGORIES[n.template.category] || n.template.category) + ' · ' + esc(n.template.language || 'pt_BR') + '</small></div>' +
      '<span class="b' + (n.template.approval === 'approved' ? ' b-new' : n.template.approval === 'rejected' ? ' b-err' : '') + '">' + esc(Flow.TEMPLATE_APPROVAL[n.template.approval] || '') + '</span><button type="button" class="btn sm" data-act="goto" data-id="' + esc(n.id) + '">Ver</button></div>').join('') + '</div>'
      : '<div class="empty">Marque "Enviar como template" nas mensagens que saem fora da janela de 24 h.</div>';
    els.review.innerHTML = h;

    const b = document.getElementById('review-badge');
    const nIss = errs.length + warns.length;
    b.textContent = nIss; b.hidden = !nIss; b.className = 'badge' + (errs.length ? ' err' : '');
  }

  function onReviewClick(e) {
    const li = e.target.closest('li[data-node]');
    if (li) { App().goToNode(li.dataset.node); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, flow = Store.get(), base = Exporters.fileBase(flow);
    if (act === 'copytable') {
      const html = Exporters.pendHTMLTable(flow), text = Exporters.pendMarkdown(flow);
      const done = () => App().toast('Tabela copiada. Cole no e-mail ou no documento.');
      try {
        if (navigator.clipboard && root.ClipboardItem) {
          navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]).then(done, () => fallbackCopy(html, done));
        } else fallbackCopy(html, done);
      } catch (err) { fallbackCopy(html, done); }
    }
    else if (act === 'csv') { Exporters.download(base + '.pendencias.csv', Exporters.pendCSV(flow), 'text/csv'); App().toast('Pendências exportadas em ' + base + '.pendencias.csv'); }
    else if (act === 'pendmd') { Exporters.download(base + '.pendencias.md', Exporters.pendMarkdown(flow), 'text/markdown'); App().toast('Pendências exportadas em Markdown.'); }
    else if (act === 'exportreview') App().doExport('review');
    else if (act === 'importreview') document.getElementById('review-input').click();
    else if (act === 'saveversion') {
      const name = els.review.querySelector('#ver-name').value.trim();
      try { Store.saveVersion(name); App().toast('Versão salva.'); } catch (err) { App().toast('Sem espaço no navegador para mais uma versão. Exclua versões antigas ou salve um .json.'); }
      renderReview();
    }
    else if (act === 'delver') { Store.deleteVersion(b.dataset.v); renderReview(); }
    else if (act === 'comparever') { const v = Store.versions().find(x => x.id === b.dataset.v); if (v) setDiff(v.name, v.flow); }
    else if (act === 'comparefile') document.getElementById('compare-input').click();
    else if (act === 'cleardiff') setDiff(null);
    else if (act === 'goto') App().goToNode(b.dataset.id);
  }

  function fallbackCopy(html, done) {
    const box = document.createElement('div');
    box.contentEditable = 'true'; box.innerHTML = html;
    Object.assign(box.style, { position: 'fixed', left: '-9999px', top: '0' });
    document.body.appendChild(box);
    const r = document.createRange(); r.selectNodeContents(box);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    try { document.execCommand('copy'); done(); } catch (e) { App().toast('Não consegui copiar. Use o .csv.'); }
    s.removeAllRanges(); box.remove();
  }

  function setDiff(name, otherFlow) {
    if (!name) { diffState = null; }
    else {
      const base = Flow.normalize(JSON.parse(JSON.stringify(otherFlow)));
      diffState = { name, diff: Analysis.diff(base, Store.get()), base };
    }
    renderReview();
    App().refreshOverlay();
  }
  function refreshDiff() { if (diffState) diffState.diff = Analysis.diff(diffState.base, Store.get()); }

  function setImportResult(r) { lastImport = r; renderReview(); }

  root.Panels = {
    init, render, runAll, setDiff, refreshDiff, setImportResult, badge,
    coverageOn: () => coverageOn,
    diff: () => diffState && diffState.diff
  };
})(window);

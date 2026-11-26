/* store.js — estado do fluxo, desfazer/refazer, autosave e arquivos .json. */
(function (root) {
  'use strict';

  const KEY = 'chatbot-mapper:flow:v1';
  let flow = null;
  let undoStack = [];
  let redoStack = [];
  let saveTimer = null;
  let lastCoalesce = { key: null, at: 0 };
  const listeners = {};

  function on(evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); }
  function emit(evt, data) { (listeners[evt] || []).forEach(cb => cb(data)); }

  function get() { return flow; }

  function load(f, opts) {
    opts = opts || {};
    flow = Flow.normalize(f);
    [null].concat(flow.subflows.map(x => x.id)).forEach(scope => {
      if (Flow.scopeNodes(flow, scope).some(n => n._needsLayout)) Flow.autoLayout(flow, scope);
    });
    undoStack = []; redoStack = [];
    lastCoalesce = { key: null, at: 0 };
    emit('load', { silent: !!opts.silent });
    emit('change', { source: 'load' });
    if (!opts.silent) scheduleSave();
  }

  function snapshot() {
    undoStack.push(JSON.stringify(flow));
    if (undoStack.length > 120) undoStack.shift();
    redoStack = [];
  }

  /* update(fn, {source, coalesce}) — aplica a alteração, registra no histórico e avisa a interface.
     "coalesce" agrupa digitações seguidas no mesmo campo em um único passo de desfazer. */
  function update(fn, opts) {
    opts = opts || {};
    const now = Date.now();
    const same = opts.coalesce && lastCoalesce.key === opts.coalesce && now - lastCoalesce.at < 2000;
    if (!same && opts.snapshot !== false) snapshot();
    lastCoalesce = opts.coalesce ? { key: opts.coalesce, at: now } : { key: null, at: 0 };
    fn(flow);
    flow.meta.updatedAt = new Date().toISOString();
    scheduleSave();
    emit('change', { source: opts.source || 'app' });
  }

  /* Registra um ponto de desfazer sem avisar a interface (usado ao arrastar nós). */
  function checkpoint() { snapshot(); lastCoalesce = { key: null, at: 0 }; }

  function undo() {
    if (!undoStack.length) return false;
    redoStack.push(JSON.stringify(flow));
    flow = JSON.parse(undoStack.pop());
    scheduleSave();
    emit('change', { source: 'history' });
    return true;
  }

  function redo() {
    if (!redoStack.length) return false;
    undoStack.push(JSON.stringify(flow));
    flow = JSON.parse(redoStack.pop());
    scheduleSave();
    emit('change', { source: 'history' });
    return true;
  }

  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(flow));
      emit('saved', { at: new Date() });
    } catch (e) { emit('saveerror', e); }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function toJSON() { return JSON.stringify(flow, cleanKeys, 2); }

  function cleanKeys(k, v) { return k === '_needsLayout' ? undefined : v; }

  function importText(text) {
    const parsed = JSON.parse(text);
    load(parsed);
  }

  /* ---------- versões salvas (localStorage) ---------- */
  const VERSIONS_KEY = 'chatbot-mapper:versions';
  function versions() {
    try { return JSON.parse(localStorage.getItem(VERSIONS_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveVersion(name) {
    const list = versions();
    list.unshift({ id: 'v' + Date.now().toString(36), name: name || ('Versão de ' + new Date().toLocaleString('pt-BR')), at: new Date().toISOString(), flowName: flow.meta.name, flow: JSON.parse(toJSON()) });
    while (list.length > 20) list.pop();
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(list)); // pode lançar QuotaExceededError: quem chama mostra o erro
    return list[0];
  }
  function deleteVersion(id) {
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions().filter(v => v.id !== id)));
  }

  /* ---------- área de transferência entre fluxos ---------- */
  const CLIP_KEY = 'chatbot-mapper:clipboard';
  function setClipboard(clip) { try { localStorage.setItem(CLIP_KEY, JSON.stringify(clip)); return true; } catch (e) { return false; } }
  function getClipboard() { try { return JSON.parse(localStorage.getItem(CLIP_KEY) || 'null'); } catch (e) { return null; } }

  /* ---------- nome de quem edita/comenta ---------- */
  const AUTHOR_KEY = 'chatbot-mapper:author';
  function author() { try { return localStorage.getItem(AUTHOR_KEY) || ''; } catch (e) { return ''; } }
  function setAuthor(v) { try { localStorage.setItem(AUTHOR_KEY, String(v || '').trim()); } catch (e) { /* ignora */ } }

  root.Store = { on, get, load, update, checkpoint, undo, redo, canUndo, canRedo, save, restore, toJSON, importText,
    versions, saveVersion, deleteVersion, setClipboard, getClipboard, author, setAuthor };
})(window);

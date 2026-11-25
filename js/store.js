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
    if (flow.nodes.some(n => n._needsLayout)) Flow.autoLayout(flow);
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
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function toJSON() { return JSON.stringify(flow, cleanKeys, 2); }

  function cleanKeys(k, v) { return k === '_needsLayout' ? undefined : v; }

  function importText(text) {
    const parsed = JSON.parse(text);
    load(parsed);
  }

  root.Store = { on, get, load, update, checkpoint, undo, redo, canUndo, canRedo, save, restore, toJSON, importText };
})(window);

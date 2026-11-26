/* meta.js — limites e montagem de mensagens para a WhatsApp Cloud API (Meta).
   Os limites ficam em LIMITS: se a Meta mudar algo, ajuste aqui.
   Funciona no navegador (window.Meta) e no Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Meta = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Valores conferidos na documentação pública da Meta e de provedores (nov/2026).
     O corpo de mensagens interativas usa o limite mais conservador (1024). */
  const LIMITS = {
    textBody: 4096,        // mensagem de texto simples
    interactiveBody: 1024, // corpo de botões / lista
    header: 60,            // cabeçalho de texto
    footer: 60,            // rodapé
    buttons: 3,            // botões de resposta por mensagem
    buttonTitle: 20,       // rótulo do botão
    listRows: 10,          // linhas somadas de todas as seções da lista
    listRowTitle: 24,      // título da linha
    listRowDescription: 72,
    listButtonLabel: 20,   // texto do botão que abre a lista
    rowId: 200,
    buttonId: 256
  };

  const chars = s => Array.from(String(s == null ? '' : s)).length;

  /* Como o menu será enviado: botões, lista ou inválido. */
  function menuKind(node) {
    const opts = node.options || [];
    const n = opts.length;
    if (n === 0) return 'empty';
    if (n > LIMITS.listRows) return 'toomany';
    if (node.menuStyle === 'list') return 'list';
    if (node.menuStyle === 'buttons') return n <= LIMITS.buttons ? 'buttons' : 'list';
    const fitsButtons = n <= LIMITS.buttons && opts.every(o => !o.description && chars(o.label) <= LIMITS.buttonTitle);
    return fitsButtons ? 'buttons' : 'list';
  }

  /* Problemas de um nó em relação às regras do canal. */
  function validateNode(node) {
    const out = [];
    const err = m => out.push({ severity: 'error', message: m });
    const warn = m => out.push({ severity: 'warn', message: m });
    const text = node.text || '';

    if (node.type === 'message' || node.type === 'input') {
      if (!text.trim()) err('O texto está vazio.');
      else if (chars(text) > LIMITS.textBody) err('Texto com ' + chars(text) + ' caracteres (máximo ' + LIMITS.textBody + ').');
    }
    if (node.type === 'message' && node.template && node.template.enabled && !String(node.template.name || '').trim()) {
      warn('Enviado como template: informe o nome do template.');
    }
    if (node.type === 'message' && node.template && node.template.enabled && node.template.approval === 'rejected') {
      warn('Template rejeitado pela Meta: ajuste o texto e reenvie para aprovação.');
    }
    if (node.type === 'input' && !String(node.variable || '').trim()) warn('Informe o nome da variável que guarda a resposta.');
    if ((node.type === 'handoff' || node.type === 'end') && chars(text) > LIMITS.textBody) err('Texto acima de ' + LIMITS.textBody + ' caracteres.');

    if (node.type === 'menu') {
      const kind = menuKind(node);
      const opts = node.options || [];
      if (!text.trim()) err('O texto do menu está vazio.');
      else if (chars(text) > LIMITS.interactiveBody) err('Texto do menu com ' + chars(text) + ' caracteres (máximo ' + LIMITS.interactiveBody + ').');
      if (chars(node.header) > LIMITS.header) err('Cabeçalho acima de ' + LIMITS.header + ' caracteres.');
      if (chars(node.footer) > LIMITS.footer) err('Rodapé acima de ' + LIMITS.footer + ' caracteres.');
      if (kind === 'empty') err('O menu não tem opções.');
      if (kind === 'toomany') err('O menu tem ' + opts.length + ' opções; o WhatsApp aceita no máximo ' + LIMITS.listRows + '. Divida em um submenu.');
      if (node.menuStyle === 'buttons' && opts.length > LIMITS.buttons) warn('Botões aceitam até ' + LIMITS.buttons + ' opções; este menu será enviado como lista.');
      const seen = new Set();
      opts.forEach((o, i) => {
        const label = String(o.label || '').trim();
        const n = i + 1;
        if (!label) { err('Opção ' + n + ' sem rótulo.'); return; }
        const max = kind === 'buttons' ? LIMITS.buttonTitle : LIMITS.listRowTitle;
        if ((kind === 'buttons' || kind === 'list') && chars(label) > max) {
          err('Opção ' + n + ' "' + label + '" tem ' + chars(label) + ' caracteres (máximo ' + max + ' para ' + (kind === 'buttons' ? 'botão' : 'lista') + ').');
        }
        if (kind === 'list' && chars(o.description) > LIMITS.listRowDescription) err('Descrição da opção ' + n + ' acima de ' + LIMITS.listRowDescription + ' caracteres.');
        const key = label.toLowerCase();
        if (seen.has(key)) err('Rótulo repetido: "' + label + '" (o WhatsApp não aceita duas opções iguais).');
        seen.add(key);
      });
      if (kind === 'list') {
        if (!String(node.listButton || '').trim()) err('Informe o texto do botão que abre a lista.');
        else if (chars(node.listButton) > LIMITS.listButtonLabel) err('Texto do botão da lista acima de ' + LIMITS.listButtonLabel + ' caracteres.');
      }
    }
    return out;
  }

  function base(type) {
    return { messaging_product: 'whatsapp', recipient_type: 'individual', to: '{{wa_id}}', type };
  }

  function textPayload(body) {
    return Object.assign(base('text'), { text: { preview_url: false, body } });
  }

  function menuPayload(node) {
    const kind = menuKind(node);
    const opts = node.options || [];
    const i = { type: kind === 'buttons' ? 'button' : 'list', body: { text: node.text || '' } };
    if (node.header) i.header = { type: 'text', text: node.header };
    if (node.footer) i.footer = { text: node.footer };
    if (kind === 'buttons') {
      i.action = { buttons: opts.map(o => ({ type: 'reply', reply: { id: o.id, title: o.label } })) };
    } else {
      i.action = {
        button: node.listButton || 'Ver opções',
        sections: [{
          title: 'Opções',
          rows: opts.map(o => { const r = { id: o.id, title: o.label }; if (o.description) r.description = o.description; return r; })
        }]
      };
    }
    return Object.assign(base('interactive'), { interactive: i });
  }

  /* Converte {{variavel}} em {{1}}, {{2}}… (formato de template da Meta). */
  function toTemplate(node) {
    const vars = [];
    const body = String(node.text || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => {
      let i = vars.indexOf(k);
      if (i < 0) { vars.push(k); i = vars.length - 1; }
      return '{{' + (i + 1) + '}}';
    });
    const t = node.template || {};
    return { name: t.name || '', category: t.category || 'utility', language: t.language || 'pt_BR', approval: t.approval || 'draft', body, variables: vars };
  }

  /* Mensagem pronta para a API + rotas de resposta, de um nó. */
  function buildNode(node) {
    const r = { node: node.id, title: node.title, type: node.type, status: node.status, subflow: node.subflow || null, kind: node.type, payload: null, routes: {}, issues: validateNode(node) };
    switch (node.type) {
      case 'message':
        if (node.template && node.template.enabled) {
          r.kind = 'template';
          r.template = toTemplate(node);
          r.payload = Object.assign(base('template'), { template: { name: node.template.name || '', language: { code: node.template.language || 'pt_BR' } } });
          if (r.template.variables.length) r.payload.template.components = [{ type: 'body', parameters: r.template.variables.map(v => ({ type: 'text', text: '{{' + v + '}}' })) }];
        } else {
          r.kind = 'text'; r.payload = textPayload(node.text || '');
        }
        r.routes = { next: node.next || null };
        break;
      case 'menu':
        r.kind = menuKind(node) === 'buttons' ? 'interactive_buttons' : 'interactive_list';
        r.payload = menuPayload(node);
        (node.options || []).forEach(o => { r.routes[o.id] = o.next || null; });
        r.routes['*'] = 'fallback';
        break;
      case 'input':
        r.kind = 'text'; r.payload = textPayload(node.text || '');
        r.expects = { variable: node.variable || null, validation: node.validation || 'none' };
        r.routes = { valid: node.next || null, invalid: node.invalid || null };
        break;
      case 'action':
        r.kind = 'action';
        r.action = { system: node.system || '', description: node.text || '' };
        if (node.cases && node.cases.length) {
          r.action.cases = node.cases.map(c => ({ id: c.id, label: c.label, when: (c.when || []).map(w => ({ field: w.field, op: w.op, value: w.value })) }));
          r.routes = {};
          node.cases.forEach(c => { r.routes['case:' + c.id] = c.next || null; });
          r.routes.failure = node.onFailure || null;
        } else {
          r.routes = { success: node.onSuccess || null, failure: node.onFailure || null };
        }
        break;
      case 'call':
        r.kind = 'call'; r.call = { subflow: node.target || null };
        r.routes = { next: node.next || null };
        break;
      case 'return':
        r.kind = 'return'; r.routes = { return: 'caller' };
        break;
      case 'handoff':
        r.kind = 'handoff'; r.payload = node.text ? textPayload(node.text) : null; r.routes = {};
        break;
      case 'end':
        r.kind = 'end'; r.payload = node.text ? textPayload(node.text) : null; r.routes = {};
        break;
    }
    return r;
  }

  return { LIMITS, chars, menuKind, validateNode, buildNode, toTemplate, textPayload, menuPayload };
});

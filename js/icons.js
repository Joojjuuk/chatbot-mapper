/* icons.js — conjunto único de ícones SVG (traço 2, cantos arredondados) e marcadores de estação.
   Uso: Icons.get('undo') devolve o <svg> como texto. */
(function (root) {
  'use strict';
  const A = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  const P = {
    /* tipos de passo */
    message: '<path d="M4 5h16v11H9l-5 4z"/>',
    menu: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    input: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 12h5"/>',
    action: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    call: '<circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/>',
    return: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    handoff: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    end: '<path d="M6 3v18M6 4h12l-2 4 2 4H6"/>',
    /* interface */
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    chevronRight: '<path d="M9 6l6 6-6 6"/>',
    chevronUp: '<path d="M6 15l6-6 6 6"/>',
    layout: '<rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="4" width="6" height="5" rx="1"/><rect x="15" y="15" width="6" height="5" rx="1"/><path d="M9 6.5h6M18 9v6"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    record: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    restart: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
    theme: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>',
    present: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    enter: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
    compare: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5V14a4 4 0 0 0 4 4h5.5M18 15.5V10a4 4 0 0 0-4-4H8.5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    comment: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
    warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.5 3.5 5.2"/>',
    database: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3"/><path d="M7.5 15h9"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 17.5h2"/>',
    review: '<path d="M9 11l2.5 2.5L16 9"/><rect x="4" y="4" width="16" height="16" rx="2"/>',
    collapse: '<path d="M7 14l5-5 5 5"/>',
    expand: '<path d="M7 10l5 5 5-5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    at: '<circle cx="12" cy="12" r="3.5"/><path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.4 6.8"/>',
    template: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
    folder: '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    save: '<path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>'
  };

  function get(name, cls) {
    return '<svg ' + A + (cls ? ' class="' + cls + '"' : '') + '>' + (P[name] || P.message) + '</svg>';
  }

  /* Marcadores de estação por status: a definir = tracejado ("em obras"), em validação = anel, aprovado = cheio com check. */
  const MARK = {
    todo: '<circle cx="8" cy="8" r="5.5" fill="var(--panel)" stroke="currentColor" stroke-width="2" stroke-dasharray="2.6 2.2"/>',
    review: '<circle cx="8" cy="8" r="5.5" fill="var(--panel)" stroke="currentColor" stroke-width="2.4"/><circle cx="8" cy="8" r="2" fill="currentColor"/>',
    approved: '<circle cx="8" cy="8" r="6.5" fill="currentColor"/><path d="M5 8.2l2 2 4-4.2" fill="none" stroke="var(--panel)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    call: '<circle cx="8" cy="8" r="6.4" fill="var(--panel)" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="3.4" fill="var(--panel)" stroke="currentColor" stroke-width="1.6"/>'
  };
  function mark(status, cls) {
    return '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" class="mark mk-' + status + (cls ? ' ' + cls : '') + '">' + (MARK[status] || MARK.todo) + '</svg>';
  }

  /* Marca: duas linhas que se cruzam numa estação de baldeação. */
  const BRAND = '<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true" focusable="false"><path d="M3 9h7l8 10h7" fill="none" stroke="var(--c1)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 19h7l8-10h7" fill="none" stroke="var(--c3)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="14" r="4.2" fill="#fff" stroke="#0d1b2e" stroke-width="2.2"/></svg>';

  root.Icons = { get, mark, BRAND, names: Object.keys(P) };
})(window);

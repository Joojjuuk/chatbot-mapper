/* example.js — fluxo de exemplo genérico (atendimento de pedidos), com dados sintéticos.
   Mostra grupos, subfluxos, dicionário de dados, personas, regras nos cenários, templates
   e cenários de teste. Não tem posições (x, y): o layout é calculado ao carregar. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EXAMPLE_FLOW = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const opt = (id, label, next, description) => ({ id, label, description: description || '', next });
  const base = (id, type, title, group, status, extra) => Object.assign({ id, type, title, group: group || null, status: status || 'todo', notes: '', subflow: null }, extra || {});
  const msg = (id, title, group, text, next, status, notes) => base(id, 'message', title, group, status, { text, next: next || null, notes: notes || '' });
  const when = (field, op, value) => ({ field, op, value: value == null ? '' : value });
  const inSf = (sf, n) => Object.assign(n, { subflow: sf });

  return function createExample() {
    const now = new Date().toISOString();
    return {
      schema: 'chatbot-mapper/2',
      meta: {
        name: 'Atendimento de pedidos (exemplo)',
        description: 'Exemplo genérico com dados sintéticos: identificação, rastreio com cenários, documentos com código de verificação e central de atendimento.',
        brand: 'Empresa Exemplo', createdAt: now, updatedAt: now
      },
      settings: { startNode: 'inicio', fallbackText: 'Não entendi. Por favor, escolha uma das opções.', persona: 'p_cliente' },
      groups: [
        { id: 'g_entrada', name: 'Entrada', color: 'c1' },
        { id: 'g_ident', name: 'Identificação', color: 'c2' },
        { id: 'g_pedidos', name: 'Pedidos', color: 'c3' },
        { id: 'g_problemas', name: 'Problemas', color: 'c4' },
        { id: 'g_docs', name: 'Documentos', color: 'c5' },
        { id: 'g_atend', name: 'Atendimento', color: 'c6' }
      ],
      subflows: [
        { id: 'sf_central', name: 'Falar com a central', start: 'c_horario', description: 'Transfere em horário comercial; fora dele, registra e agenda o retorno.' },
        { id: 'sf_token', name: 'Validar código (token)', start: 't_pede', description: 'Confirma a identidade com um código enviado ao e-mail do cadastro.' }
      ],
      variables: [
        { name: 'cnpj', label: 'CNPJ da unidade', source: 'Digitado pelo cliente', field: '', rule: 'Somente números, dígitos verificadores válidos', type: 'documento', example: '11222333000181' },
        { name: 'pedido', label: 'Número do pedido', source: 'Digitado pelo cliente', field: '', rule: 'Somente números', type: 'numero', example: '784512' },
        { name: 'previsao', label: 'Previsão de entrega', source: 'ERP', field: 'pedidos.dt_previsao', rule: 'Data prevista da transportadora; se vazia, data do pedido + prazo do frete', type: 'data', example: '28/11/2026 até 15h' },
        { name: 'data_entrega', label: 'Data de entrega', source: 'ERP', field: 'pedidos.dt_entrega', rule: 'Preenchida quando a transportadora confirma a entrega', type: 'data', example: '25/11/2026 10h42' },
        { name: 'ocorrencia', label: 'Ocorrência da entrega', source: 'ERP', field: 'ocorrencias.descricao', rule: 'Última ocorrência em aberto do pedido', type: 'texto', example: 'Destinatário ausente' },
        { name: 'nf', label: 'Número da nota fiscal', source: 'ERP', field: 'notas.numero', rule: 'Nota mais recente do pedido', type: 'numero', example: '004512' },
        { name: 'email_cadastro', label: 'E-mail do cadastro', source: 'ERP', field: 'clientes.email', rule: 'Exibir mascarado (3 primeiras letras)', type: 'texto', example: 'co***@cliente.com.br' },
        { name: 'token', label: 'Código de verificação', source: 'Digitado pelo cliente', field: '', rule: '6 dígitos, válido por 10 minutos', type: 'numero', example: '482913' },
        { name: 'dentro_horario', label: 'Central em horário de atendimento', source: 'Agenda de atendimento', field: 'agenda.aberta', rule: 'Seg a sex, 8h às 17h, exceto feriados', type: 'texto', example: 'sim' }
      ],
      personas: [
        { id: 'p_cliente', name: 'Cliente — Hospital Exemplo', values: { cnpj: '11222333000181', pedido: '784512', previsao: '28/11/2026 até 15h', data_entrega: '', ocorrencia: '', nf: '004512', email_cadastro: 'co***@hospitalexemplo.com.br' } },
        { id: 'p_vendedora', name: 'Vendedora — Ana', values: { cnpj: '11444777000161', pedido: '903311', previsao: '02/12/2026', data_entrega: '25/11/2026 10h42', ocorrencia: 'Destinatário ausente', nf: '009876', email_cadastro: 'an***@empresaexemplo.com.br' } }
      ],
      tests: [
        {
          id: 't_transito', name: 'Rastreio — pedido em trânsito', startAt: null, persona: 'p_cliente', expectEnd: 'encerramento',
          steps: [
            { node: 'identificacao', port: 'next', text: '11222333000181' },
            { node: 'consulta_cadastro', port: 'success' },
            { node: 'menu_principal', port: 'opt:rastreio' },
            { node: 'pedido_numero', port: 'next', text: '784512' },
            { node: 'busca_pedido', port: 'case:em_transito' },
            { node: 'mais_ajuda', port: 'opt:nao' }
          ]
        },
        {
          id: 't_docs', name: 'Segunda via da nota com código', startAt: null, persona: 'p_vendedora', expectEnd: 'encerramento',
          steps: [
            { node: 'identificacao', port: 'next', text: '11444777000161' },
            { node: 'consulta_cadastro', port: 'success' },
            { node: 'menu_principal', port: 'opt:documentos' },
            { node: 't_pede', port: 'next', text: '482913' },
            { node: 't_valida', port: 'case:valido' },
            { node: 'docs_menu', port: 'opt:segunda_via' },
            { node: 'mais_ajuda', port: 'opt:nao' }
          ]
        },
        {
          id: 't_central', name: 'CNPJ sem cadastro fora do horário', startAt: null, persona: 'p_cliente', expectEnd: 'encerramento',
          steps: [
            { node: 'identificacao', port: 'next', text: '11222333000181' },
            { node: 'consulta_cadastro', port: 'failure' },
            { node: 'c_horario', port: 'case:fora_do_horario' }
          ]
        }
      ],
      nodes: [
        /* ---------- fluxo principal ---------- */
        msg('inicio', 'Boas-vindas', 'g_entrada',
          'Olá! 👋 Bem-vindo(a) à *Central de Atendimento* da Empresa Exemplo.\nAtendemos de segunda a sexta, das 8h às 17h (exceto feriados).',
          'identificacao', 'approved'),
        base('identificacao', 'input', 'Identificação', 'g_ident', 'review', {
          text: 'Para te identificar, digite o *CNPJ* da sua unidade (somente números):',
          variable: 'cnpj', validation: 'cnpj', example: '11222333000181', next: 'consulta_cadastro', invalid: 'cnpj_invalido',
          notes: 'Basta o CNPJ digitado ou também validamos o número do WhatsApp de quem escreve?'
        }),
        msg('cnpj_invalido', 'CNPJ inválido', 'g_ident', 'Não consegui validar esse CNPJ. Confira os números e tente novamente.', 'identificacao', 'approved'),
        base('consulta_cadastro', 'action', 'Consulta ao cadastro', 'g_ident', 'review', {
          system: 'ERP — clientes', text: 'Buscar a unidade pelo CNPJ informado', cases: [],
          onSuccess: 'menu_principal', onFailure: 'nao_cadastrado'
        }),
        msg('nao_cadastrado', 'CNPJ não cadastrado', 'g_ident', 'Não encontramos esse CNPJ em nosso cadastro. Vou te encaminhar para a nossa central.', 'chama_central', 'approved'),
        base('chama_central', 'call', 'Central (sem cadastro)', 'g_atend', 'approved', { target: 'sf_central', next: 'encerramento', text: '' }),
        base('menu_principal', 'menu', 'Menu principal', 'g_entrada', 'review', {
          text: 'Em que podemos te ajudar? Escolha uma das opções:', header: '', footer: '', listButton: 'Ver opções', menuStyle: 'auto',
          options: [
            opt('rastreio', 'Rastreio de pedidos', 'pedido_numero'),
            opt('problema', 'Extravio / Avarias', 'todo_problema'),
            opt('devolucao', 'Devolução', 'todo_devolucao'),
            opt('documentos', 'Solicitar documentos', 'docs_token'),
            opt('elogio', 'Elogio / Reclamação', 'todo_elogio')
          ]
        }),
        base('pedido_numero', 'input', 'Número do pedido', 'g_pedidos', 'approved', {
          text: 'Digite o *número do pedido* ou da nota fiscal:', variable: 'pedido', validation: 'number', example: '784512',
          next: 'busca_pedido', invalid: 'pedido_invalido'
        }),
        msg('pedido_invalido', 'Número inválido', 'g_pedidos', 'Use somente números, por favor.', 'pedido_numero', 'approved'),
        base('busca_pedido', 'action', 'Situação do pedido', 'g_pedidos', 'review', {
          system: 'ERP — pedidos', text: 'Buscar o pedido e a situação da entrega',
          cases: [
            { id: 'entregue', label: 'Entregue', next: 'st_entregue', when: [when('data_entrega', 'filled')] },
            { id: 'em_transito', label: 'Em trânsito', next: 'st_transito', when: [when('data_entrega', 'empty'), when('ocorrencia', 'empty')] },
            { id: 'ocorrencia', label: 'Com ocorrência', next: 'st_ocorrencia', when: [when('data_entrega', 'empty'), when('ocorrencia', 'filled')] }
          ],
          onSuccess: null, onFailure: 'pedido_nao_encontrado',
          notes: 'Pedido entregue há mais de 30 dias ainda aparece ou cai em "não encontrado"?'
        }),
        msg('st_entregue', 'Pedido entregue', 'g_pedidos', 'O pedido *{{pedido}}* foi entregue em {{data_entrega}}. ✅', 'mais_ajuda', 'approved'),
        msg('st_transito', 'Pedido em trânsito', 'g_pedidos', 'O pedido *{{pedido}}* está a caminho. 🚚\nPrevisão de entrega: *{{previsao}}*.', 'mais_ajuda', 'approved'),
        base('st_ocorrencia', 'menu', 'Pedido com ocorrência', 'g_pedidos', 'review', {
          text: 'O pedido *{{pedido}}* teve uma ocorrência na entrega: _{{ocorrencia}}_.\nComo prefere seguir?', header: '', footer: '', listButton: 'Ver opções', menuStyle: 'auto',
          options: [opt('central', 'Falar com a central', 'oc_central'), opt('previsao', 'Ver nova previsão', 'st_transito')]
        }),
        base('oc_central', 'call', 'Central (ocorrência)', 'g_pedidos', 'review', { target: 'sf_central', next: 'mais_ajuda', text: '' }),
        msg('pedido_nao_encontrado', 'Pedido não encontrado', 'g_pedidos', 'Não encontramos o pedido {{pedido}}. Verifique o número e tente de novo.', 'menu_principal', 'review'),
        base('docs_token', 'call', 'Verificar identidade', 'g_docs', 'approved', { target: 'sf_token', next: 'docs_menu', text: '' }),
        base('docs_menu', 'menu', 'Documentos', 'g_docs', 'review', {
          text: 'Identidade confirmada. Qual documento você precisa?', header: '', footer: '', listButton: 'Ver opções', menuStyle: 'auto',
          options: [opt('segunda_via', '2ª via da nota fiscal', 'docs_nf'), opt('boleto', 'Boleto', 'todo_documentos')]
        }),
        base('docs_nf', 'message', 'Envio da 2ª via', 'g_docs', 'review', {
          text: 'Enviamos a 2ª via da nota fiscal *{{nf}}* para {{email_cadastro}}. 📄', next: 'mais_ajuda',
          template: { enabled: true, name: 'segunda_via_nota', category: 'utility', language: 'pt_BR', approval: 'approved' }
        }),
        base('mais_ajuda', 'menu', 'Mais alguma coisa?', 'g_atend', 'approved', {
          text: 'Posso ajudar em algo mais?', header: '', footer: '', listButton: 'Ver opções', menuStyle: 'auto',
          options: [opt('sim', 'Sim', 'menu_principal'), opt('nao', 'Não, obrigado', 'encerramento')]
        }),
        base('encerramento', 'end', 'Encerramento', 'g_atend', 'approved', { text: 'Obrigado pelo contato! Até a próxima. 👋' }),
        msg('todo_problema', 'Extravio / Avarias', 'g_problemas', '🚧 *A definir:* coletar dados e fotos e gerar um protocolo.', 'mais_ajuda', 'todo', 'O bot abre algo no sistema ou só registra o protocolo e encaminha?'),
        msg('todo_devolucao', 'Devolução', 'g_problemas', '🚧 *A definir:* fluxo de devolução.', 'mais_ajuda', 'todo', 'Quais motivos o cliente pode escolher? Que dados são obrigatórios?'),
        msg('todo_documentos', 'Boleto', 'g_docs', '🚧 *A definir:* envio de boleto.', 'mais_ajuda', 'todo', 'Boleto vencido gera um novo ou só reenvia?'),
        msg('todo_elogio', 'Elogio / Reclamação', 'g_atend', '🚧 *A definir:* registrar o relato e gerar um protocolo.', 'mais_ajuda', 'todo', 'Para onde o registro é encaminhado?'),

        /* ---------- subfluxo: Falar com a central ---------- */
        inSf('sf_central', base('c_horario', 'action', 'Central aberta?', 'g_atend', 'approved', {
          system: 'Agenda de atendimento', text: 'Verificar se a central está em horário de atendimento',
          cases: [
            { id: 'dentro_do_horario', label: 'Dentro do horário', next: 'c_transfere', when: [when('dentro_horario', 'eq', 'sim')] },
            { id: 'fora_do_horario', label: 'Fora do horário', next: 'c_fora', when: [when('dentro_horario', 'eq', 'não')] }
          ],
          onSuccess: null, onFailure: 'c_fora'
        })),
        inSf('sf_central', base('c_transfere', 'handoff', 'Transferir para a central', 'g_atend', 'review', {
          text: 'Um atendente da central vai continuar a conversa em instantes.', notes: 'Qual fila recebe? Existe prioridade por tipo de cliente?'
        })),
        inSf('sf_central', msg('c_fora', 'Central fechada', 'g_atend', 'Nossa central está fora do horário agora. Registramos seu contato e retornamos no próximo dia útil.', 'c_retorno', 'approved')),
        inSf('sf_central', base('c_retorno', 'message', 'Retorno da central', 'g_atend', 'review', {
          text: 'Olá! Aqui é a central da Empresa Exemplo retomando seu contato de ontem sobre o pedido {{pedido}}. Podemos falar agora?', next: 'c_volta',
          template: { enabled: true, name: 'retorno_central', category: 'utility', language: 'pt_BR', approval: 'submitted' }
        })),
        inSf('sf_central', base('c_volta', 'return', 'Voltar ao fluxo', 'g_atend', 'approved', { text: '' })),

        /* ---------- subfluxo: Validar código (token) ---------- */
        inSf('sf_token', base('t_pede', 'input', 'Pedir o código', 'g_docs', 'approved', {
          text: 'Enviamos um código de 6 dígitos para {{email_cadastro}}. Digite o código:', variable: 'token', validation: 'number', example: '482913',
          next: 't_valida', invalid: 't_invalido'
        })),
        inSf('sf_token', msg('t_invalido', 'Código em formato inválido', 'g_docs', 'O código tem só números. Tente de novo.', 't_pede', 'approved')),
        inSf('sf_token', base('t_valida', 'action', 'Conferir código', 'g_docs', 'review', {
          system: 'Autenticação', text: 'Conferir o código digitado',
          cases: [
            { id: 'valido', label: 'Válido', next: 't_ok', when: [when('token', 'filled')] },
            { id: 'expirado', label: 'Expirado', next: 't_expirado', when: [] }
          ],
          onSuccess: null, onFailure: 't_atendente', notes: 'Quantas tentativas antes de bloquear?'
        })),
        inSf('sf_token', msg('t_expirado', 'Código expirado', 'g_docs', 'Esse código expirou. Enviamos um novo para o seu e-mail.', 't_pede', 'review')),
        inSf('sf_token', base('t_ok', 'return', 'Código confirmado', 'g_docs', 'approved', { text: '' })),
        inSf('sf_token', base('t_atendente', 'handoff', 'Atendente (falha no código)', 'g_atend', 'todo', { text: 'Não consegui confirmar o código. Vou te passar para um atendente.' }))
      ]
    };
  };
});

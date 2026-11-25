/* example.js — fluxo de exemplo genérico (atendimento de pedidos).
   Serve de modelo: apague os nós e monte o seu. Não tem posições (x, y):
   o layout é calculado ao carregar. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EXAMPLE_FLOW = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const opt = (id, label, next, description) => ({ id, label, description: description || '', next });
  const msg = (id, title, text, next, status, notes) => ({ id, type: 'message', title, status: status || 'todo', text, next: next || null, notes: notes || '' });

  return function createExample() {
    const now = new Date().toISOString();
    return {
      schema: 'chatbot-mapper/1',
      meta: {
        name: 'Atendimento de pedidos (exemplo)',
        description: 'Exemplo genérico: identificação do cliente, consulta de pedido e menu de assuntos.',
        brand: 'Empresa Exemplo', createdAt: now, updatedAt: now
      },
      settings: { startNode: 'inicio', fallbackText: 'Não entendi. Por favor, escolha uma das opções.' },
      nodes: [
        msg('inicio', 'Boas-vindas',
          'Olá! 👋 Bem-vindo(a) à *Central de Atendimento* da Empresa Exemplo.\nAtendemos de segunda a sexta, das 8h às 17h (exceto feriados).',
          'identificacao', 'approved'),
        {
          id: 'identificacao', type: 'input', title: 'Identificação', status: 'review',
          text: 'Para te identificar, digite o *CNPJ* da sua unidade (somente números):',
          variable: 'cnpj', validation: 'cnpj', example: '11222333000181', next: 'consulta_cadastro', invalid: 'cnpj_invalido',
          notes: 'Basta o CNPJ digitado ou também validamos o número do WhatsApp de quem escreve?'
        },
        msg('cnpj_invalido', 'CNPJ inválido', 'Não consegui validar esse CNPJ. Confira os números e tente novamente.', 'identificacao', 'approved'),
        {
          id: 'consulta_cadastro', type: 'action', title: 'Consulta ao cadastro', status: 'review',
          system: 'Cadastro de clientes', text: 'Buscar a unidade pelo CNPJ informado',
          onSuccess: 'menu_principal', onFailure: 'nao_cadastrado', notes: ''
        },
        msg('nao_cadastrado', 'CNPJ não cadastrado', 'Não encontramos esse CNPJ em nosso cadastro. Vou te transferir para um atendente.', 'atendente', 'todo'),
        {
          id: 'menu_principal', type: 'menu', title: 'Menu principal', status: 'review',
          text: 'Em que podemos te ajudar? Escolha uma das opções:', header: '', footer: '', listButton: 'Ver opções', menuStyle: 'auto',
          options: [
            opt('rastreio', 'Rastreio de pedidos', 'pedido_numero'),
            opt('problema', 'Extravio / Avarias', 'todo_problema'),
            opt('devolucao', 'Devolução', 'todo_devolucao'),
            opt('documentos', 'Solicitar documentos', 'todo_documentos'),
            opt('elogio', 'Elogio / Reclamação', 'todo_elogio')
          ], notes: ''
        },
        {
          id: 'pedido_numero', type: 'input', title: 'Número do pedido', status: 'approved',
          text: 'Digite o *número do pedido* ou da nota fiscal:', variable: 'pedido', validation: 'number', example: '123456',
          next: 'busca_pedido', invalid: 'pedido_invalido', notes: ''
        },
        msg('pedido_invalido', 'Número inválido', 'Use somente números, por favor.', 'pedido_numero', 'approved'),
        {
          id: 'busca_pedido', type: 'action', title: 'Busca do pedido', status: 'approved',
          system: 'Rastreamento', text: 'Buscar o pedido informado', onSuccess: 'pedido_menu', onFailure: 'pedido_nao_encontrado', notes: ''
        },
        msg('pedido_nao_encontrado', 'Pedido não encontrado', 'Não encontramos o pedido {{pedido}}. Verifique o número e tente de novo.', 'menu_principal', 'review'),
        {
          id: 'pedido_menu', type: 'menu', title: 'Assuntos do pedido', status: 'review',
          text: 'Encontramos o pedido *{{pedido}}*. Sobre o que você quer falar?', header: '', footer: '', listButton: 'Ver opções', menuStyle: 'auto',
          options: [
            opt('previsao', 'Previsão de entrega', 'pedido_previsao'),
            opt('atraso', 'Atraso', 'todo_atraso'),
            opt('prioridade', 'Prioridade', 'todo_prioridade'),
            opt('agendamento', 'Agendamento', 'todo_agendamento'),
            opt('troca', 'Troca de mercadorias', 'todo_devolucao')
          ], notes: ''
        },
        msg('pedido_previsao', 'Previsão de entrega', 'A previsão de entrega do pedido *{{pedido}}* é {{previsao}}.', 'mais_ajuda', 'approved'),
        {
          id: 'mais_ajuda', type: 'menu', title: 'Mais alguma coisa?', status: 'approved',
          text: 'Posso ajudar em algo mais?', header: '', footer: '', listButton: 'Ver opções', menuStyle: 'auto',
          options: [opt('sim', 'Sim', 'menu_principal'), opt('nao', 'Não, obrigado', 'encerramento')], notes: ''
        },
        { id: 'encerramento', type: 'end', title: 'Encerramento', status: 'approved', text: 'Obrigado pelo contato! Até a próxima. 👋', notes: '' },
        msg('todo_atraso', 'Atraso', '🚧 *A definir:* informar o status do atraso e a nova previsão.', 'mais_ajuda', 'todo', 'Só consulta ou também abre uma ocorrência?'),
        { id: 'todo_prioridade', type: 'handoff', title: 'Prioridade', status: 'todo', text: 'Vou te transferir para um atendente tratar a priorização do pedido.', notes: 'Pedido de prioridade é sempre tratado por uma pessoa?' },
        msg('todo_agendamento', 'Agendamento', '🚧 *A definir:* informar o status do agendamento.', 'mais_ajuda', 'todo', 'Só consultar ou permitir solicitar agendamento?'),
        msg('todo_problema', 'Extravio / Avarias', '🚧 *A definir:* coletar dados e fotos e gerar um protocolo.', 'mais_ajuda', 'todo', 'O bot abre algo no sistema ou só registra o protocolo e encaminha?'),
        msg('todo_devolucao', 'Devolução', '🚧 *A definir:* fluxo de devolução.', 'mais_ajuda', 'todo', 'Quais motivos o cliente pode escolher? Que dados são obrigatórios?'),
        msg('todo_documentos', 'Documentos', '🚧 *A definir:* quais documentos o cliente pode pedir.', 'mais_ajuda', 'todo', 'Lista de documentos e formato de envio (PDF).'),
        msg('todo_elogio', 'Elogio / Reclamação', '🚧 *A definir:* registrar o relato e gerar um protocolo.', 'mais_ajuda', 'todo', 'Para onde o registro é encaminhado?'),
        { id: 'atendente', type: 'handoff', title: 'Atendente humano', status: 'review', text: 'Um atendente vai continuar a conversa em instantes.', notes: 'Quem atende, por qual canal e em qual horário?' }
      ]
    };
  };
});

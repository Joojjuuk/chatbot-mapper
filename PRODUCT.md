# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Analista de atendimento/automação** (usuário principal): desenha o fluxo do chatbot de WhatsApp no notebook, sozinho na mesa, e também projeta ou compartilha a tela em reunião com o cliente para validar passo a passo.
- **Cliente aprovador**: pessoa do lado do cliente, não técnica, que lê, comenta e aprova os passos. Recebe arquivos exportados (simulador, revisão, documento); não edita o mapa.
- **Desenvolvimento**: quem implementa o bot. Precisa de dicionário de dados, regras dos cenários, rotas e payloads da Meta.
- **Gestão/comercial**: olha volume de mensagens por conversa para cruzar com pacotes de disparo da proposta.

## Product Purpose

Desenhar, simular e validar a conversa de um chatbot de WhatsApp antes de implementá-la, e entregar ao desenvolvimento uma especificação objetiva. Sucesso: o cliente aprova o fluxo inteiro sem ambiguidade e o desenvolvimento implementa sem precisar perguntar de onde vem cada dado.

## Positioning

Uma ferramenta só, offline, que junta o mapa da conversa, um simulador fiel ao WhatsApp, as regras da Cloud API da Meta e o ciclo de aprovação com o cliente. Nada sai do computador: o fluxo vive no navegador e nos arquivos exportados.

## Operating Context

- Uso em monitor de notebook e em projetor/tela compartilhada durante reunião presencial ou remota.
- Ciclo típico: rascunho → reunião de validação (modo apresentação + simulador) → envio de arquivo de revisão ao cliente → importação das respostas → especificação para o desenvolvimento.
- Arquivos trocados por e-mail: `.json` (fluxo), `.simulador.html`, `.revisao.html`, `.documento.html`, `.spec.md/.html`, `.csv` de pendências.

## Capabilities and Constraints

- Roda 100% no navegador, aberto via `file://`, sem servidor, sem internet, sem dependências e sem etapa de build.
- Persistência: `localStorage` + arquivos exportados.
- Limites da WhatsApp Cloud API ficam em `js/meta.js` (`Meta.LIMITS`).
- Interface e conteúdo em português do Brasil.
- Export `.docx` da especificação: próxima etapa (ver `docs/specs/90-export-docx-proxima-etapa.md`).

## Brand Commitments

- Nome próprio: **Chatbot Mapper**.
- Nenhuma marca de terceiros ou de empresa prestadora no app nem nos exports. Especificações exportadas são genéricas e objetivas.
- O simulador continua reconhecível como WhatsApp (é o que o cliente final verá).

## Evidence on Hand

- Fluxo de exemplo genérico em `js/example.js` (dados sintéticos).
- Não há logos, depoimentos ou métricas reais; não inventar.

## Product Principles

1. O mapa tem de ser lido por alguém que não o desenhou, inclusive projetado.
2. Toda decisão pendente fica visível até ser resolvida (status, pergunta em aberto, comentário não resolvido).
3. O que o cliente aprova é exatamente o que o simulador mostra.
4. O desenvolvimento recebe fatos estruturados, não notas soltas.
5. Offline e sem instalação, sempre.

## Accessibility & Inclusion

Contraste suficiente para projetor; operação por teclado nos fluxos principais (busca, seleção, criar próximo passo, desfazer); estados não comunicados só por cor.

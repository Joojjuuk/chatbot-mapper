# Chatbot Mapper

Ferramenta visual para **desenhar, simular, testar e validar o fluxo de um chatbot de WhatsApp** antes de implementá-lo, e entregar ao desenvolvimento uma especificação objetiva, com payloads prontos para a **WhatsApp Business Platform (Meta Cloud API)**.

Roda 100% no navegador: **sem instalação, sem servidor, sem internet**. Basta dar dois cliques em `index.html`.

O mapa é desenhado como um mapa de metrô: cada **grupo** é uma linha colorida em uma faixa, cada **passo** é uma estação com o status no marcador, e cada **subfluxo** é uma estação de baldeação.

## Para que serve

- **Mapear** a conversa: mensagens, menus, perguntas, ações de sistema com cenários, subfluxos, atendente e encerramento.
- **Organizar** fluxos grandes: faixas por grupo (recolhíveis), subfluxos reutilizáveis, busca, filtros e minimapa.
- **Simular** em um celular estilo WhatsApp, com dados de exemplo por persona.
- **Testar**: gravar cenários, rodar todos com um clique, ver cobertura e volume de mensagens.
- **Validar com o cliente**: arquivo de revisão em que o cliente só aprova ou pede ajuste; importação das respostas; comparação de versões; pauta de pendências.
- **Passar para o desenvolvimento**: dicionário de dados, regras estruturadas dos cenários, templates da Meta e especificação exportável.

## Como usar

1. Baixe/clone o repositório e abra `index.html` no Chrome, Edge ou Firefox.
2. Comece pelo exemplo (**Arquivo → Abrir o exemplo**) ou crie um **Novo fluxo**.
3. Arraste a bolinha de uma saída até outro passo para ligar. Solte no vazio para criar o próximo passo.
4. O trabalho é salvo automaticamente no navegador. Para guardar ou compartilhar, use **Arquivo → Salvar fluxo (.json)** e reabra em **Abrir** (ou arraste o arquivo para a tela). Arquivos do formato antigo (`chatbot-mapper/1`) abrem e são migrados sem perda.

### Organização do mapa

- **Linhas (grupos)**: no painel **Editar** (sem nada selecionado), crie linhas como Entrada, Cliente, Problema, Documentos. Cada uma vira uma faixa colorida; o botão da placa recolhe a faixa em uma pílula.
- **Subfluxos**: blocos usados em vários pontos (falar com a central, validar um código) viram subfluxos. Um passo **Chamar subfluxo** executa o bloco e segue pelo próximo passo quando o subfluxo chega em **Voltar ao fluxo**. Duplo clique no passo ou **Abrir** entra no subfluxo; a trilha no topo do mapa volta ao principal.
- **Busca** (`/` ou `Ctrl+K`): acha passos pelo título, texto, opções ou perguntas em aberto, em todos os subfluxos.
- **Filtros**: por status, pergunta em aberto, comentário não resolvido e linha. O que não passa no filtro fica esmaecido.
- **Organizar**: reposiciona por faixas e colunas, reduzindo cruzamentos.

### Simulação e testes

- **Personas** (aba **Dados**): cada persona tem valores de exemplo para as variáveis (`{{previsao}}`, `{{nf}}`). Troque a persona no simulador e os textos mudam.
- **Gravar cenário** (aba **Simular**): faça a conversa e salve. A aba **Testes** roda todos de uma vez, mostra o motivo de cada falha e toca qualquer cenário sozinho no celular, para a demo.
- **Cobertura**: marca no mapa os passos que nenhum cenário visita.
- **Volume**: mensagens enviadas pelo bot por conversa (mínimo, média, máximo) e uma calculadora de conversas por mês contra o tamanho do pacote.

### Validação com o cliente

- **Exportar → Revisão para o cliente** gera um `.revisao.html`. O cliente abre, aprova ou pede ajuste em cada passo, comenta e baixa um `.json` de respostas (sem editar nada e sem servidor).
- **Revisão → Importar respostas** aplica status, comentários e histórico (quem aprovou e quando).
- **Versões**: salve versões nomeadas e compare com a atual ou com qualquer `.json`; o mapa realça o que entrou e o que mudou.
- **Pendências**: erros, avisos, perguntas em aberto, comentários não resolvidos e passos a definir, em `.csv`, `.md` ou tabela copiada para o e-mail.
- **Comentários** aceitam `@Nome` e podem ser marcados como resolvidos.

### Ponte com o desenvolvimento

- **Dicionário de dados** (aba **Dados**): para cada variável, rótulo, sistema de origem, campo, regra de cálculo, tipo e exemplo. O app aponta variáveis usadas sem definição.
- **Regras estruturadas**: em uma ação com cenários, cada cenário recebe condições (campo, operador, valor) e o app escreve a frase, por exemplo "Data de entrega preenchido → Entregue".
- **Templates da Meta**: mensagens fora da janela de 24 h levam nome, categoria, idioma e status de aprovação.
- **Exportar → Especificação** (`.spec.html` / `.spec.md`): passos, regras, integrações, dicionário, templates, subfluxos e cenários de teste, sem marca de empresa.

### Respostas por cenário (consulta direta)

Um passo de **Ação do sistema** pode responder de formas diferentes conforme o resultado da consulta. Clique em **Responder por cenários** e crie, por exemplo, *Entregue*, *Em trânsito*, *Com ocorrência*. Cada cenário aponta para a mensagem que o cliente recebe e o simulador mostra um botão por cenário.

### Atalhos

| Ação | Atalho |
|---|---|
| Criar passo | duplo clique no mapa |
| Criar o próximo passo ligado ao selecionado | `Tab` |
| Buscar | `/` ou `Ctrl+K` |
| Selecionar vários | `Shift`+clique ou `Shift`+arrastar no fundo |
| Selecionar tudo no escopo | `Ctrl+A` |
| Copiar / colar (inclusive entre fluxos) | `Ctrl+C` / `Ctrl+V` |
| Desfazer / refazer | `Ctrl+Z` / `Ctrl+Y` |
| Excluir | `Del` |
| Enquadrar | `F` |
| Salvar `.json` | `Ctrl+S` |
| Zoom / mover | roda do mouse / arrastar o fundo |

## Exportações

| Saída | Arquivo | Uso |
|---|---|---|
| **Revisão para o cliente** | `.revisao.html` | Arquivo único: o cliente aprova ou pede ajuste e devolve um `.json`. Sem notas internas. |
| **Simulador** | `.simulador.html` | Arquivo único com a conversa navegável e troca de persona. Sem notas internas. |
| **Documento para validação** | `.documento.html` | Documento formatado, pronto para imprimir/salvar em PDF. |
| **Especificação** | `.spec.html`, `.spec.md` | Para o desenvolvimento: passos, regras, integrações, dicionário, templates, testes. |
| **Mensagens para a Meta** | `.meta-messages.json` | Payloads da Messages API, rotas, subfluxos, condições dos cenários, templates. |
| **Pendências** | `.pendencias.csv` | Pauta de reunião (abre no Excel). |
| **Fluxo** | `.json` | Arquivo de trabalho (schema `chatbot-mapper/2`). |
| **Markdown** | `.md` | Para wikis e repositórios. |

O export `.docx` da especificação está especificado para a próxima etapa em `docs/specs/90-export-docx-proxima-etapa.md`.

### Sobre a integração com a Meta

A Meta **não guarda a árvore de conversa**: ela entrega as mensagens do cliente ao seu *webhook* e você responde pela Messages API. O `.meta-messages.json` traz, para cada passo:

- `payload`: o corpo pronto para `POST /{phone-number-id}/messages`;
- `routes`: para onde ir dependendo da resposta (`button_reply.id` / `list_reply.id`, `*` como fallback);
- `call` e `subflows`: qual subfluxo executar e onde ele começa; ao chegar em `return`, segue por `routes.next` do passo que chamou;
- `action.cases[].when`: as condições de cada cenário sobre os campos do dicionário;
- `expects` e `template` quando aplicável.

## Limites da WhatsApp Cloud API considerados

| Item | Limite |
|---|---|
| Botões de resposta | até 3, título até 20 caracteres |
| Lista | até 10 linhas no total; título da linha até 24; descrição até 72; rótulo do botão até 20 |
| Cabeçalho / rodapé | até 60 caracteres |
| Corpo de mensagem interativa | até 1024 caracteres |
| Corpo de mensagem de texto | até 4096 caracteres |
| Fora da janela de 24 h | só mensagens de template aprovadas |

Os limites ficam em `js/meta.js` (`Meta.LIMITS`) e podem mudar; confira a documentação oficial da Meta antes de ir para produção.

## Estrutura

```
index.html            tela principal
css/app.css           identidade visual (tema claro/escuro, modo apresentação)
fonts/                fonte Barlow (OFL), embutida para funcionar offline
js/flow.js            modelo do fluxo, escopos e subfluxos, migração, layout, busca, regras, lint
js/analysis.js        cenários de teste, cobertura, comparação, volume, pendências, colar, revisão
js/meta.js            limites e payloads da Meta
js/store.js           estado, desfazer/refazer, autosave, versões, área de transferência
js/graph.js           mapa: faixas, estações, ligações, seleção, laço, zoom
js/minimap.js         minimapa
js/search.js          busca
js/inspector.js       aba Editar
js/panels.js          abas Testes, Dados e Revisão
js/player.js          simulador (também embutido nos exports)
js/review.js          página de revisão do cliente (embutida no export)
js/exporters.js       exportações
js/icons.js           ícones SVG e marcadores de estação
js/example.js         fluxo de exemplo genérico, com dados sintéticos
tests/run.js          testes (node tests/run.js)
docs/architecture/    visão geral, modelo de dados e ADRs
docs/specs/           especificações por recurso (com critérios de aceite)
PRODUCT.md            produto, usuários e princípios
DESIGN.md             sistema visual
```

Sem dependências e sem etapa de build. Os módulos usam `<script>` clássico para funcionar via `file://`.

## Testes

```bash
node tests/run.js
```

Os testes com prefixo `S01`…`S05` correspondem aos critérios de aceite das specs em `docs/specs/`.

## Privacidade

Nada sai do seu computador. O fluxo vive no `localStorage` do navegador e nos arquivos que você exporta. Os arquivos para o cliente não levam perguntas em aberto, comentários internos, histórico nem cenários de teste.

# Chatbot Mapper

Ferramenta visual para **desenhar, validar e apresentar o fluxo de um chatbot de WhatsApp** antes de implementá-lo, e exportar o resultado em formatos prontos para a integração com a **WhatsApp Business Platform (Meta Cloud API)**.

Roda 100% no navegador: **sem instalação, sem servidor, sem internet**. Basta dar dois cliques em `index.html`.

## Para que serve

- **Mapear** a conversa em um canvas (mensagens, menus, perguntas, ações de sistema, transferência para atendente, encerramento).
- **Validar com o cliente**: cada passo tem status (*a definir*, *em validação*, *aprovado*), comentários e "perguntas em aberto".
- **Simular** a conversa em um celular estilo WhatsApp, vendo no mapa o passo em que o cliente está.
- **Checar os limites da Meta** enquanto você escreve (botões, listas, tamanhos de texto).
- **Exportar** para a equipe técnica e para o cliente.

## Como usar

1. Baixe/clone o repositório e abra `index.html` no Chrome, Edge ou Firefox.
2. Comece pelo **Exemplo** (botão na barra) ou crie um **Novo** fluxo.
3. Arraste a bolinha de uma saída até outro nó para ligar. Solte no vazio para criar o próximo passo.
4. Aba **Simular** para testar a conversa; **Apresentar** para o modo tela cheia de reunião.
5. O trabalho é salvo automaticamente no navegador. Para guardar ou compartilhar, use **Exportar → Salvar fluxo (.json)** e reabra depois em **Abrir** (ou arraste o arquivo para a tela).

### Respostas por cenário (consulta direta)

Um nó de **Ação do sistema** pode responder de formas diferentes conforme o resultado da consulta. Em vez de "encontrei, o que deseja?", o bot já devolve a situação: clique em **Resposta por cenários** no nó e crie, por exemplo, *Entregue*, *Atrasada*, *Em trânsito com ocorrência*. Cada cenário aponta para a mensagem (ou menu com botões) que o cliente recebe, e o simulador mostra um botão por cenário para você testar.

Para a demonstração ficar realista, o arquivo do fluxo aceita valores de exemplo para as variáveis em `settings.sample`, por exemplo `"sample": { "previsao": "25/11/2026 15h" }`. No simulador eles aparecem sublinhados; o que o cliente digita tem prioridade.

### Atalhos

| Ação | Atalho |
|---|---|
| Criar nó | duplo clique no mapa |
| Desfazer / refazer | `Ctrl+Z` / `Ctrl+Y` |
| Excluir nó | `Del` |
| Enquadrar o fluxo | `F` |
| Salvar `.json` | `Ctrl+S` |
| Zoom / mover | roda do mouse / arrastar o fundo |

## Exportações

| Saída | Arquivo | Uso |
|---|---|---|
| **Simulador para o cliente** | `.simulador.html` | Um único arquivo com o fluxo dentro. Abre em qualquer navegador, sem instalar nada. Não inclui comentários internos. |
| **Documento para validação** | `.documento.html` | Documento formatado, pronto para imprimir/salvar em PDF. |
| **Mensagens para a Meta** | `.meta-messages.json` | Payloads da Messages API, rotas entre passos, templates sugeridos e problemas encontrados. |
| **Fluxo** | `.json` | Arquivo de trabalho (schema `chatbot-mapper/1`). |
| **Markdown** | `.md` | Para wikis e repositórios. |

### Sobre a integração com a Meta

A Meta **não guarda a árvore de conversa**: ela entrega as mensagens do cliente ao seu *webhook* e você responde pela Messages API. Por isso o arquivo `.meta-messages.json` traz, para cada passo:

- `payload`: o corpo pronto para `POST /{phone-number-id}/messages`;
- `routes`: para onde ir dependendo da resposta (`button_reply.id` / `list_reply.id`, `*` como fallback);
- `expects`, `action` e `template` quando aplicável.

Seu backend (ou o provedor de mensageria usado) lê esse arquivo e executa o fluxo.

## Limites da WhatsApp Cloud API considerados

| Item | Limite |
|---|---|
| Botões de resposta | até 3, título até 20 caracteres |
| Lista | até 10 linhas no total; título da linha até 24; descrição até 72; rótulo do botão até 20 |
| Cabeçalho / rodapé | até 60 caracteres |
| Corpo de mensagem interativa | até 1024 caracteres |
| Corpo de mensagem de texto | até 4096 caracteres |
| Fora da janela de 24 h | só mensagens de template aprovadas |

Os limites ficam em `js/meta.js` (`Meta.LIMITS`) e podem mudar com o tempo; confira a documentação oficial da Meta antes de ir para produção.

## Estrutura

```
index.html          tela principal
css/app.css         visual (tema claro/escuro, modo apresentação)
js/flow.js          modelo do fluxo, layout, validações de estrutura
js/meta.js          limites e geração de payloads da Meta
js/store.js         estado, desfazer/refazer, autosave
js/graph.js         canvas (pan/zoom, nós, ligações)
js/inspector.js     painel de edição
js/player.js        simulador de conversa (também embutido nos exports)
js/exporters.js     exportações
js/example.js       fluxo de exemplo genérico
tests/run.js        testes (node tests/run.js)
```

Sem dependências e sem etapa de build. Os módulos usam `<script>` clássico para funcionar via `file://`.

## Testes

```
node tests/run.js
```

## Privacidade

Nada sai do seu computador. O fluxo vive no `localStorage` do navegador e nos arquivos que você exporta.

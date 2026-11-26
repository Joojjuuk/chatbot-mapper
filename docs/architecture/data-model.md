# Modelo de dados — schema `chatbot-mapper/2`

Arquivo `.json` de trabalho. `Flow.normalize` aceita `chatbot-mapper/1` e migra (ADR 0003).

```jsonc
{
  "schema": "chatbot-mapper/2",
  "meta": { "name": "", "description": "", "brand": "", "createdAt": "ISO", "updatedAt": "ISO" },
  "settings": {
    "startNode": "id",            // início do fluxo principal
    "fallbackText": "",            // resposta para texto fora das opções
    "persona": "id|null"           // persona ativa no simulador
  },
  "groups":    [{ "id": "g_entrada", "name": "Entrada", "color": "c1", "collapsed": false }],
  "subflows":  [{ "id": "sf_central", "name": "Falar com a central", "start": "id|null", "description": "" }],
  "variables": [{ "name": "previsao", "label": "Previsão de entrega", "source": "ERP", "field": "pedido.dt_prev", "rule": "", "type": "data", "example": "25/11 15h" }],
  "personas":  [{ "id": "p_cliente", "name": "Cliente — Hospital Exemplo", "values": { "previsao": "25/11 15h" } }],
  "tests":     [{ "id": "t1", "name": "", "startAt": "id|null", "persona": "id|null",
                  "steps": [{ "node": "id", "port": "opt:x", "text": "opcional" }], "expectEnd": "id|null" }],
  "nodes": [ /* ver abaixo */ ]
}
```

## Nó (campos comuns)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | string | único no arquivo inteiro (inclui subfluxos) |
| `type` | `message` `menu` `input` `action` `call` `return` `handoff` `end` | |
| `title`, `text`, `notes` | string | `notes` = pergunta em aberto |
| `status` | `todo` `review` `approved` | |
| `x`, `y` | number | posição no escopo |
| `group` | id de grupo ou `null` | faixa no mapa |
| `subflow` | id de subfluxo ou `null` | `null` = fluxo principal |
| `comments[]` | `{author,text,date,resolved,mentions[]}` | `mentions` derivado de `@Nome` |
| `history[]` | `{at,by,action,from,to,note}` | `action`: `status`, `review`, `comment` |

## Campos por tipo

| Tipo | Campos | Portas de saída |
|---|---|---|
| `message` | `next`, `template {enabled,name,category,language,approval}` | `next` |
| `menu` | `header`, `footer`, `listButton`, `menuStyle`, `options[{id,label,description,next}]` | `opt:<id>` |
| `input` | `variable`, `validation`, `example`, `next`, `invalid` | `next`, `invalid` |
| `action` | `system`, `cases[{id,label,next,when[{field,op,value}]}]`, `onSuccess`, `onFailure` | `case:<id>`+`failure`, ou `success`+`failure` |
| `call` | `target` (id do subfluxo), `next` | `next` (depois do retorno) |
| `return` | — | nenhuma (volta ao chamador) |
| `handoff`, `end` | — | nenhuma |

`template.approval`: `draft` `submitted` `approved` `rejected`. `when[].op`: `filled` `empty` `eq` `neq` `gt` `lt` `contains`.

## Passo de cenário de teste

`{node, port, text?}`: o nó onde a conversa esperava o cliente (menu, pergunta ou ação simulada) e a porta escolhida. Nós sem interação (`message`, `call`, `return`) avançam sozinhos e não aparecem nos passos.

## Arquivo de respostas da revisão (`chatbot-mapper/review/1`)

```jsonc
{ "schema": "chatbot-mapper/review/1", "flow": "nome", "reviewer": "Nome", "at": "ISO",
  "items": [{ "node": "id", "decision": "approved|changes", "comment": "" }] }
```

## Estado fora do arquivo (localStorage)

| Chave | Conteúdo |
|---|---|
| `chatbot-mapper:flow:v1` | fluxo atual (autosave) |
| `chatbot-mapper:versions` | até 20 versões salvas `{name, at, flow}` |
| `chatbot-mapper:clipboard` | nós copiados |
| `chatbot-mapper:author` | nome de quem comenta/aprova |
| `chatbot-mapper:theme` | `light` / `dark` |

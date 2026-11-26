# Spec: Ponte com o técnico

**Data:** 2026-11-26 · **Status:** Approved

## Context
O desenvolvimento pergunta de onde vem cada variável (`{{previsao}}`, `{{nf}}`) e qual regra define cada cenário ("data de entrega preenchida → Entregue"). Hoje isso fica em notas de texto. Também falta saber quais mensagens precisam de template aprovado pela Meta e quantas mensagens cada caminho consome, para cruzar com os pacotes de disparo.

## Functional Requirements
- FR-1: O fluxo MUST ter um dicionário de dados: `{name,label,source,field,rule,type,example}` por variável.
- FR-2: O app MUST descobrir as variáveis usadas (`{{x}}` nos textos e `variable` das perguntas) e indicar: usada e não definida, definida e não usada.
- FR-3: Cada cenário de ação MUST aceitar condições estruturadas `{field,op,value}` e gerar uma frase legível.
- FR-4: Mensagens marcadas como template MUST ter categoria, idioma e status de aprovação, e o app MUST listar todos os templates.
- FR-5: O app MUST exportar uma **especificação para desenvolvimento** (`.spec.md` e `.spec.html`) genérica e objetiva, sem marca de empresa, com: resumo, passos (tabela), rotas, regras dos cenários, integrações, dicionário, templates, subfluxos e cenários de teste.
- FR-6: O app MUST estimar mensagens enviadas pelo bot por caminho (mínimo, média, máximo) e por cenário de teste, e calcular o volume mensal a partir de "conversas por mês".
- FR-7: O JSON da Meta MUST trazer `cases[].when` e o bloco `template` com categoria e idioma.

## Non-Functional Requirements
- NFR-P1: Enumeração de caminhos MUST parar em 2.000 caminhos e informar que foi truncada.

## Acceptance Criteria
### AC-1: teste automatizado (FR-1, FR-2)
Given `{{previsao}}` num texto e variável `pedido` numa pergunta e dicionário só com `pedido` e `cnpj`, When `discoverVariables`, Then `undefined` = [previsao] e `unused` = [cnpj].
### AC-2: teste automatizado (FR-3)
Given `when [{field:'data_entrega', op:'filled'}]` e cenário "Entregue", When `ruleText`, Then "data_entrega preenchido → Entregue" (usa o rótulo do dicionário quando existir).
### AC-3: teste automatizado (FR-6)
Given um fluxo linear de 3 mensagens, When `volume`, Then min = max = 3.
### AC-4: teste automatizado (FR-6)
Given um menu com dois ramos de tamanhos diferentes, When `volume`, Then min < max.
### AC-5: teste automatizado (FR-7, FR-4)
Given um cenário com `when`, When `Meta.buildNode`, Then `action.cases[0].when` está presente.
### AC-6: verificação manual (FR-5)
Given o exemplo, When exportar especificação, Then o arquivo tem as seções do FR-5.

## Edge Cases and Error Scenarios
- EC-1: Ciclos no grafo: cada nó conta no máximo 2 vezes por caminho.
- EC-2: Variável com nome inválido (fora de `[a-z0-9_.]`) MUST ser rejeitada no editor.

## API Contracts
N/A.

## Data Models
`flow.variables[]`, `cases[].when[]`, `template.{category,language,approval}`.

## Out of Scope
- OS-1: `.docx` (ver spec 90).
- OS-2: Envio de templates para aprovação na Meta.

# ADR 0002 — Subfluxos no mesmo array de nós

**Status:** Aceito · **Data:** 2026-11-26

## Contexto
Passos como "Falar com a central" e "Validar código (token)" são chamados de vários pontos. Hoje viram setas cruzando o mapa inteiro. Precisamos de um bloco reutilizável que outros passos chamam.

## Opções
1. Cada subfluxo como um objeto com seu próprio `nodes[]`.
2. Todos os nós em `flow.nodes`, com `node.subflow` indicando o escopo; subfluxos descritos em `flow.subflows[]`.

## Decisão
Opção 2. Novos tipos: `call` (chama o subfluxo `target`, segue por `next` quando ele termina) e `return` (encerra o subfluxo e volta ao chamador).

## Consequências
- `Flow.map`, ids únicos, copiar/colar, diff e desfazer continuam funcionando sem mudança estrutural.
- O canvas filtra por escopo (`Flow.scopeNodes`). Ligações diretas entre escopos são proibidas pelo lint.
- Simulador e motor de testes mantêm uma pilha de retorno; profundidade limitada para evitar recursão infinita.

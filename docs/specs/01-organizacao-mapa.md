# Spec: Organização do mapa

**Data:** 2026-11-26 · **Status:** Approved · **Relacionadas:** ADR 0002, ADR 0003

## Context
Fluxos reais passam de 50 passos em 6 áreas (entrada, cliente, vendedor, problema, reversa, documentos). Passos compartilhados, como falar com a central ou validar um código, são ligados de vários pontos e geram setas cruzando o mapa todo. Achar um passo exige rolar e dar zoom. A reunião de validação perde tempo procurando.

## Functional Requirements
- FR-1: O fluxo MUST ter uma lista de grupos `{id,name,color,collapsed}` e cada nó MAY pertencer a um grupo.
- FR-2: O mapa MUST desenhar uma faixa horizontal colorida por grupo atrás dos nós do grupo, com o nome do grupo visível.
- FR-3: Cada faixa MUST ter controle para recolher/expandir; recolhida, MUST mostrar só uma pílula "Nome · N passos", e ligações de/para nós do grupo MUST terminar na pílula.
- FR-4: O fluxo MUST suportar subfluxos `{id,name,start}`; nós com `subflow = id` pertencem ao subfluxo.
- FR-5: O tipo de nó `call` MUST chamar um subfluxo e seguir por `next` quando o subfluxo terminar em `return`.
- FR-6: O mapa MUST mostrar um escopo por vez (principal ou um subfluxo), com trilha de navegação e forma de entrar no subfluxo a partir do nó `call`.
- FR-7: A busca MUST encontrar nós por título, texto, rótulos de opção/cenário e notas, ignorando acentos e caixa, em todos os escopos.
- FR-8: Filtros MUST permitir restringir por status, "pergunta em aberto", "comentário não resolvido" e grupo; nós fora do filtro MUST ficar esmaecidos, não escondidos.
- FR-9: Um minimapa MUST mostrar os nós do escopo e o retângulo da janela visível; clicar/arrastar no minimapa MUST mover a vista.
- FR-10: "Organizar" MUST posicionar nós em linhas por grupo e colunas por profundidade a partir do início do escopo, ordenando dentro da linha para reduzir cruzamentos.
- FR-11: O lint MUST avisar: `call` sem subfluxo; subfluxo sem início; subfluxo sem `return` alcançável; ligação entre escopos diferentes.

## Non-Functional Requirements
- NFR-P1: Renderizar 150 nós MUST levar menos de 100 ms em notebook comum.
- NFR-A1: Busca MUST ser operável só pelo teclado (`/` ou `Ctrl+K`, setas, Enter, Esc).

## Acceptance Criteria
### AC-1: teste automatizado (FR-1, FR-4)
Given um fluxo `/1` sem grupos, When normalizado, Then `groups`, `subflows` existem como listas vazias e nós têm `group: null`, `subflow: null`.
### AC-2: teste automatizado (FR-5)
Given um nó `call` com `target` e `next`, When `Flow.ports`, Then há uma porta `next` e o lint não reclama.
### AC-3: teste automatizado (FR-11)
Given um `call` sem `target`, When lint, Then há aviso "não chama nenhum subfluxo".
### AC-4: teste automatizado (FR-11)
Given um subfluxo sem `return` alcançável, When lint, Then há aviso.
### AC-5: teste automatizado (FR-10)
Given nós em dois grupos, When `autoLayout`, Then todos os nós do grupo A têm `y` menor que os do grupo B (ordem da lista de grupos) e posições são distintas.
### AC-6: teste automatizado (FR-7, FR-8)
Given a busca "previsao", When `Flow.search`, Then retorna o nó cujo texto contém "Previsão".
### AC-7: verificação manual (FR-2, FR-3)
Given grupo recolhido, When o mapa renderiza, Then a pílula aparece e as setas terminam nela.
### AC-8: verificação manual (FR-9, FR-6)
Given o minimapa visível, When o usuário clica num ponto, Then a vista centraliza no ponto clicado.

## Edge Cases and Error Scenarios
- EC-1: Excluir um grupo MUST deixar seus nós sem grupo (não exclui nós).
- EC-2: Excluir um subfluxo MUST pedir confirmação e excluir seus nós; `call` que apontava para ele fica sem alvo (aviso no lint).
- EC-3: Subfluxo que chama a si mesmo: simulador e motor MUST parar após 8 níveis com aviso.
- EC-4: Nó `return` no fluxo principal: lint MUST avisar.

## API Contracts
N/A — app local sem API. Funções públicas: `Flow.scopeNodes(flow, scope)`, `Flow.search(flow, q)`, `Flow.autoLayout(flow, scope)`.

## Data Models
Ver `docs/architecture/data-model.md` (`groups`, `subflows`, `node.group`, `node.subflow`, tipos `call`/`return`).

## Out of Scope
- OS-1: Grupos aninhados.
- OS-2: Subfluxo com parâmetros de entrada/saída (usa as mesmas variáveis da conversa).

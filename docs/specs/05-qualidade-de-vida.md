# Spec: Qualidade de vida

**Data:** 2026-11-26 · **Status:** Approved

## Context
Montar fluxos grandes exige muitos cliques repetidos: mover passos um a um, mudar status um a um, recriar trechos parecidos em outro fluxo, ligar cada passo novo à mão.

## Functional Requirements
- FR-1: Shift+clique MUST adicionar/remover um nó da seleção; Shift+arrastar no fundo MUST selecionar por laço.
- FR-2: Arrastar um nó selecionado MUST mover toda a seleção.
- FR-3: Com 2+ nós selecionados, uma barra MUST permitir mudar status, mudar grupo e excluir de uma vez (um único passo de desfazer).
- FR-4: `Ctrl+C`/`Ctrl+V` MUST copiar e colar nós, inclusive entre fluxos diferentes; ligações internas à seleção MUST ser preservadas e externas descartadas.
- FR-5: `Tab` com um nó selecionado MUST abrir o menu de tipo e criar o próximo passo à direita, ligado à primeira saída livre.
- FR-6: Comentários MUST suportar `@Nome` e resolvido/não resolvido (ver spec 03).

## Non-Functional Requirements
- NFR-U1: Todas as ações acima MUST ter um único passo de desfazer.

## Acceptance Criteria
### AC-1: teste automatizado (FR-4)
Given nós A→B copiados, When `remapPaste`, Then os novos ids são diferentes, A' liga em B', e ligação de B para fora da seleção vira `null`.
### AC-2: teste automatizado (FR-5)
Given nó com primeira saída livre, When `Flow.firstFreePort`, Then retorna essa porta.
### AC-3: verificação manual (FR-1, FR-2, FR-3, FR-6)
Given 3 nós selecionados, When escolhe status "Aprovado" na barra, Then os 3 ficam aprovados e um Ctrl+Z volta os 3.

## Edge Cases and Error Scenarios
- EC-1: Colar dentro de um subfluxo MUST atribuir o escopo atual aos nós colados.
- EC-2: Colar grupo inexistente no fluxo destino MUST deixar `group: null`.

## API Contracts
N/A.

## Data Models
`localStorage['chatbot-mapper:clipboard']` = `{nodes[], groups[]}`.

## Out of Scope
- OS-1: Área de transferência do sistema operacional (usa localStorage para funcionar em `file://`).
- OS-2: Alinhar/distribuir nós selecionados.

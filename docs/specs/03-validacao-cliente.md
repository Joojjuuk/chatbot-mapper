# Spec: Validação com o cliente

**Data:** 2026-11-26 · **Status:** Approved · **Relacionadas:** ADR 0005

## Context
A aprovação do cliente hoje acontece em reunião ou por e-mail solto, e o resultado é digitado de volta à mão. Não dá para ver o que mudou entre a v2 e a v3 do fluxo, nem montar a pauta de pendências sem copiar nó a nó.

## Functional Requirements
- FR-1: O app MUST exportar um `.revisao.html` de arquivo único, sem notas internas, onde o revisor só aprova ou pede ajuste por passo e comenta.
- FR-2: O arquivo de revisão MUST salvar o progresso do revisor localmente e gerar um `.json` de respostas.
- FR-3: O app MUST importar o `.json` de respostas, aplicando status (`approved` ou `review`), comentários e registro no histórico com nome e data.
- FR-4: O app MUST comparar o fluxo atual com outro `.json` ou com uma versão salva, listando passos adicionados, removidos e alterados (com os campos alterados) e realçando-os no mapa.
- FR-5: O app MUST salvar versões nomeadas localmente (até 20).
- FR-6: O app MUST listar pendências (erros, avisos, perguntas em aberto, comentários não resolvidos, passos a definir) e exportá-las em `.csv`, `.md` e tabela HTML copiada para a área de transferência.
- FR-7: Toda mudança de status MUST gravar `{at, by, from, to}` no histórico do passo.
- FR-8: Comentários MUST poder ser marcados como resolvidos/reabertos e MAY marcar pessoas com `@Nome`.

## Non-Functional Requirements
- NFR-U1: O arquivo de revisão MUST funcionar em celular (largura 360 px).

## Acceptance Criteria
### AC-1: teste automatizado (FR-3, FR-7)
Given respostas com `approved` para o nó A e `changes` com comentário para B, When `mergeReview`, Then A fica `approved`, B fica `review` com o comentário, ambos com entrada no histórico.
### AC-2: teste automatizado (FR-3)
Given respostas com id inexistente, When `mergeReview`, Then o id aparece em `skipped` e nada quebra.
### AC-3: teste automatizado (FR-4, FR-5)
Given dois fluxos onde um nó mudou de texto, outro foi adicionado e outro removido, When `diff`, Then cada um aparece na lista certa e o alterado cita `text`.
### AC-4: teste automatizado (FR-6)
Given nó com nota e comentário não resolvido, When `openQuestions`, Then ambos aparecem.
### AC-5: teste automatizado (FR-8)
Given comentário "fala com @Ana Souza", When normalizado, Then `mentions` contém "Ana Souza".
### AC-6: verificação manual (FR-1, FR-2)
Given revisão exportada, When aberta no navegador, Then lista os passos e o simulador funciona.

## Edge Cases and Error Scenarios
- EC-1: Importar respostas de outro fluxo (nome diferente) MUST pedir confirmação.
- EC-2: Revisor sem nome MUST ser pedido antes de baixar as respostas.
- EC-3: Versão salva que excede o `localStorage` MUST mostrar erro e não apagar as anteriores.

## API Contracts
Arquivo `chatbot-mapper/review/1` (ver data-model.md).

## Data Models
`node.history[]`, `comment.resolved`, `comment.mentions[]`.

## Out of Scope
- OS-1: Link online com sincronização (exige servidor).
- OS-2: Assinatura digital da aprovação.

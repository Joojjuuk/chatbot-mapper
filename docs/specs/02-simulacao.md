# Spec: Simulação realista

**Data:** 2026-11-26 · **Status:** Approved · **Relacionadas:** ADR 0004

## Context
Para a demo com o cliente e para checar regressões, hoje é preciso clicar todo o caminho à mão a cada mudança. Os valores de exemplo das variáveis só existem editando o JSON (`settings.sample`), e não dá para mostrar a mesma conversa do ponto de vista de perfis diferentes (um cliente, um vendedor).

## Functional Requirements
- FR-1: O usuário MUST poder gravar a sequência de escolhas feitas no simulador e salvá-la como cenário de teste com nome.
- FR-2: Um cenário MUST poder ser tocado no simulador com um clique, avançando sozinho com atraso visível.
- FR-3: Um cenário MUST poder ser rodado sem interface (`Analysis.runTest`), retornando passou/falhou, o passo onde falhou e o motivo.
- FR-4: "Rodar todos" MUST mostrar o resultado de cada cenário.
- FR-5: O fluxo MUST ter personas `{id,name,values}`; trocar a persona ativa MUST trocar os valores das variáveis no simulador.
- FR-6: Uma tela MUST permitir editar os valores de exemplo por persona (tabela variável × persona) sem editar JSON.
- FR-7: "Cobertura" MUST marcar no mapa os nós que nenhum cenário visita.
- FR-8: O simulador MUST entrar e sair de subfluxos (pilha de retorno).

## Non-Functional Requirements
- NFR-P1: Rodar 50 cenários MUST levar menos de 200 ms.

## Acceptance Criteria
### AC-1: teste automatizado (FR-1, FR-3)
Given o exemplo e um cenário gravado válido, When `runTest`, Then `ok === true` e `visited` inclui o nó final.
### AC-2: teste automatizado (FR-3, FR-4)
Given um cenário cujo nó esperado mudou de destino, When `runTest`, Then `ok === false` e `reason` cita o passo esperado e o encontrado.
### AC-3: teste automatizado (FR-3)
Given um cenário que escolhe uma opção removida, When `runTest`, Then falha com "opção não existe mais".
### AC-4: teste automatizado (FR-7)
Given cenários que não passam pelo nó X, When `coverage`, Then X está em `unvisited`.
### AC-5: teste automatizado (FR-8)
Given um caminho que passa por `call`, When `runTest`, Then visita o subfluxo e retorna ao `next` do `call`.
### AC-6: teste automatizado (FR-5, FR-6)
Given um `/1` com `settings.sample`, When normalizado, Then existe persona "Padrão" com esses valores e `settings.sample` some.
### AC-7: verificação manual (FR-5, FR-2)
Given persona trocada, When reinicia o simulador, Then `{{previsao}}` mostra o valor da nova persona.

## Edge Cases and Error Scenarios
- EC-1: Gravação interrompida por reinício descarta os passos não salvos.
- EC-2: Cenário com `startAt` apagado MUST falhar com motivo "início não existe".
- EC-3: Laço sem interação (mais de 60 passos automáticos) MUST falhar com "possível laço".

## API Contracts
N/A. Funções: `Analysis.runTest(flow, test)` → `{ok, reason, at, visited[], messages}`; `Analysis.coverage(flow)` → `{visited[], unvisited[]}`.

## Data Models
`flow.tests[]`, `flow.personas[]`, `settings.persona` (ver data-model.md).

## Out of Scope
- OS-1: Asserções sobre o texto exato das mensagens.
- OS-2: Execução automática de testes a cada edição (o usuário roda quando quiser; a aba mostra quando o fluxo mudou desde a última execução).

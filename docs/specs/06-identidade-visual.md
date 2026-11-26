# Spec: Nova identidade visual

**Data:** 2026-11-26 · **Status:** Approved · **Relacionadas:** PRODUCT.md, DESIGN.md

## Context
O visual atual é um painel genérico verde-petróleo. Em projetor, nós ficam ilegíveis abaixo de 50% de zoom, os controles usam setas e emoji, e não há linguagem visual para grupos, subfluxos, filtros e realces que os recursos novos exigem. O usuário pediu identidade nova, mantendo o nome Chatbot Mapper e sem marca de terceiros.

## Functional Requirements
- FR-1: A identidade MUST ser definida pelo processo impeccable (rolagem de direções, escolha do usuário, contrato de direção) e registrada em DESIGN.md ao final.
- FR-2: Cores MUST ser tokens CSS com tema claro e escuro.
- FR-3: Grupos MUST ter 8 cores distinguíveis entre si nos dois temas e distintas das cores de status.
- FR-4: Status MUST ser comunicado por cor **e** forma/rótulo (não só cor).
- FR-5: Controles MUST usar ícones SVG de um único conjunto (sem emoji nem caracteres de seta nos controles).
- FR-6: Todo controle interativo MUST ter estados hover, focus visível, active e disabled.
- FR-7: O simulador MUST continuar reconhecível como WhatsApp.
- FR-8: Layout MUST funcionar a partir de 900 px de largura (painel vai para baixo abaixo de 980 px).

## Non-Functional Requirements
- NFR-A1: Texto de interface MUST ter contraste ≥ 4.5:1; títulos dos nós ≥ 7:1 sobre o fundo do nó.
- NFR-A2: Movimento MUST respeitar `prefers-reduced-motion`.

## Acceptance Criteria
### AC-1: verificação manual (FR-2, FR-3, FR-8, FR-1)
Given o fluxo de exemplo, When capturado em 1440×900, 1280×720 e 900×700, claro e escuro, Then não há sobreposição nem corte.
### AC-2: verificação manual (FR-5, FR-6, FR-4)
Given os arquivos de UI alterados, When `impeccable detect` roda, Then não há achado sem justificativa.
### AC-3: verificação manual (FR-7, FR-1)
Given as capturas finais, When o finish reviewer avalia, Then a disposição é `ship` ou as correções pedidas foram aplicadas.

## Edge Cases and Error Scenarios
- EC-1: Títulos longos MUST truncar com reticências e mostrar o título completo no `title`.

## API Contracts
N/A.

## Data Models
N/A — `group.color` guarda a chave da paleta (`c1`…`c8`), não o hex.

## Out of Scope
- OS-1: Temas personalizados pelo usuário.
- OS-2: Logotipo novo em arquivo de imagem (a marca é tipográfica + ícone SVG inline).

# ADR 0005 — Revisão do cliente por arquivo, sem servidor

**Status:** Aceito · **Data:** 2026-11-26

## Contexto
O cliente aprovador precisa comentar e aprovar passo a passo sem editar o mapa. Não há servidor (ADR 0001).

## Decisão
Exportar `.revisao.html` de arquivo único com o fluxo embutido (sem notas internas), simulador e um formulário por passo (Aprovar / Pedir ajuste + comentário). O progresso fica no `localStorage` do próprio arquivo. O revisor baixa um `.json` (`chatbot-mapper/review/1`) e envia de volta; o analista importa e `Analysis.mergeReview` aplica status, comentários e histórico.

## Consequências
- Funciona por e-mail, offline, sem conta.
- Não há sincronização em tempo real; cada rodada de revisão é um arquivo.
- A importação valida o nome do fluxo e ignora ids que não existem mais, listando-os.

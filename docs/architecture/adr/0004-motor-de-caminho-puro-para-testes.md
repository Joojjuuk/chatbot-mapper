# ADR 0004 — Motor de caminho puro para cenários de teste

**Status:** Aceito · **Data:** 2026-11-26

## Contexto
Cenários de teste salvos precisam rodar com um clique, em lote, e apontar o que quebrou depois de uma mudança. O simulador (`ChatPlayer`) é visual, assíncrono e tem de ficar autossuficiente para os exports.

## Opções
1. Rodar os testes dentro do `ChatPlayer` em modo invisível.
2. Motor puro em `js/analysis.js` (`runTest`) que percorre o grafo com as escolhas gravadas, e o `ChatPlayer` só grava (`onChoice`) e reproduz (`script`).

## Decisão
Opção 2.

## Consequências
- Testes rodam no Node e no navegador, de forma síncrona e determinística.
- A semântica de navegação existe em dois lugares (motor e simulador); testes unitários garantem que ambos seguem as mesmas portas.
- Cobertura = união dos nós visitados pelo motor.

# ADR 0003 — Schema `chatbot-mapper/2` com migração automática

**Status:** Aceito · **Data:** 2026-11-26

## Contexto
Grupos, subfluxos, dicionário, personas, cenários de teste, regras e histórico exigem campos novos. Já existem arquivos `/1` (v2 e v3 do fluxo do cliente) que precisam continuar abrindo.

## Decisão
- `Flow.normalize` aceita `/1` e `/2`, preenche os campos ausentes com padrões e grava sempre `/2`.
- `settings.sample` (valores de exemplo do `/1`) vira a persona "Padrão" e deixa de existir.
- Campos desconhecidos são preservados.

## Consequências
- Abrir um `/1` nunca perde dados; salvar gera `/2`.
- Versões antigas do app não abrem `/2` com todos os recursos (abrem, mas ignoram os campos novos).

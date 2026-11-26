# ADR 0001 — Sem build, sem dependências, abrindo via `file://`

**Status:** Aceito · **Data:** 2026-11-26

## Contexto
O app é usado por analistas em notebooks corporativos, muitas vezes sem permissão para instalar nada, e em reuniões sem internet confiável. O cliente recebe arquivos por e-mail.

## Opções
1. SPA com framework e bundler (React/Vite).
2. Scripts clássicos sem build, abertos direto do disco.
3. App desktop (Electron).

## Decisão
Opção 2. Cada módulo é um script clássico que publica um global; módulos de domínio também exportam via `module.exports` para os testes no Node.

## Consequências
- Funciona com dois cliques em `index.html`; exports são HTML de arquivo único.
- Sem ES modules (bloqueados em `file://`), então a ordem dos `<script>` em `index.html` é o grafo de dependências.
- Sem tipagem estática; os testes em `tests/run.js` cobrem o domínio.

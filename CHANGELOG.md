# Changelog

Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões em [SemVer](https://semver.org/lang/pt-BR/).

## [2.0.0] - 2026-11-26

Versão maior: o arquivo de fluxo passa para o schema `chatbot-mapper/2` (arquivos `/1` abrem e são migrados sem perda) e a interface ganha identidade nova.

### Added
- Grupos como linhas coloridas em faixas, com recolher/expandir.
- Subfluxos reutilizáveis: passos "Chamar subfluxo" e "Voltar ao fluxo", trilha de navegação entre escopos.
- Busca de passos (`/`, `Ctrl+K`) e filtros por status, pergunta em aberto, comentário não resolvido e linha.
- Minimapa.
- Layout automático por faixas com redução de cruzamentos.
- Personas com valores de exemplo por variável; troca de persona no simulador e no simulador exportado.
- Cenários de teste: gravar no simulador, rodar todos, tocar no celular, motivo da falha, cobertura no mapa.
- Estimativa de volume de mensagens por caminho e calculadora mensal contra o pacote.
- Revisão para o cliente (`.revisao.html`) e importação das respostas com histórico por passo.
- Versões salvas e comparação com versão ou arquivo, com realce no mapa.
- Pendências exportáveis em `.csv`, `.md` e tabela para e-mail.
- Comentários com `@menção` e resolvido/não resolvido.
- Dicionário de dados com origem, campo, regra, tipo e exemplo; aviso de variável sem definição.
- Regras estruturadas nos cenários das ações, com frase gerada.
- Campos de template da Meta: categoria, idioma e status de aprovação.
- Especificação para desenvolvimento em `.spec.html` e `.spec.md`.
- Seleção múltipla (Shift+clique, laço) com ações em massa; copiar/colar entre fluxos; `Tab` cria o próximo passo ligado.
- Documentação: `PRODUCT.md`, `docs/architecture` (visão geral, modelo de dados, ADRs), `docs/specs` com critérios de aceite, spec do export `.docx` para a próxima etapa.

### Changed
- Identidade visual "mapa de metrô": estações com marcador de status por forma, ligações em traçado de metrô, barra de sinalização, fonte Barlow embutida, ícones SVG próprios, tema claro e escuro.
- Aba "Validar" passa a ser a seção Pendências da aba Revisão.
- `settings.sample` vira a persona "Padrão".
- `.meta-messages.json` passa para `chatbot-mapper/meta-messages/2` com `subflows`, `variables`, `call`/`return` e `cases[].when`.

### Fixed
- O simulador não rouba mais o foco de um campo em que a pessoa está digitando.

## [1.0.0] - 2026-11-25

### Added
- Mapa visual, simulador estilo WhatsApp, validação dos limites da Cloud API e exportações (JSON, payloads Meta, Markdown, documento e simulador em arquivo único).
- Ação do sistema com cenários: o bot responde direto conforme o resultado da consulta.

---
name: Chatbot Mapper
description: Mapa de metrô da conversa de um chatbot de WhatsApp — grupos são linhas, passos são estações, subfluxos são baldeações.
colors:
  sign-navy: "#0d1b2e"
  sign-navy-raised: "#16273f"
  sign-ink: "#ffffff"
  sign-mute: "#b7c3d4"
  sign-rule: "#2a3b55"
  map-ground: "#eceef1"
  panel: "#ffffff"
  panel-2: "#f5f6f8"
  panel-3: "#e9ecf0"
  ink: "#111923"
  ink-2: "#334050"
  mute: "#556070"
  line: "#d6dbe1"
  line-strong: "#aeb5bf"
  line-c1-blue: "#1f5bd6"
  line-c2-green: "#0b8a48"
  line-c3-red: "#d42b2b"
  line-c4-yellow: "#e3a000"
  line-c5-lilac: "#8a45c6"
  line-c6-teal: "#078fa3"
  line-c7-coral: "#e85d2c"
  line-c8-graphite: "#66727f"
  line-c0-unassigned: "#8b939c"
  err: "#c42323"
  err-bg: "#fdeceb"
  err-ink: "#8f1616"
  warn: "#a85800"
  warn-bg: "#fff3dc"
  warn-ink: "#7a4100"
  ok: "#0b7a40"
  ok-bg: "#e3f5ea"
  here-yellow: "#ffc21a"
  focus: "#1f5bd6"
  night-ground: "#0f1b2d"
  night-panel: "#151b24"
  night-panel-2: "#1b2330"
  night-panel-3: "#222b38"
  night-ink: "#e9eef4"
  night-ink-2: "#c5cfdb"
  night-mute: "#97a4b4"
  night-line: "#283342"
  night-line-strong: "#3c4a5c"
  night-sign: "#060a12"
  night-sign-raised: "#0f1826"
  night-sign-ink: "#f3f6fa"
  night-sign-mute: "#9fb0c6"
  night-sign-rule: "#1f2c40"
  night-c1-blue: "#5b8cff"
  night-c2-green: "#2fbf74"
  night-c3-red: "#ff5c54"
  night-c4-yellow: "#ffc233"
  night-c5-lilac: "#b47eff"
  night-c6-teal: "#2cc4da"
  night-c7-coral: "#ff8a5c"
  night-c8-graphite: "#9aa7b6"
  night-c0-unassigned: "#6f7b89"
  night-err: "#ff6b61"
  night-err-bg: "#3a1715"
  night-err-ink: "#ffc3bd"
  night-warn: "#ffb547"
  night-warn-bg: "#382810"
  night-warn-ink: "#ffd99c"
  night-ok: "#4ad48a"
  night-ok-bg: "#12301f"
  night-focus: "#7aa2ff"
  wa-wallpaper: "#efeae2"
  wa-bubble-bot: "#ffffff"
  wa-bubble-user: "#d9fdd3"
  wa-header: "#0f766e"
  wa-action: "#0a6c62"
typography:
  brand:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  body-sm:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.4
  control:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  line-sign:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.08em"
  section-label:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.07em"
  meta:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.35
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.88em"
rounded:
  xs: "3px"
  sm: "4px"
  r: "6px"
  card: "8px"
  lane: "10px"
  roundel: "12px"
  call: "22px"
  pill: "99px"
spacing:
  2xs: "4px"
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  pane: "18px"
  row-gap: "32px"
  lane-gap: "72px"
components:
  button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.r}"
    padding: "0 12px"
    height: "34px"
  button-hover:
    backgroundColor: "{colors.panel-2}"
  button-sm:
    height: "30px"
    padding: "0 10px"
  button-primary:
    backgroundColor: "{colors.sign-navy}"
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.r}"
    height: "34px"
    padding: "0 12px"
  button-primary-hover:
    backgroundColor: "{colors.sign-navy-raised}"
  button-on-sign:
    backgroundColor: "{colors.sign-ink}"
    textColor: "{colors.sign-navy}"
    rounded: "{rounded.r}"
    height: "34px"
  button-ghost-on-sign:
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.r}"
    height: "34px"
  button-ghost-on-sign-hover:
    backgroundColor: "{colors.sign-navy-raised}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "7px 10px"
    height: "36px"
  search-on-sign:
    backgroundColor: "{colors.sign-navy-raised}"
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.r}"
    height: "36px"
  chip:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "28px"
  chip-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
  station-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    width: "256px"
  interchange-card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.call}"
    width: "256px"
  roundel:
    backgroundColor: "{colors.line-c1-blue}"
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.roundel}"
    height: "24px"
    padding: "0 6px"
  status-badge:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
  topbar:
    backgroundColor: "{colors.sign-navy}"
    textColor: "{colors.sign-ink}"
    height: "56px"
  side-panel:
    backgroundColor: "{colors.panel}"
    width: "420px"
  tab-active:
    textColor: "{colors.ink}"
    typography: "{typography.control}"
  toast:
    backgroundColor: "{colors.sign-navy}"
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.card}"
    padding: "11px 16px"
---

# Design System: Chatbot Mapper

## Overview

**Creative North Star: "A Rede de Transporte"**

O fluxo de conversa é desenhado e lido como um mapa de metrô impresso. Cada grupo de passos é uma linha com cor própria, cada passo é uma estação, cada chamada de subfluxo é uma estação de baldeação. O analista segue a cor da linha, lê o estado de cada estação pelo formato do marcador e entra na baldeação para ver o subfluxo; em reunião projetada, o cliente acompanha o caminho sem precisar de legenda longa.

O sistema é denso e utilitário, com a calma de uma placa de sinalização: chão cinza-papel (à noite, azul-noite), superfícies brancas com régua de 1 px, uma única faixa azul-marinho no topo que faz o papel de placa, e toda a cor saturada reservada para as oito linhas. Tipografia de sinalização: Barlow em pesos fortes, nomes de linha em caixa alta espaçada, números tabulares em tudo. O simulador é a exceção deliberada: ele continua reconhecível como WhatsApp, porque é o que o cliente final verá.

A direção recusa explicitamente o editor de cards arredondados sobre fundo pontilhado com um acento verde.

**Key Characteristics:**
- Cor saturada só nas linhas (grupos); o resto da interface é tinta, cinza e azul-marinho.
- Status de estação por forma de marcador + rótulo, nunca só por cor.
- Ligações como traço de metrô: retas, diagonais de 45°, contorno na cor do chão nos cruzamentos.
- Barra superior como placa de sinalização: azul-marinho, texto branco, roundels numerados.
- Legível projetado: contraste alto, traço que não afina com o zoom, modo de estação distante.
- Tudo offline: fonte, ícones e estilos embutidos, sem rede.

## Colors

Paleta de sinalização de transporte: neutros frios e silenciosos, uma placa azul-marinho, e oito cores de linha saturadas e distintas que carregam toda a identidade de grupo. Há dois temas completos, claro (`data-theme="light"`, padrão) e escuro (`data-theme="dark"`); os tokens `night-*` são os valores do tema escuro.

### Primary
- **Azul-Marinho de Placa** (sign-navy): a barra superior, o botão primário, a barra de ação em massa e o toast. É a "placa" do sistema: aparece em faixas e superfícies de comando, nunca como cor de linha. Seu degrau elevado (sign-navy-raised) é o hover e o fundo da busca; sign-rule é a régua inferior de 3 px da barra e a borda dos controles sobre a placa; sign-mute é texto secundário e placeholder sobre a placa.

### Secondary
- **As Oito Linhas** (line-c1-blue, line-c2-green, line-c3-red, line-c4-yellow, line-c5-lilac, line-c6-teal, line-c7-coral, line-c8-graphite): uma por grupo, escolhida no seletor de amostras. Pintam a faixa da linha (a 7 % sobre o chão no claro, 3,5 % no escuro, borda a 22–26 %), o roundel numerado, a borda da estação, as portas e o traço das ligações. **Cinza Sem Linha** (line-c0-unassigned) é a cor de passos sem grupo. No tema escuro cada linha sobe de luminosidade (night-c1…c8) para manter o contraste sobre o chão azul-noite.

### Tertiary
- **Amarelo "Você Está Aqui"** (here-yellow): só marca posição e atenção momentânea: o halo da estação selecionada, o pulso da estação ativa no simulador, o realce de termo encontrado na busca, a borda do selo de pergunta em aberto e o anel de foco sobre a placa. Mesmo valor nos dois temas.

### Neutral
- **Chão de Mapa** (map-ground / night-ground): fundo do mapa e do corpo; também é a cor do contorno das ligações.
- **Painel** (panel, panel-2, panel-3): superfícies de cards, painel lateral, menus; panel-2 é hover e superfície recuada, panel-3 é pressionado, contadores e trilhos de barra.
- **Tinta** (ink, ink-2, mute): texto principal, texto secundário e metadados. ink também é o estado "ligado" de chips, segmentos e abas.
- **Réguas** (line, line-strong): divisores internos de 1 px e bordas de controles e contêineres flutuantes.
- **Estados com significado** (err/err-bg/err-ink, warn/warn-bg/warn-ink, ok/ok-bg): problemas de validação, avisos, sucesso de teste, diferenças de revisão. Sempre acompanhados de ícone ou rótulo.
- **Foco** (focus / night-focus): contorno de 2 px com afastamento de 2 px em todo `:focus-visible`.

### Simulador (mundo WhatsApp)
- **Papel de Parede** (wa-wallpaper), **Balão do Bot** (wa-bubble-bot), **Balão do Usuário** (wa-bubble-user), **Cabeçalho Verde-Petróleo** (wa-header), **Ação** (wa-action): escopados ao simulador `.cp-root` e ao simulador embutido nos exports. Não vazam para o mapa.

### Named Rules
**The Line Color Rule.** As cores c1–c8 existem só para identificar grupos. Nenhum botão, status, alerta ou destaque usa uma cor de linha. (A única exceção é o azul c1, que também é o azul de interação do sistema: foco, link, menção, seleção de texto, marquee e halo de campo focado.)

**The Shape Before Color Rule.** Status nunca é comunicado só por cor: cada estação mostra um marcador de forma diferente e cada selo traz rótulo. A cor da linha diz *a que grupo* a estação pertence; o marcador diz *em que estado* ela está.

**The Signage Band Rule.** O azul-marinho é a placa: barra superior, primário, barra em massa, toast. Ele não vira fundo de painel nem cor de card.

## Typography

**Display Font:** Barlow (com system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif)
**Body Font:** Barlow
**Label/Mono Font:** ui-monospace (SFMono-Regular, Menlo, Consolas) para nomes de variáveis, valores e código

**Character:** Uma grotesca de sinalização, levemente condensada, que aguenta ser lida de longe e projetada. Pesos 400/500/600/700 apenas; números tabulares ativos no corpo inteiro (`font-variant-numeric: tabular-nums`).

### Hierarchy
- **Brand** (700, 17px, −0.01em): nome do produto na placa.
- **Headline** (700, 17px, 1.3): cabeçalho do inspetor; dica de mapa vazio sobe a 19px.
- **Title** (700, 15px, −0.005em): título da estação, uma linha com reticências.
- **Body** (400, 15px, 1.45): texto base da interface; 14.5px em campos, itens de menu e listas.
- **Body small** (400, 13.5px, 1.4): texto da estação (até 3 linhas), portas, legendas, tabelas.
- **Control** (600, 14px): botões, abas (14.5px), trilha de escopo, chips (13.5px).
- **Line sign** (700, 13px, 0.08em, CAIXA ALTA): nome da linha na placa da faixa, ao lado do roundel.
- **Section label** (700, 12–13px, 0.07–0.08em, CAIXA ALTA): títulos de seção do painel, cabeçalhos de grupo de menu, selo "INÍCIO".
- **Meta** (400, 13px, 1.35): textos auxiliares, `small`, dicas de campo.

### Named Rules
**The Self-Hosted Barlow Rule.** Barlow é servida de `fonts/` (woff2, 400–700, latin + latin-ext, OFL) e embutida em base64 nos exports (`js/fonts-data.js`). Nunca carregar fonte de CDN: o produto roda via `file://`, sem internet.

**The Tabular Numbers Rule.** Contagens, números de estação, zoom e KPIs usam algarismos tabulares para que colunas e roundels não dancem.

## Layout

Aplicação de tela cheia, sem rolagem de página: placa de 56px no topo, mapa ocupando a área principal, painel lateral de 420px à direita (abas Editar · Simular · Testes · Dados · Revisão). Sobre o mapa flutuam, em contêineres de painel, a trilha de escopo e os filtros (topo, 10–12px das bordas) e, no rodapé, a legenda de marcadores, o minimapa (220×140) e o controle de zoom.

O mapa é organizado em faixas horizontais, uma por linha: cabeçalho de faixa de 52px com a placa (roundel + nome + recolher), estações em colunas de 340px com 32px entre estações empilhadas e 72px entre faixas. Faixa recolhida vira uma pílula de 116px de altura.

Ritmo de espaçamento em degraus pequenos (4, 6, 8, 10, 12, 14px); padding de painel 18px; gaps de grupo 2–10px. Densidade alta é intencional: é uma ferramenta de trabalho.

Responsivo: abaixo de 1180px os botões de organizar/apresentar viram só ícone; abaixo de 980px o painel desce para baixo do mapa (50% da altura) e somem minimapa e legenda; abaixo de 640px a placa rola horizontalmente e esconde ações secundárias.

Modo apresentação: esconde edição, abas e filtros; o painel fica com o simulador (até 480px) e títulos e textos de estação crescem (16.5px / 14.5px).

### Named Rules
**The Far Station Rule.** Abaixo de zoom k 0.55 o mapa entra em modo de estação distante: cada card mostra só marcador + nome (até duas linhas), em tamanho constante na tela (escalado por `--sc = 1/k`); texto, portas, rodapé e sombras somem. O mapa inteiro continua legível de longe.

## Elevation & Depth

Híbrido discreto: o chão e as faixas são planos e tonais; só o que se levanta do mapa (estações, controles flutuantes, menus, toast) ganha sombra suave e difusa. Não há sombras duras nem deslocadas. O estado de seleção é comunicado por anéis concêntricos (painel, tinta, halo amarelo), não por sombra mais escura.

### Shadow Vocabulary
- **Repouso** (`--shadow`; claro `0 1px 2px rgba(0,0,0,.07), 0 4px 14px rgba(0,0,0,.07)`; escuro `0 1px 2px rgba(0,0,0,.45), 0 6px 18px rgba(0,0,0,.35)`): estações, trilha, filtros, legenda, zoom, minimapa, pílula de faixa.
- **Elevado** (`--shadow-up`; claro `0 2px 4px rgba(0,0,0,.09), 0 12px 28px rgba(0,0,0,.14)`; escuro `0 2px 6px rgba(0,0,0,.5), 0 14px 34px rgba(0,0,0,.5)`): hover de estação, menus, resultados de busca, barra em massa, toast.
- **Anel de seleção** (`0 0 0 2px panel, 0 0 0 4.5px ink, 0 0 0 9px here 70%`): estação selecionada.

### Named Rules
**The Flat Ground Rule.** Chão, faixas e painel lateral não têm sombra. Profundidade é só para o que flutua sobre o mapa.

## Shapes

Cantos discretos de sinalização: 6px em botões, campos, contêineres flutuantes e listas; 8px em estações, menus e toast; 4px em chips, selos e trilha; 10px nas faixas. Formas circulares carregam significado de rede: roundels (pílula de 24px de altura), portas de 14px, marcadores de estação de 16px. Réguas de 1px em tudo; 2px na borda da estação (na cor da linha); 3px na régua da placa e nas abas ativas.

A estação de baldeação (chamada de subfluxo) tem silhueta própria: borda dupla de 6px e cantos de 22px, como o anel duplo de um mapa de metrô. Estação sem cobertura de teste usa borda tracejada.

Ligações são SVG: traço com pontas e junções arredondadas, segmentos retos e diagonais de 45°, cantos chanfrados de 16px nos desvios.

### Named Rules
**The Constant Stroke Rule.** O traço da ligação nunca afina com o zoom: largura `max(5px, 4px/k)` no mundo, ou seja, no mínimo 4px na tela, com contorno `max(9px, 8px/k)` na cor do chão. A cor é sempre a da linha do passo de origem; tracejado 9/7 marca caminho de falha, pontilhado 1/8 marca entrada inválida.

## Components

### Buttons
Sólidos, compactos e retos, como botões de painel de controle.
- **Shape:** cantos discretos (6px), altura 34px (30px no tamanho pequeno), borda line-strong de 1px.
- **Default:** fundo panel, texto ink, 600 14px, ícone de 16px com gap de 6px.
- **Primary:** azul-marinho de placa com texto branco; no tema escuro inverte para fundo ink e texto sign. Sobre a placa, o primário é branco com texto azul-marinho.
- **Hover / Active:** fundo panel-2 e borda ink-2; pressionado panel-3; transição de 150ms em fundo, borda e cor.
- **Ghost na placa:** transparente com texto branco; hover sign-navy-raised com borda sign-rule.
- **Danger:** texto err; hover com borda err e fundo err-bg.
- **Icon button:** 28px quadrado, sem borda, cor mute; hover panel-3 e ink.
- **Link button:** texto c1 sublinhado (1px, afastamento 3px), engrossa para 2px no hover.

### Chips
- **Style:** 28px, cantos de 4px, sem fundo, 600 13.5px ink-2, dentro de um contêiner de filtros com borda line-strong.
- **State:** hover panel-2; pressionado (`aria-pressed`) inverte para fundo ink e texto panel, e o marcador de status inverte junto.

### Cards / Containers (Estação)
- **Corner Style:** 8px; baldeação 22px com borda dupla de 6px.
- **Background:** panel; borda de 2px na cor da linha.
- **Shadow Strategy:** Repouso, Elevado no hover, anel de seleção quando selecionada; estação ativa pulsa um halo amarelo de 1.6s.
- **Structure:** cabeçalho (marcador de status + título + ícone de tipo), texto até 3 linhas, portas de saída com régua superior, rodapé de selos.
- **Internal Padding:** 10–12px.

### Inputs / Fields
- **Style:** borda line-strong de 1px, fundo panel, cantos de 6px, altura mínima 36px, 14.5px. Rótulo de campo 700 13px ink-2 acima.
- **Focus:** borda ink + halo de 3px em c1 a 22%.
- **Error:** borda err; contador de caracteres excedido fica err em 700.
- **Busca na placa:** fundo sign-navy-raised, borda sign-rule, placeholder sign-mute, atalho de teclado à direita.

### Navigation
- **Placa (barra superior):** 56px, azul-marinho, régua inferior de 3px sign-rule; marca, nome do fluxo editável, busca central, grupos de ações. Foco sobre a placa usa contorno amarelo.
- **Abas do painel:** 600 14.5px mute; ativa em ink com régua inferior de 3px ink.
- **Trilha de escopo:** contêiner panel flutuante com itens de 28px; o atual fica em panel-2.

### Marcadores de estação (assinatura)
SVG de 16px, cor ink (mute quando a definir):
- **A definir:** círculo tracejado ("em obras").
- **Em validação:** anel com ponto central.
- **Aprovado:** disco cheio com check.
- **Baldeação:** anel duplo.

### Placa de linha e roundel (assinatura)
Na faixa: roundel numerado (pílula de 24px na cor da linha, texto branco 700 13px; texto escuro sobre a linha amarela) + nome da linha em caixa alta espaçada + contagem. Mesmo roundel na marca, na revisão exportada e no documento.

### Selos
Cantos de 4px, 600 12.5px, borda tonal a 35–40%: erro, aviso, pergunta em aberto (amarelo), novo (ok), alterado (warn), cobertura (neutro). Sempre com ícone ou texto.

### Simulador
Celular estilo WhatsApp: papel de parede bege com padrão sutil, balões branco e verde-claro com cauda reta, cabeçalho verde-petróleo, botões de resposta brancos em texto verde, composer arredondado, confirmação de leitura. Fonte do sistema, não Barlow. Mantém-se fiel ao WhatsApp porque é o que o cliente aprova.

## Do's and Don'ts

### Do:
- **Do** usar c1–c8 exclusivamente para identificar grupos (faixa, roundel, borda de estação, porta, ligação).
- **Do** comunicar status por marcador de forma (tracejado, anel, cheio com check, anel duplo) mais rótulo.
- **Do** desenhar ligações com retas e diagonais de 45°, traço de no mínimo 4px na tela e contorno na cor do chão.
- **Do** mudar para estação distante (marcador + nome em tamanho constante) abaixo de zoom k 0.55.
- **Do** servir Barlow de `fonts/` e embutir em base64 nos exports; nada de rede.
- **Do** manter o simulador reconhecível como WhatsApp, com sua paleta escopada.
- **Do** definir cada novo valor nos dois temas (`:root` e `[data-theme="dark"]`).
- **Do** usar números tabulares em toda contagem e numeração.

### Don't:
- **Don't** voltar ao editor de cards arredondados sobre fundo pontilhado com acento verde.
- **Don't** usar uma cor de linha para botão, alerta, status ou destaque.
- **Don't** comunicar status apenas por cor.
- **Don't** deixar o traço das ligações afinar ao afastar o zoom.
- **Don't** carregar fontes ou ícones de CDN.
- **Don't** aplicar a identidade de metrô dentro do simulador.
- **Don't** usar sombras duras ou deslocadas; profundidade é só a sombra difusa de Repouso/Elevado.

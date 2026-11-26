---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface: editor do Chatbot Mapper (index.html)

Mode: Operate. Users: analista na mesa e em reunião projetada; cliente aprovador vê exports. Task: desenhar, simular, testar e validar o fluxo; achar qualquer passo em segundos.

Roll: degraded (serviço de rolagem inacessível; sem desafiantes). Assigned was candidate 6 (ficha fiscal + canhoto); user chose the pick card (mapa de metrô).

## Direction contract

THESIS: O fluxo é uma rede de transporte: grupos são linhas coloridas, passos são estações, subfluxos são baldeações. Recusa o editor de cards arredondados sobre fundo pontilhado com um acento verde.

OWN-WORLD: Chão de mapa impresso (cinza-papel claro; à noite, azul-noite). Oito cores de linha saturadas e distintas (azul, verde, vermelha, amarela, lilás, turquesa, coral, grafite) só para grupos. Barra superior de sinalização: faixa azul-marinho escura com texto branco e roundels numerados. Cantos de 6 px, linhas de 1 px, tipografia de sinalização: sans do sistema em peso forte, rótulos de linha em caixa alta com espaçamento, números tabulares.

STORY: O analista lê o mapa como lê um mapa de metrô: segue a cor da linha, vê o estado de cada estação pelo marcador, entra na baldeação para ver o subfluxo, busca uma estação pelo nome. Em reunião, o cliente entende o caminho sem legenda longa.

FIRST VIEWPORT: Barra de sinalização (marca com roundels, nome do fluxo, busca central, desfazer, adicionar, organizar, exportar, apresentar, tema). Mapa ocupa a área principal com faixas de linha horizontais (placa da linha à esquerda: roundel + nome + recolher). Painel direito 400 px com abas Editar · Simular · Testes · Dados · Revisão. Minimapa e zoom no canto inferior direito; filtros e trilha de escopo no topo do mapa. Ação primária: "+ Passo" na barra.

FORM: Signature move = ligações desenhadas como linhas de metrô: trechos retos e diagonais de 45°, traço grosso na cor da linha do passo de origem, contorno na cor do chão onde cruzam; marcador de estação por status (a definir = tracejado "em obras", em validação = anel, aprovado = cheio com check); chamada de subfluxo = estação de baldeação (anel duplo). Position: pick card (meu candidato 1); roll assigned candidate 6. seed:c3a186f7284f21df

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

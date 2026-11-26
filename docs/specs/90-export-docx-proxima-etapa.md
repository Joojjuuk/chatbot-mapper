# Spec: Export da especificação em .docx

**Data:** 2026-11-26 · **Status:** Draft (próxima etapa) · **Relacionadas:** spec 04 (FR-5)

## Context
A especificação para desenvolvimento já sai em `.md` e `.html` (spec 04). Equipes que trabalham em Word pedem `.docx` editável. O documento deve ser genérico e objetivo: nenhuma marca de empresa, nenhum texto de venda, só fatos do fluxo.

## Functional Requirements
- FR-1: O app MUST gerar `.docx` válido (OOXML) no navegador, sem dependências e sem internet, empacotando os XML num ZIP sem compressão (método STORE) com CRC-32 calculado em JS.
- FR-2: O documento MUST ter, nesta ordem:
  1. Capa: nome do fluxo, descrição, data de geração, número de passos, % aprovado.
  2. Resumo: tabela de status (aprovado, em validação, a definir) e lista de pendências.
  3. Passos: tabela `# | Grupo | Passo | Tipo | Texto | Saídas → destino | Status`.
  4. Regras dos cenários: tabela `Ação | Sistema | Cenário | Condições | Destino`.
  5. Integrações: uma linha por sistema citado em nós de ação, com os passos que o usam.
  6. Dicionário de dados: `Variável | Rótulo | Origem | Campo | Regra | Tipo | Exemplo`.
  7. Templates da Meta: `Nome | Categoria | Idioma | Status | Corpo com {{1}}…`.
  8. Subfluxos: nome, início, quem chama.
  9. Cenários de teste: nome, passos, resultado da última execução.
- FR-3: Estilos MUST usar só os estilos nativos do Word (Título 1/2, Tabela com grade), fonte padrão do Word, sem cores de marca.
- FR-4: O documento MUST NOT incluir comentários internos nem notas marcadas como internas.
- FR-5: Variáveis `{{x}}` MUST aparecer em fonte monoespaçada.

## Non-Functional Requirements
- NFR-C1: O arquivo MUST abrir sem aviso de reparo no Word 2016+, LibreOffice 7+ e Google Docs.
- NFR-P1: Fluxo de 200 passos MUST gerar em menos de 1 s.

## Acceptance Criteria
### AC-1: verificação manual (FR-1, FR-2, FR-3, FR-4)
Given o fluxo de exemplo, When exportar .docx, Then o Word abre sem reparo e mostra as 9 seções.
### AC-2: verificação manual (FR-1)
Given um ZIP gerado, When validado com `unzip -t`, Then sem erros de CRC.
### AC-3: verificação manual (FR-5)
Given texto com `<`, `&` e emoji, Then aparecem corretos (XML escapado, UTF-8).

## Edge Cases and Error Scenarios
- EC-1: Seção sem dados MUST mostrar "Nenhum item." em vez de tabela vazia.
- EC-2: Textos com quebra de linha MUST virar `<w:br/>`.

## API Contracts
`Exporters.specDOCX(flow) → Blob`. Reaproveita o mesmo modelo de dados de `Exporters.specModel(flow)` usado pelo `.spec.md`/`.spec.html`.

## Data Models
N/A — consome o modelo existente.

## Out of Scope
- OS-1: Modelos `.dotx` personalizados e logotipos.
- OS-2: Importar `.docx` de volta.

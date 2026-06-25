# Pontos de atencao para revisao futura

Documento para reunir achados que nao precisam bloquear o desenvolvimento atual, mas devem voltar ao radar antes de endurecer a arquitetura, homologar fiscalmente ou preparar uso real.

Data de abertura: 2026-06-09.

## Arquitetura e acoplamento

### Contratos fiscais importados por model

- Arquivo: `backend/src/models/fiscal-documents/fiscal-documents.model.ts`
- Achado: o model importa tipos de `backend/src/integrations/fiscal/fiscal-provider.ts`.
- Risco: mesmo sendo apenas tipos, o model passa a conhecer uma camada de integracao externa.
- Impacto atual: baixo; nao foi observado ciclo de execucao.
- Direcao sugerida: mover contratos compartilhados de documento fiscal para pasta neutra, como `backend/src/shared` ou `backend/src/domain`.

### Integracao PDF importando tipos do model

- Arquivos:
  - `backend/src/integrations/pdf/quote-pdf.ts`
  - `backend/src/integrations/pdf/templates/quote-pdf-template.ts`
- Achado: a integracao PDF importa tipos de `backend/src/models/quotes/quotes.model.ts`.
- Risco: a integracao externa passa a conhecer detalhes de persistencia/model.
- Impacto atual: baixo; nao foi observado ciclo de execucao.
- Direcao sugerida: criar um contrato de entrada do PDF em camada neutra, mapeado pelo controller antes de chamar a integracao.

## Contratos HTTP e erros operacionais

### Mensagens de erro em ingles em alguns controllers

- Arquivos observados:
  - `backend/src/controllers/clients/clients.controller.ts`
  - `backend/src/controllers/products/products.controller.ts`
  - `backend/src/controllers/payment-methods/payment-methods.controller.ts`
- Exemplos:
  - `Client not found`
  - `Product not found`
  - `Payment method not found`
- Risco: experiencia inconsistente para usuario/operador, pois o restante do sistema usa mensagens em portugues.
- Impacto atual: baixo a medio.
- Direcao sugerida: padronizar mensagens em portugues em recorte pequeno.

### Parametros invalidos de paginacao retornam 400 por padrao

- Arquivo: `backend/src/views/products/products.routes.ts`
- Achado: `Invalid page parameter` e `Invalid limit parameter` usam `new AppError(...)` sem status explicito, caindo no padrao `400`.
- Impacto atual: baixo.
- Direcao sugerida: decidir se filtros/query invalidos devem continuar como `400` ou seguir o padrao de validacao `422`.

### Estoque insuficiente exige decisao explicita

- Fluxos observados:
  - ajuste que deixaria estoque negativo;
  - venda sem estoque suficiente;
  - reserva para retirada sem estoque suficiente;
  - aprovacao ou conclusao de pedido para envio sem estoque suficiente.
- Resultado atual: por padrao o backend retorna `422 Unprocessable Entity`; quando o frontend envia a confirmacao explicita, a operacao segue e o historico fica associado ao usuario autenticado.
- Observacao: comportamento funcional aprovado para permitir excecoes operacionais reais da loja sem esconder o risco.
- Acao futura: revisar se a tela deve destacar visualmente operacoes feitas com falta de estoque nos historicos gerenciais.

### Descontos fiscais precisam de validacao continua

- Estado atual: orcamentos e vendas trabalham com desconto direto em valor, incluindo desconto geral e desconto por item no fluxo de orcamento.
- Ajuste feito: o provider Focus envia `valor_produtos` bruto e `valor_desconto` total e por item.
- Risco: novas rejeicoes da SEFAZ/Focus podem exigir ajustes de CFOP/CST ou tratamento diferente conforme regime fiscal.
- Acao futura: validar manualmente NF-e em homologacao com desconto geral, desconto por item e venda originada de pedido para envio.

## Dados de validacao local

### Dados parciais criados em tentativas manuais

- Prefixos:
  - `VAL-20260609114643`
  - `VAL-20260609114803`
- Motivo: primeiras execucoes do roteiro manual pararam ao encontrar expectativas incorretas de status HTTP.
- Impacto atual: dados locais de desenvolvimento apenas.
- Acao futura: remover somente se o usuario confirmar limpeza do banco local.

### Dados completos de validacao

- Prefixo:
  - `VAL-20260609114952`
- Motivo: execucao manual integrada concluida.
- Impacto atual: dados locais de desenvolvimento usados para rastreabilidade.
- Acao futura: manter para consulta ou limpar com confirmacao.

## Frontend e experiencia

### Frontend sem testes automatizados

- Achado: nao ha arquivos de teste do frontend nem script `test` no `frontend/package.json`.
- Impacto: regressões de UI/UX dependem de validação manual.
- Direcao sugerida: quando a UI estabilizar, adicionar testes para componentes/fluxos mais criticos:
  1. autenticacao;
  2. venda de balcao;
  3. orcamentos;
  4. notas fiscais;
  5. estoque.

### Formularios ainda usam elementos HTML nativos

- Arquivos com ocorrencias:
  - `frontend/src/auth/LoginPage.tsx`
  - `frontend/src/views/catalog/CatalogPages.tsx`
  - `frontend/src/views/sales/SalesPages.tsx`
  - `frontend/src/views/quotes/QuotesPage.tsx`
  - `frontend/src/views/stock/StockPages.tsx`
  - `frontend/src/views/finance/FinancePages.tsx`
- Achado: muitos formularios ainda usam `input`, `select` e `textarea` nativos.
- Risco: experiencia visual inconsistente com o padrao definido de MUI Material.
- Impacto atual: medio para UI/UX, baixo para regras de negocio.
- Direcao sugerida: migrar por tela/funcao, priorizando telas mais usadas:
  1. venda de balcao;
  2. orcamentos;
  3. notas fiscais;
  4. produtos;
  5. estoque.

### Botoes nativos ainda existem em componentes de shell

- Arquivos:
  - `frontend/src/components/shell.tsx`
  - `frontend/src/components/AppWorkspaceHeader.tsx`
- Achado: existem `button` nativos em areas estruturais da UI.
- Risco: comportamento visual/acessibilidade inconsistente com MUI.
- Impacto atual: baixo.
- Direcao sugerida: migrar para `Button`/`IconButton` MUI em recorte visual proprio.

### Bundle frontend acima de 500 kB

- Comando: `npm run build` no frontend.
- Resultado: build passa, mas Vite alerta chunk acima de 500 kB.
- Impacto atual: baixo para fase de desenvolvimento.
- Direcao sugerida: avaliar code splitting quando a UI estiver mais estavel.

### Validacao manual visual ainda pendente

- O roteiro manual validou a API e os fluxos por HTTP.
- Ainda falta conferir no navegador:
  - responsividade das tabelas;
  - clareza da tela `Financeiro > Notas fiscais`;
  - fluxo de PDF no browser;
  - experiencia de venda/orcamento/reserva usando apenas a UI.

## Fiscal

### NFC-e bloqueada temporariamente

- Estado atual: rotas de emissao aceitam apenas `NFE`.
- Motivo: provider implementado usa endpoint de NF-e.
- Direcao sugerida: implementar NFC-e separadamente com endpoints e payloads proprios, quando a decisao fiscal for fechada.

### Homologacao Focus validada

- Estado atual: provider Focus validado em homologacao para venda de balcao, pedido para envio e reserva para retirada.
- Fluxos ja validados:
  1. emissao de NF-e;
  2. sincronizacao ate retorno autorizado;
  3. download de XML e DANFE;
  4. cancelamento de NF-e autorizada;
  5. rejeicao controlada com `mensagem_sefaz`.
- Ajuste feito apos homologacao: o provider Focus passou a priorizar `payload.status` antes do status HTTP, evitando classificar `erro_autorizacao` como autorizacao.
- Reemissao apos rejeicao foi coberta em teste para mock e Focus.
- Configuracao fiscal operacional da loja ja existe no sistema.
- Trava implementada: producao exige confirmacao textual `EMITIR EM PRODUCAO` na UI/API, checklist visual e segue bloqueada se `allow_production` estiver desligado.
- Ponto ainda aberto: executar checklist manual final antes de qualquer emissao real em producao.

### Campos fiscais adicionais podem surgir

- Estado atual: sistema exige os campos basicos de cliente/produto antes de emitir com Focus.
- Risco: Focus/SEFAZ pode exigir campos fiscais adicionais conforme regime, CFOP, CST, destino e natureza da operacao.
- Direcao sugerida: tratar rejeicoes de homologacao como backlog fiscal guiado por caso real.

## Documentacao

### Pasta `docs/` ignorada pelo Git

- Achado: `.gitignore` ignora `docs/`.
- Impacto: documentos de validacao e planejamento ficam locais e nao entram em commits.
- Direcao sugerida: decidir se documentos do projeto devem ser versionados. Se sim, ajustar `.gitignore` conscientemente.

### Configuracao de formatação citada, mas ausente

- Arquivo: `ai.md`
- Achado: as regras mencionam aderir ao `.prettierrc`, mas nao ha `.prettierrc`, `prettier.config.*` nem dependencia/script de Prettier rastreado no repositorio.
- Impacto: formatacao fica dependente do editor/local machine, o que pode gerar churn em commits.
- Direcao sugerida: adicionar configuracao e script de formatacao em recorte proprio, ou ajustar `ai.md` para refletir o padrao real.

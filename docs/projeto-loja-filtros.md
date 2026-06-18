# Sistema Loja de Filtros

## Objetivo

Construir um sistema operacional para uma nova filial pequena dedicada a venda de filtros, com fluxo semelhante ao usado hoje no GestaoClick, mas reduzido ao que a loja realmente precisa: estoque, vendas, caixa, entradas e saidas de mercadoria, financeiro basico, relatorios gerenciais e emissao fiscal.

O sistema sera independente do GestaoClick atual. Nao havera sincronizacao de produtos, clientes, estoque ou vendas com a operacao existente.

## Contexto

A loja atual usa o GestaoClick, mas a nova filial tera uma operacao mais enxuta. Contratar outro acesso ou modulo do sistema atual teria custo alto para uma loja que nao precisa de todo o ERP.

Mesmo sendo um sistema novo, a experiencia deve preservar conceitos familiares ao fluxo atual:

- Clientes
- Fornecedores
- Produtos
- Vendas
- Compras
- Recebimentos
- Pagamentos
- Formas de pagamento
- Usuarios
- Lojas
- Notas fiscais
- Relatorios

## Escopo Essencial

### Cadastros

- Clientes
- Fornecedores
- Produtos
- Marcas
- Categorias ou grupos de produtos
- Formas de pagamento
- Usuarios
- Permissoes de usuarios
- Dados fiscais da loja

### Produtos e Estoque

- Cadastro de produto com codigo interno, codigo de barras, nome, marca, fornecedor, unidade, custo, preco de venda, margem, estoque minimo e dados fiscais.
- Produtos diferentes podem compartilhar o mesmo codigo, desde que sejam diferenciados por marca, fornecedor ou outro identificador interno.
- Controle de estoque apenas da loja nova.
- Entradas de mercadoria.
- Saidas por venda.
- Ajustes manuais com motivo.
- Historico de movimentacoes.
- Alerta de estoque baixo.

### Compras e Entrada de Mercadoria

- Entrada manual de mercadoria.
- Entrada por importacao de XML de NF-e.
- Vinculo com fornecedor.
- Atualizacao de custo e estoque.
- Historico de compras.

### Vendas

- Venda de balcao como fluxo principal.
- Reserva ou pre-venda para cliente retirar depois.
- Venda imediata com baixa de estoque.
- Cancelamento de venda.
- Devolucao ou estorno de itens.
- Descontos.
- Registro de forma de pagamento.
- Emissao fiscal vinculada a venda.

### Caixa

- Abertura de caixa.
- Fechamento de caixa.
- Sangria.
- Suprimento.
- Resumo por forma de pagamento.
- Conferencia de valores.
- Registro de divergencias.

### Financeiro

- Recebimentos.
- Pagamentos.
- Controle por forma de pagamento.
- Suporte inicial para PIX, cartao de debito e boleto bancario.
- Cartao de credito fica como decisao pendente.
- Venda a prazo ou crediario ainda depende de confirmacao.

### Fiscal

- Emissao de nota fiscal desde a primeira versao.
- Suporte fiscal deve considerar venda de balcao e venda com retirada.
- Fluxos esperados:
  - Emitir nota
  - Cancelar nota
  - Consultar status
  - Armazenar chave, numero, serie, protocolo e XML/PDF quando aplicavel
- A definicao exata entre NFC-e, NF-e ou ambas ainda precisa ser fechada.

### Relatorios

Relatorios gerenciais sao prioridade.

Primeiros relatorios:

- Vendas por periodo
- Vendas por produto
- Produtos mais vendidos
- Estoque atual
- Estoque baixo
- Entradas e saidas de mercadoria
- Faturamento por forma de pagamento
- Fechamento de caixa
- Compras por periodo

Relatorios posteriores:

- Margem por produto
- Lucro bruto
- Giro de estoque
- Curva ABC
- Sugestao de compra

## Fluxos Principais

### Venda de Balcao

1. Usuario abre o caixa.
2. Busca produto por codigo, codigo de barras, nome, marca ou fornecedor.
3. Adiciona itens a venda.
4. Aplica desconto se necessario.
5. Seleciona forma de pagamento.
6. Confirma venda.
7. Sistema baixa estoque.
8. Sistema registra recebimento.
9. Sistema emite documento fiscal, quando exigido.
10. Venda fica disponivel nos relatorios.

### Reserva ou Pre-venda

1. Usuario cria uma reserva para um cliente.
2. Adiciona produtos.
3. Sistema pode bloquear ou apenas sinalizar a quantidade reservada.
4. Cliente comparece para retirada.
5. Usuario converte reserva em venda.
6. Sistema segue o fluxo normal de venda de balcao.

### Entrada Manual de Mercadoria

1. Usuario seleciona fornecedor.
2. Informa produtos e quantidades.
3. Informa custo de compra.
4. Confirma entrada.
5. Sistema atualiza estoque.
6. Sistema registra movimentacao e historico de custo.

### Entrada por XML

1. Usuario importa XML da NF-e de compra.
2. Sistema identifica fornecedor.
3. Sistema lista produtos encontrados.
4. Usuario vincula produtos do XML aos produtos cadastrados ou cria novos produtos.
5. Sistema confirma quantidades e custos.
6. Sistema atualiza estoque.
7. Sistema armazena dados da nota de compra.

### Fechamento de Caixa

1. Usuario informa valores conferidos por forma de pagamento.
2. Sistema compara com vendas e recebimentos registrados.
3. Sistema exibe diferencas.
4. Usuario registra observacao se houver divergencia.
5. Caixa e fechado e bloqueado para novas operacoes.

## Decisoes Iniciais de Produto

- O sistema sera independente do GestaoClick.
- A loja controlada sera apenas a nova filial.
- O fluxo principal sera venda de balcao.
- Reservas/pre-vendas serao consideradas no fluxo.
- Entrada de mercadoria sera manual e tambem por XML.
- Todos os usuarios poderao nascer com permissao total, mas o sistema tera estrutura para controle de permissoes.
- Relatorios gerenciais entram desde as primeiras fases.
- Busca por aplicacao de veiculo ou maquina e uma boa ideia, mas nao e essencial para a primeira entrega.
- O backend sera construido em TypeScript com Node.js.
- O backend usara Express, Knex e PostgreSQL.
- O desenvolvimento comecara pelo backend.
- A arquitetura seguira camadas inspiradas em MVC, com separacao entre views/rotas, controllers, models e servicos externos.
- Chamadas ciclicas entre camadas sao proibidas.
- Chamadas externas, principalmente fiscais, devem ficar isoladas em pastas proprias.
- O projeto adotara postura de revisao de PR, commits curtos e entregas escalonadas.

## Pontos Pendentes

- Confirmar se a emissao fiscal sera NFC-e, NF-e ou ambas.
- Confirmar se havera venda a prazo, crediario ou conta de cliente.
- Confirmar se cartao de credito entrara no MVP.
- Definir se reserva de produto deve bloquear estoque ou apenas indicar quantidade reservada.
- Definir se boleto sera apenas registrado como forma de pagamento ou se havera integracao bancaria.
- Definir se o sistema precisara funcionar offline ou se sempre tera internet.
- Definir se havera leitor de codigo de barras e impressora fiscal/nao fiscal.

## Fases Sugeridas

### Fase 1 - Base Operacional

- Login
- Usuarios
- Permissoes simples
- Cadastro de clientes
- Cadastro de fornecedores
- Cadastro de produtos
- Cadastro de marcas/grupos
- Formas de pagamento
- Estoque atual

### Fase 2 - Estoque e Compras

- Entrada manual de mercadoria
- Ajuste de estoque
- Historico de movimentacoes
- Importacao de XML de compra
- Vinculo de produtos do XML com cadastro interno

### Fase 3 - PDV e Caixa

- Venda de balcao
- Reserva/pre-venda
- Cancelamento
- Devolucao
- Abertura de caixa
- Sangria e suprimento
- Fechamento de caixa

### Fase 4 - Fiscal

- Configuracoes fiscais da loja
- Emissao fiscal
- Cancelamento fiscal
- Consulta de status
- Armazenamento de XML/PDF e dados da nota

### Fase 5 - Relatorios e Refinamento

- Relatorios de vendas
- Relatorios de estoque
- Relatorios de caixa
- Relatorios de compras
- Indicadores gerenciais
- Margem e lucro bruto

## Estado Atual do Projeto

### Backend

- Login/autenticacao com usuario inicial.
- Produtos, fabricantes, fornecedores e clientes.
- Estoque atual, entrada manual, ajuste manual, historico e reposicao.
- Formas de pagamento.
- Caixa com abertura e fechamento basico.
- Vendas de balcao com multiplos itens.
- Pedidos para envio.
- Reservas para retirada.
- Orcamentos com multiplos itens, PDF via Puppeteer e conversao para envio.
- NF-e com Focus em homologacao:
  - emissao;
  - sincronizacao;
  - XML/DANFE;
  - cancelamento;
  - rejeicao controlada;
  - reemissao apos rejeicao;
  - correcao de status real vindo da Focus;
  - bloqueios para evitar duplicidade entre venda operacional, envio e retirada.
- Configuracao fiscal central da loja com trava explicita para producao.
- Relatorios gerenciais iniciais.
- Ultima validacao backend registrada nesta revisao: `npm test` com 60 testes passando.

### Frontend

- Reformulacao visual grande concluida.
- MUI Material e Tailwind CSS integrados.
- Sidebar, shell, paginas financeiras e fiscais refatoradas.
- Tela central de NF-e com fila, documentos emitidos e paginacao.
- Checklist visual antes de liberar emissao fiscal em producao.
- Ainda existem telas grandes a refatorar, principalmente vendas e orcamentos.
- Ainda nao ha testes frontend automatizados.

## Plano Inicial vs Entregue

### Fase 1 - Base Operacional

Estado: praticamente entregue.

- Login, usuarios, clientes, fornecedores, produtos, fabricantes, pagamentos e estoque estao implementados.

### Fase 2 - Estoque e Compras

Estado: parcialmente entregue.

- Entrada manual, ajuste, reposicao e historico estao implementados.
- Falta importacao de XML de compra.
- Falta historico de compras mais formal.

### Fase 3 - PDV e Caixa

Estado: parcialmente entregue.

- Venda de balcao, reserva, envio, baixa de estoque e cancelamentos principais existem.
- Caixa ja possui abertura, fechamento, divergencia e base backend de sangria/suprimento.
- Falta devolucao/estorno de itens.
- Desconto em venda de balcao entregue no backend e no frontend.

### Fase 4 - Fiscal

Estado: avancada em homologacao para NF-e.

- NF-e Focus funcionando em homologacao para venda de balcao, pedido para envio e reserva para retirada.
- Configuracao fiscal da loja ja existe em tela/tabela.
- Producao exige confirmacao textual e checklist visual antes de liberar emissao.
- NFC-e segue fora do escopo por enquanto.

### Fase 5 - Relatorios

Estado: inicial entregue.

- Overview gerencial existe.
- Falta aprofundar relatorios de vendas, compras, caixa, margem/lucro e curva ABC.

## Pontos de Atencao Atuais

- Decidir se `docs/` deve entrar definitivamente no Git, pois os documentos do projeto viraram fonte importante de planejamento.
- Frontend ainda precisa continuar a quebra por modulos, principalmente `SalesPages.tsx` e `QuotesPage.tsx`.
- Ainda nao ha testes frontend automatizados.
- Fiscal esta bom para homologacao, mas antes de producao precisa validacao manual final com checklist rigido e dados reais da empresa.
- Campos fiscais adicionais podem surgir conforme rejeicoes reais da SEFAZ/Focus.

## Rumo Recomendado

### 1. Fechar o ciclo fiscal MVP

- Atualizar documentacao conforme os testes manuais e tecnicos avancarem.
- Melhorar a tela de detalhes da NF-e e a leitura de rejeicoes.
- Validar manualmente, no navegador, os fluxos de NF-e para balcao, envio e retirada.
- Manter producao bloqueada ate checklist fiscal final ser cumprido.

### 2. Completar PDV/Caixa

- Expor sangria e suprimento na tela de caixa.
- Cancelamento, estorno e devolucao por item.
- Fechamento de caixa com conferencia real por forma de pagamento.

### 3. Compras

- Entrada por XML de NF-e de compra.
- Vincular itens do XML a produtos.
- Atualizar custo e estoque a partir da compra.

### 4. Relatorios

- Vendas por periodo e produto.
- Estoque atual e estoque baixo.
- Caixa por periodo.
- Margem, lucro e curva ABC em fase posterior.

## Observacoes Sobre Modelagem

Produtos precisam ser modelados com cuidado porque o mesmo codigo pode existir em produtos de marcas ou fornecedores diferentes. O sistema nao deve assumir que codigo de produto e unico globalmente.

Uma abordagem segura:

- `produto.id` como identificador interno unico.
- `codigo_interno` pode se repetir se a operacao exigir.
- `codigo_barras` pode ser unico quando existir, mas deve aceitar vazio.
- Marca e fornecedor devem fazer parte da identificacao operacional.
- Historico de custo deve ser preservado para relatorios de margem.

Para fiscal, os produtos devem armazenar ao menos:

- NCM
- CEST quando aplicavel
- Unidade
- Origem
- CFOP ou regra fiscal aplicavel
- Aliquotas/regime conforme decisao da integracao fiscal

## Proxima Etapa

Transformar este documento em especificacao funcional mais detalhada, com:

- Entidades do banco de dados
- Telas do sistema
- Regras de negocio
- Permissoes
- Backlog priorizado por fase
- Criterios de aceite

Ver tambem: [Arquitetura do Backend](./arquitetura-backend.md).

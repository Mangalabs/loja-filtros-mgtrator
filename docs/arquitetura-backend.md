# Arquitetura do Backend

## Stack

- TypeScript
- Node.js
- Express
- Knex
- PostgreSQL
- Zod
- Backend primeiro
- Arquitetura em camadas, seguindo uma leitura pratica de MVC
- Revisao continua com postura de PR/code review
- Commits curtos e revisaveis

## Principios

O backend deve ser organizado para crescer sem acoplamento desnecessario. A regra principal e manter dependencias em uma direcao clara, evitando chamadas ciclicas entre camadas.

Objetivos:

- Isolar codigo por responsabilidade.
- Manter regras de negocio compreensiveis.
- Facilitar testes.
- Facilitar revisao de PR.
- Evitar arquivos grandes e mudancas extensas demais.
- Permitir troca futura de servicos externos, principalmente fiscais, sem espalhar detalhes pelo sistema.

## Convencao de Camadas

### View

No backend, a camada `view` representa a entrada HTTP da API.

Responsabilidades:

- Declarar rotas/endpoints.
- Receber requisicoes.
- Validar formato basico da entrada quando aplicavel.
- Encaminhar a chamada ao controller correto.
- Retornar respostas HTTP.

Nao deve conter:

- Regra de negocio complexa.
- Acesso direto ao banco.
- Chamadas externas.
- Composicao fiscal ou financeira relevante.

### Controller

Camada responsavel por orquestrar os fluxos da aplicacao.

Responsabilidades:

- Coordenar casos de uso.
- Chamar models internos.
- Chamar servicos externos isolados quando necessario.
- Aplicar regras de negocio do fluxo.
- Controlar transacoes quando o fluxo exigir consistencia entre varias operacoes.

Exemplos:

- Criar venda.
- Baixar estoque.
- Registrar recebimento.
- Emitir nota fiscal.
- Cancelar venda.
- Importar XML de compra.

O controller pode depender de models e de modulos externos isolados. O inverso nunca deve acontecer.

### Model

Camada responsavel por banco de dados e persistencia interna.

Responsabilidades:

- Consultas.
- Inserts, updates e deletes.
- Mapeamento entre tabelas e entidades.
- Regras diretamente ligadas a persistencia interna.

Nao deve conter:

- Chamada HTTP externa.
- Logica de controller.
- Dependencia de rotas.
- Dependencia de camada fiscal externa.

Se o controller depende do model, o model nao pode depender do controller.

## Dependencias Permitidas

Fluxo esperado:

```text
view -> controller -> model
view -> controller -> external
controller -> model
controller -> external
```

Fluxos proibidos:

```text
model -> controller
model -> view
external -> controller
view -> model
```

Chamadas ciclicas sao proibidas. Se duas partes parecem precisar uma da outra, a regra deve ser extraida para um modulo de dominio, helper puro ou servico interno com dependencia em uma unica direcao.

## Servicos Externos

Chamadas externas devem ficar completamente isoladas em pastas proprias.

Exemplos:

- Emissao fiscal.
- Cancelamento fiscal.
- Consulta de status fiscal.
- Integracao bancaria, caso boleto deixe de ser apenas controle manual.
- Consulta de CEP, se entrar no projeto.

Esses modulos devem exportar apenas funcoes ou interfaces necessarias para os controllers.

Detalhes internos do provedor externo nao devem vazar para o resto do sistema.

Uma estrutura possivel:

```text
src/
  external/
    fiscal/
      fiscal.types.ts
      fiscal.provider.ts
      providers/
        provider-a.strategy.ts
        provider-b.strategy.ts
```

Para fiscal, a arquitetura deve favorecer Strategy ou Adapter, porque o provedor pode mudar e a regra fiscal nao deve ficar espalhada pelos controllers.

## Organizacao Inicial de Pastas

Estrutura sugerida:

```text
src/
  views/
    clients/
      clients.routes.ts
    products/
      products.routes.ts
    sales/
      sales.routes.ts

  controllers/
    clients/
      clients.controller.ts
    products/
      products.controller.ts
    sales/
      sales.controller.ts

  models/
    clients/
      clients.model.ts
    products/
      products.model.ts
    sales/
      sales.model.ts

  external/
    fiscal/
    banking/

  shared/
    errors/
    http/
    validation/
    types/
```

A estrutura pode evoluir, mas a separacao entre entrada HTTP, orquestracao, banco e servicos externos deve permanecer.

## Tamanho de PR e Commit

A postura do projeto sera de revisao constante, como se cada entrega fosse um PR.

Diretrizes:

- Commits pequenos.
- Media alvo de ate 4 arquivos curtos por commit.
- Se todos os arquivos forem curtos e coesos, a quantidade pode aumentar.
- Cada commit deve representar uma mudanca compreensivel.
- Evitar misturar refactor, feature e correcao no mesmo commit.
- Evitar arquivos longos sem necessidade.

Exemplos de bons commits:

- Criar model de produtos.
- Adicionar rotas de clientes.
- Implementar cadastro de formas de pagamento.
- Isolar contrato fiscal.
- Adicionar validacao de entrada de venda.

## Escalonamento do Projeto

O projeto sera escalonado por fases e por modulos. A arquitetura deve permitir entregar partes pequenas sem travar o restante.

Prioridade inicial:

1. Fundacao do backend.
2. Cadastros base.
3. Estoque.
4. Compras/entrada.
5. Venda de balcao.
6. Caixa.
7. Fiscal.
8. Relatorios.

Cada modulo deve nascer pequeno, mas com limites claros.

## Regras de Revisao

Ao revisar codigo, priorizar:

- Acoplamento indevido.
- Chamada ciclica.
- Regra de negocio no lugar errado.
- Model fazendo chamada externa.
- View acessando banco direto.
- Controller grande demais.
- Falta de tratamento de erro.
- Falta de transacao em fluxo critico.
- Falta de teste em regra sensivel.

## Decisoes em Aberto

- Test runner: Vitest, Jest ou outro.
- Provedor fiscal.
- Estrategia de filas para emissao fiscal, se necessario.

## Decisoes Tecnicas Fechadas

- Framework HTTP: Express.
- Query builder: Knex.
- Banco de dados: PostgreSQL.
- Biblioteca de validacao: Zod.
- ORM: nao sera usado no inicio. A escolha por Knex preserva controle sobre SQL, facilita relatorios e evita acoplamento prematuro a uma modelagem opinativa.

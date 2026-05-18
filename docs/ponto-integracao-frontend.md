# Ponto de Integracao Frontend

## Objetivo

Definir um ponto pequeno e utilizavel do backend para iniciar o frontend, permitindo interacao real com o sistema enquanto as regras ainda estao sendo refinadas.

O primeiro marco sera o **Catalogo Operavel**.

## Marco 0.1 - Catalogo Operavel

Este marco deve permitir que o frontend tenha telas reais para:

- visualizar produtos;
- cadastrar produtos;
- visualizar marcas;
- cadastrar marcas;
- visualizar grupos de produtos;
- cadastrar grupos de produtos;
- visualizar fornecedores;
- cadastrar fornecedores;
- testar filtros basicos;
- testar validacoes de formulario;
- testar estados de erro e carregamento.

## Endpoints Disponiveis Hoje

- `GET /health`
- `GET /products`
- `POST /products`
- `GET /brands`
- `POST /brands`
- `GET /product-groups`
- `POST /product-groups`
- `GET /suppliers`
- `POST /suppliers`

## Endpoints Para Fechar o Marco

Antes de iniciar as telas principais do catalogo, o backend deve ter:

- `GET /products/:id`
- `PUT /products/:id`
- `PATCH /products/:id/status`

Esses endpoints permitem que o frontend tenha um fluxo completo de produto:

1. listar produtos;
2. abrir detalhe;
3. editar cadastro;
4. ativar ou inativar produto.

## Telas Iniciais do Frontend

Com este marco fechado, o frontend pode iniciar por:

- layout base;
- menu principal;
- tela de produtos;
- formulario de produto;
- tela de marcas;
- tela de grupos;
- tela de fornecedores;
- feedback visual de loading, vazio e erro.

## Contrato de Resposta

As respostas de sucesso devem seguir:

```json
{
  "code": 200,
  "status": "success",
  "data": {}
}
```

As respostas de erro devem seguir:

```json
{
  "code": 400,
  "status": "error",
  "message": "Mensagem de erro"
}
```

## Fora Deste Marco

Nao entram ainda:

- estoque;
- compras;
- entrada por XML;
- venda de balcao;
- caixa;
- fiscal;
- usuarios e permissoes completas;
- relatorios.

Esses modulos entram depois que o catalogo estiver navegavel e validado no frontend.

## Criterio de Pronto

O marco 0.1 estara pronto quando:

- migrations rodarem em um PostgreSQL local;
- endpoints do catalogo responderem com dados reais;
- produto puder ser criado, listado, visualizado, editado e inativado;
- frontend conseguir consumir o backend sem mocks nas telas de catalogo;
- `npm run typecheck` passar;
- `npm run build` passar.

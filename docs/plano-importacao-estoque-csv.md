# Plano de importacao de estoque por CSV

## Objetivo

Importar ou atualizar o estoque legado por filial sem duplicar produtos ja criados.
O script deve aceitar mais de um layout exportado pelo sistema antigo e normalizar os
campos para o modelo atual do sistema.

## Script

Rodar a partir da pasta `backend`:

```bash
npm run stock:import-csv -- --file ../docs/estoque.csv --branch-code ARAGUAINA --report ../docs/import-stock-report.json
```

Por padrao o script roda em `dry-run` e nao grava dados.

Para gravar:

```bash
npm run stock:import-csv -- --file ../docs/estoque.csv --branch-code SAO_LUIS --created-by-email financeiro@empresa.com.br --commit
```

Tambem e possivel selecionar a filial por id:

```bash
npm run stock:import-csv -- --file ../docs/estoque.csv --branch-id UUID_DA_FILIAL --commit
```

## Layouts suportados

### Primeiro import

- `Cód. interno`
- `Nome`
- `Unidade`
- `Estoque`
- `Custo unit.`
- `Custo total`
- `Valor venda`
- `Total valor venda`

Campos usados:

- `Cód. interno` -> codigo interno
- `Nome` -> nome do produto
- `Unidade` -> unidade
- `Estoque` -> saldo atual
- `Custo unit.` -> custo
- `Valor venda` -> venda

### Novo import fiscal/estoque

- `Cód. interno`
- `Nome`
- `Valor de custo`
- `NCM`
- `CEST`
- `Estoque`
- `LOCAÇÃO`
- `FABRICANTE`
- `Vr. MG SÃO LUIS-MA`

Campos usados:

- `Cód. interno` -> codigo interno
- `Nome` -> nome do produto
- `Valor de custo` -> custo
- `NCM` -> NCM legado
- `CEST` -> CEST legado
- `Estoque` -> saldo atual
- `LOCAÇÃO` -> locacao
- `FABRICANTE` -> fabricante global
- `Vr. MG SÃO LUIS-MA` -> venda

## Criterio de atualizacao

O script tenta encontrar produto existente nesta ordem:

1. codigo de barras, quando informado;
2. filial + codigo interno + nome + fabricante.

Se encontrar produto existente:

- atualiza custo, venda, NCM, CEST, locacao, fabricante, unidade e campos fiscais;
- seta o estoque para o saldo atual do CSV;
- cria movimentacao de ajuste somente quando o saldo atual for diferente.

Se nao encontrar:

- cria produto novo na filial informada;
- cria ou vincula fabricante global;
- cria ou vincula fornecedor da filial;
- cria entrada inicial de estoque quando o saldo for maior que zero.

## Regras importantes

- `internal_code` pode repetir.
- codigo de barras continua unico.
- codigo de barras existente em outra filial e rejeitado no relatorio.
- fabricante e global.
- fornecedor e vinculado por filial.
- NCM e CEST importados do sistema antigo sao dados legados; ainda precisam de revisao fiscal antes de serem tratados como validados.
- O estoque do CSV e tratado como saldo atual, nao como quantidade incremental.

## Validacao antes do commit

Antes de rodar com `--commit`, conferir no relatorio:

- total de linhas aceitas;
- linhas rejeitadas;
- codigos de barras duplicados;
- produtos sem nome;
- custos, vendas ou estoque invalidos;
- layout detectado;
- filial de destino.

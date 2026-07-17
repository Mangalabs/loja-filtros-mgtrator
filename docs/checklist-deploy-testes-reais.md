# Checklist de Deploy e Testes Reais

Ultima revisao: 2026-07-17.

Objetivo: preparar o sistema para deploy, importacao inicial de estoque via CSV/script e uso real assistido.

## Validacao local executada

- `backend npm run typecheck`: passou.
- `backend npm run build`: passou.
- `backend npm run check:production`: passou.
- `backend npm run db:migrate`: passou apos subir o Postgres local.
- `backend npm test`: passou com 80 testes.
- `frontend npm run typecheck`: passou.
- `frontend npm run build`: passou.

Observacao: a primeira tentativa de testes backend falhou porque o Postgres local nao estava ativo. Apos `docker compose up -d postgres`, migrations e testes passaram.

## Antes do deploy

1. Rodar migrations no banco de producao antes de subir o backend novo.
2. Confirmar backup do banco atual de producao antes da importacao de estoque.
3. Conferir variaveis do backend em producao:
   - `NODE_ENV=production`;
   - `DATABASE_URL` com senha forte e banco correto;
   - `JWT_SECRET` forte, sem placeholder;
   - `CORS_ORIGIN` apontando para o frontend publicado;
   - `AUTH_COOKIE_SECURE=true` quando estiver usando HTTPS;
   - `AUTH_COOKIE_SAME_SITE` coerente com o dominio do frontend/backend;
   - `PUPPETEER_EXECUTABLE_PATH` apontando para Chromium/Chrome existente;
   - `PUPPETEER_NO_SANDBOX=true` quando necessario no container;
   - `FISCAL_PROVIDER=focus`;
   - `FISCAL_ENVIRONMENT=production` somente quando a emissao real for liberada;
   - `FOCUS_NFE_PRODUCTION_TOKEN` preenchido;
   - `FOCUS_NFE_COMPANY_CNPJ` correto.
4. Conferir no sistema a tela de configuracao fiscal:
   - provedor Focus;
   - ambiente Producao;
   - CNPJ da empresa;
   - producao liberada somente com confirmacao `EMITIR EM PRODUCAO`.
5. Confirmar que o plano pago da Focus esta ativo antes da primeira emissao real.
6. Confirmar serie/proximo numero da NF-e no painel Focus antes da primeira nota real.
7. Confirmar que as notas de teste em homologacao nao serao confundidas com producao.

## Importacao inicial de estoque

1. Validar o CSV recebido do sistema antigo antes de rodar o script:
   - nome do produto;
   - codigo interno;
   - codigo de barras;
   - fabricante;
   - fornecedor, se existir;
   - unidade;
   - custo;
   - preco de venda;
   - estoque atual;
   - estoque minimo;
   - locacao;
   - NCM/CEST/origem/CFOP/CSTs quando existirem.
2. Nao assumir que `internal_code` e unico.
3. Tratar codigo de barras duplicado antes da importacao, pois o sistema exige unicidade quando informado.
4. Criar fabricantes e fornecedores ausentes antes ou durante a importacao.
5. Gerar relatorio de itens rejeitados pelo script.
6. Rodar primeiro em ambiente local ou banco clonado.
7. Conferir amostra manual de produtos importados:
   - produto com codigo repetido e fabricante diferente;
   - produto sem codigo de barras;
   - produto com estoque zero;
   - produto com custo e preco;
   - produto com dados fiscais completos.

## Testes manuais apos deploy

Executar com usuario administrador:

1. Login, logout e recarregamento de tela mantendo sessao.
2. Criar funcionario, trocar senha no primeiro acesso e validar permissao negada em tela sensivel.
3. Cadastro de fabricante, fornecedor, cliente e produto.
4. Lista de produtos com busca por nome, codigo, fabricante e locacao.
5. Entrada manual de estoque.
6. Ajuste manual com motivo.
7. Historico de estoque.
8. Venda de balcao com multiplos itens e desconto.
9. Venda sem estoque usando confirmacao extra.
10. Orcamento com desconto percentual, forma de pagamento e PDF.
11. Pedido para envio originado de orcamento.
12. Reserva para retirada.
13. Historico de vendas e comprovante sem valor fiscal.
14. Caixa: abertura, sangria, suprimento, fechamento e divergencia.
15. Relatorios principais: vendas, estoque, compras e caixa.
16. NF-e em producao:
    - emitir uma nota controlada de baixo valor;
    - sincronizar;
    - baixar XML;
    - baixar DANFE;
    - conferir chave, numero, serie, cliente, itens, totais e vencimento.

## Pontos de atencao para uso real

- A partir de `FISCAL_ENVIRONMENT=production`, qualquer NF-e autorizada tem validade fiscal.
- Evitar cancelar notas reais durante testes sem alinhamento com a contabilidade.
- Manter uma janela assistida no primeiro dia de uso real.
- Registrar qualquer erro operacional em `docs/pontos-atencao-revisao.md` antes de corrigir.
- Se o frontend e o backend estiverem em dominios diferentes com HTTPS, revisar cookies/CORS antes de liberar para os usuarios.

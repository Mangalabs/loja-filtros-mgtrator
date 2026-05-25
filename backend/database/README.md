# Database

Esta pasta guarda migrations e seeds do Knex.

Comandos principais:

```bash
npm run db:make nome_da_migration
npm run db:migrate
npm run db:rollback
```

As migrations ficam em `database/migrations` e devem ser pequenas, revisaveis e ligadas a uma decisao de modelagem clara.

Os testes de integracao usam a base `loja_filtros_test`. Crie essa base uma vez com:

```bash
docker compose exec postgres createdb -U postgres loja_filtros_test
```

Nao configure `TEST_DATABASE_URL` apontando para a base de desenvolvimento, pois os testes limpam os registros de catalogo e estoque entre cenarios.

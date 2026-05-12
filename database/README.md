# Database

Esta pasta guarda migrations e seeds do Knex.

Comandos principais:

```bash
npm run db:make nome_da_migration
npm run db:migrate
npm run db:rollback
```

As migrations ficam em `database/migrations` e devem ser pequenas, revisaveis e ligadas a uma decisao de modelagem clara.

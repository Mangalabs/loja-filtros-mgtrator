# Loja Filtros

Sistema da nova filial de filtros, organizado em backend e frontend separados.

## Estrutura

```text
backend/   API em Node.js, TypeScript, Express, Knex e PostgreSQL
frontend/  Interface em React, TypeScript e Vite
docs/      Documentacao de produto, arquitetura e integracao
```

## Backend

Suba o PostgreSQL local:

```bash
docker compose up -d postgres
```

Configure o ambiente:

```bash
cp backend/.env.example backend/.env
```

Rode migrations e inicie a API:

```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

O backend sobe em:

```text
http://127.0.0.1:3333
```

Durante desenvolvimento, `npm run dev` roda em modo watch. Para executar o build compilado:

```bash
npm run dev:build
```

O Postgres do Docker fica exposto localmente em:

```text
127.0.0.1:5433
```

Se os endpoints de catalogo retornarem `500`, confira se o Postgres esta rodando e se as migrations foram executadas.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend sobe em:

```text
http://127.0.0.1:5173
```

O Vite encaminha chamadas `/api` para o backend local.

## Validacao

```bash
cd backend
npm run typecheck
npm run build
```

```bash
cd frontend
npm run typecheck
npm run build
```

# Loja Filtros

Sistema da nova filial de filtros, organizado em backend e frontend separados.

## Estrutura

```text
backend/   API em Node.js, TypeScript, Express, Knex e PostgreSQL
frontend/  Interface em React, TypeScript e Vite
docs/      Documentacao de produto, arquitetura e integracao
```

## Backend

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

Configure o banco em `backend/.env`, usando `backend/.env.example` como referencia.

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

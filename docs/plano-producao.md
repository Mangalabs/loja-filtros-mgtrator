# Plano de subida para producao

Este documento separa os passos de preparacao e validacao do ambiente de producao do `loja-filtros`.

Objetivo imediato: subir o sistema com seguranca minima, trocar senhas padrao, validar backend, banco, Puppeteer/Chromium e rotas publicas antes de liberar uso real.

## Estado atual

- O `compose.yml` sobe PostgreSQL e backend.
- O frontend ainda roda fora do Docker neste momento.
- A porta host do PostgreSQL em desenvolvimento e `5433`.
- O servidor de producao foi desligado temporariamente porque a senha do PostgreSQL estava padrao.
- Antes de religar o ambiente publico, a senha padrao precisa ser trocada.

## 1. Seguranca inicial do banco

1. Gerar uma senha forte para o PostgreSQL.
2. Alterar a senha do usuario `postgres` no ambiente de producao.
3. Atualizar `DATABASE_URL` do backend com a nova senha.
4. Atualizar qualquer variavel usada pelo Docker/servico do banco.
5. Confirmar que o PostgreSQL nao esta exposto publicamente.
6. Permitir acesso ao banco apenas localmente ou por rede interna controlada.
7. Confirmar firewall bloqueando acesso externo direto ao banco.
8. Subir somente o banco.
9. Testar login no banco com a nova senha.

Comandos uteis:

```bash
cp .env.example .env
docker compose up -d postgres
docker compose ps
```

O `compose.yml` exige `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD`.
Em producao, `POSTGRES_PASSWORD` deve ser forte e diferente do exemplo.

O bind da porta do PostgreSQL fica restrito a `127.0.0.1`:

```yaml
127.0.0.1:${POSTGRES_HOST_PORT:-5433}:5432
```

Isso evita exposicao externa direta do banco pelo Docker Compose.

Atencao: se o volume PostgreSQL ja existir, mudar `POSTGRES_PASSWORD` no
Compose nao altera automaticamente a senha do usuario dentro do banco. Nesse
caso, altere a senha via SQL antes de expor o ambiente:

```sql
alter user postgres with password 'NOVA_SENHA_FORTE';
```

Depois atualize `DATABASE_URL` do backend para usar a mesma senha.

Teste local no servidor:

```bash
psql "$DATABASE_URL" -c "select 1;"
```

Para o backend containerizado, a URL interna do banco usa o host `postgres`
e a porta `5432` dentro da rede Docker. O `compose.yml` monta `DATABASE_URL`
a partir de `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`.

Se a senha tiver caracteres reservados de URL como `@`, `/`, `?`, `#` ou `:`,
configure `BACKEND_DATABASE_URL` manualmente no `.env` da raiz com a senha
URL-encoded.

## 2. Validar backend com PostgreSQL

1. Configurar `.env` de producao com a nova `DATABASE_URL`.
2. Conferir `HOST` e `PORT`.
3. Conferir `JWT_SECRET` forte, unico e com pelo menos 32 caracteres.
4. Subir backend em modo de producao.
5. Rodar migrations.
6. Testar health da API.
7. Testar health do banco.
8. Conferir logs do backend.

Comandos para backend fora do Docker:

```bash
cd backend
npm run db:migrate
npm run check:production
npm run start
```

Comandos para backend no Docker:

```bash
docker compose build backend
docker compose run --rm backend npm run db:migrate
docker compose up -d backend
```

Se a porta local `3333` ja estiver ocupada em desenvolvimento, suba o
backend Docker em outra porta host sem alterar a porta interna do container:

```bash
BACKEND_HOST_PORT=3334 docker compose up -d backend
curl http://127.0.0.1:3334/health
```

Rotas:

```bash
curl http://37.59.103.70:3333/
curl http://37.59.103.70:3333/health
curl http://37.59.103.70:3333/health/database
```

Resultado esperado:

- `/` responde identificacao da API.
- `/health` responde sucesso.
- `/health/database` responde sucesso de conexao.

Trava de startup em `NODE_ENV=production`:

- o backend nao sobe se `JWT_SECRET` parecer placeholder;
- o backend nao sobe se `DATABASE_URL` estiver invalida, sem senha ou usando a senha padrao `postgres`;
- o backend nao sobe se `PUPPETEER_EXECUTABLE_PATH` apontar para arquivo inexistente;
- o backend nao sobe se Focus estiver em producao sem `FOCUS_NFE_PRODUCTION_TOKEN`.

## 3. Validar Chromium no servidor

1. Instalar Chromium no servidor.
2. Confirmar caminho do binario.
3. Confirmar versao instalada.
4. Confirmar que o usuario do processo do backend consegue executar Chromium.

Comandos:

```bash
which chromium
chromium --version
```

Se nao estiver instalado:

```bash
sudo apt update
sudo apt install chromium -y
```

## 4. Validar Puppeteer em producao

Configuracao desejada para ambiente Linux/servidor:

```ts
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
```

Tarefas:

1. Configurar `PUPPETEER_EXECUTABLE_PATH` no `.env` de producao.
2. Manter `PUPPETEER_NO_SANDBOX=true` em producao Linux, quando necessario.
3. Subir backend com Chromium configurado.
4. Criar ou usar um orcamento de teste.
5. Baixar PDF do orcamento.
6. Confirmar que o PDF e gerado sem erro 500.
7. Conferir logs do backend.
8. Confirmar que processos Chromium nao ficam presos apos a geracao.

Variaveis sugeridas:

```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_NO_SANDBOX=true
```

Status no codigo:

- `PUPPETEER_EXECUTABLE_PATH` ja e lido pelo backend.
- `PUPPETEER_NO_SANDBOX` ja controla as flags `--no-sandbox` e `--disable-setuid-sandbox`.
- O padrao atual permanece com no-sandbox ligado para preservar o comportamento anterior do gerador de PDF.

## 5. Validar rota publica de producao

Rota principal:

```bash
curl http://37.59.103.70:3333/
```

Validacoes:

1. A API responde na porta `3333`.
2. A resposta nao expõe segredo.
3. CORS esta adequado para o frontend de producao.
4. Logs nao mostram erro de banco, JWT, fiscal ou PDF.

## 6. Validar fluxo operacional minimo

Depois que banco, backend e Puppeteer estiverem ok:

1. Login.
2. Criar cliente de teste.
3. Criar produto de teste.
4. Fazer ajuste de estoque positivo.
5. Abrir caixa.
6. Fazer venda de balcao.
7. Conferir baixa de estoque.
8. Registrar sangria ou suprimento teste, se necessario.
9. Fechar caixa.
10. Criar orcamento.
11. Baixar PDF do orcamento.
12. Emitir NF-e em homologacao Focus.
13. Sincronizar NF-e.
14. Baixar XML.
15. Baixar DANFE.
16. Cancelar NF-e em homologacao.

## 7. Variaveis criticas para revisar

Backend:

```env
HOST=
PORT=
DATABASE_URL=
JWT_SECRET=
```

PDF/orcamento:

```env
QUOTE_PDF_STORE_NAME=
QUOTE_PDF_STORE_ADDRESS=
QUOTE_PDF_STORE_CITY=
QUOTE_PDF_STORE_DOCUMENT=
QUOTE_PDF_STORE_PHONE=
QUOTE_PDF_STORE_EMAIL=
PUPPETEER_EXECUTABLE_PATH=
PUPPETEER_NO_SANDBOX=
```

Fiscal:

```env
FISCAL_PROVIDER=
FISCAL_ENVIRONMENT=
FOCUS_NFE_HOMOLOGATION_TOKEN=
FOCUS_NFE_PRODUCTION_TOKEN=
FOCUS_NFE_COMPANY_CNPJ=
```

Cuidados:

- Nao commitar `.env`.
- Nao colar tokens em issues, commits ou docs.
- Usar homologacao Focus ate concluir checklist fiscal final.
- Producao fiscal so deve ser liberada depois de validacao manual com dados reais.

## 8. Firewall e exposicao

Expor publicamente apenas o necessario:

- API via `3333` ou via proxy `80/443`.
- Frontend via `80/443`, se estiver no mesmo servidor.
- SSH, preferencialmente restrito.

Nao expor:

- PostgreSQL.
- Docker daemon.
- Portas internas.
- Painel administrativo sem autenticacao.

## 9. Ordem recomendada de execucao

1. Trocar senha do PostgreSQL.
2. Bloquear acesso externo direto ao PostgreSQL.
3. Subir banco.
4. Testar conexao direta local com banco.
5. Atualizar `.env` do backend.
6. Rodar migrations.
7. Subir backend.
8. Testar `/`, `/health` e `/health/database`.
9. Instalar/validar Chromium.
10. Configurar Puppeteer.
11. Testar PDF de orcamento.
12. Testar fluxo operacional minimo.
13. Testar Focus em homologacao.
14. Revisar logs.
15. Decidir se o ambiente fica liberado para uso assistido.

## 10. Pontos pendentes apos a primeira subida

- Decidir se backend tambem sera containerizado.
- Decidir se frontend sera servido por Nginx ou outro proxy.
- Configurar HTTPS.
- Configurar backup automatico do PostgreSQL.
- Configurar rotina de restore testado.
- Configurar logs persistentes.
- Configurar monitoramento basico de processo, disco e memoria.
- Criar checklist de deploy/rollback.

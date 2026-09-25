Trabalhe exclusivamente no repositório:

/home/gabriel/Documents/Manga-projects/loja-filtros-mgtrator

Objetivo:
1. Adaptar a estrutura compactada de regras AGENTS.md para coexistir corretamente com Agent Skills.
2. Depois instalar somente as skills compatíveis com a Loja, localmente no repositório.

Não altere código, dependências, manifests, lockfiles, migrations, banco ou configuração de produção. Não faça commit.

FASE 1 — Inspeção

1. Confirme a raiz do projeto.
2. Inspecione git status e preserve alterações existentes.
3. Leia integralmente:
   - AGENTS.md;
   - backend/AGENTS.md;
   - frontend/AGENTS.md;
   - .codex/AGENTS.md, verificando se ainda participa do roteamento.
4. Leia os módulos necessários em .agents/*.md.
5. Confirme pelo código e manifests:
   - frontend React 19, TypeScript, Vite, MUI e Tailwind;
   - backend TypeScript, Express 5, Knex e PostgreSQL;
   - integração fiscal/NF-e;
   - áreas sensíveis de usuários, permissões, estoque, vendas, caixa e finanças.
6. Inventarie as skills existentes em .agents/skills/.

FASE 2 — Adaptação das regras compactadas

Adapte os documentos segundo estes princípios:

1. AGENTS.md raiz continua sendo o roteador compacto e sempre carregado.
2. frontend/AGENTS.md e backend/AGENTS.md mantêm somente regras locais de cada stack.
3. .agents/*.md mantém regras especializadas carregadas sob demanda.
4. Resolva o papel de .codex/AGENTS.md sem criar duas fontes de verdade. Preserve-o somente se tiver função necessária e claramente documentada.
5. Skills externas fornecem procedimentos genéricos de React, UI/UX, navegador, segurança e PostgreSQL.
6. Skills nunca substituem:
   - MUI, Tailwind e o tema existente;
   - componentes e hooks estabelecidos;
   - src/api.ts;
   - AuthContext;
   - arquitetura View/Route -> Controller -> Model/Repository;
   - Knex e migrations;
   - permissões e auditoria;
   - contratos fiscais e NF-e;
   - proteção de segredos;
   - regras de transações;
   - salvaguardas operacionais e de produção.
7. Não copie o conteúdo das skills para os AGENTS.md ou .agents/*.md.
8. Remova duplicações somente quando forem genéricas e integralmente cobertas.
9. Não aumente o contexto sempre carregado. A contagem total dos AGENTS.md deve permanecer igual ou diminuir.
10. Registre a precedência:
    - pedido do usuário;
    - AGENTS.md aplicável;
    - implementação, contratos, testes e documentação operacional/fiscal;
    - módulos locais .agents/*.md;
    - skills externas;
    - convenções genéricas.
11. Crie .agents/skills-manifest.md com skill, origem, escopo, gatilho, limitações e regras locais prevalecentes.
12. Não transforme automaticamente .agents/*.md em skills.
13. Prepare referências às skills desejadas, mas só mantenha referências às que forem instaladas com sucesso.

FASE 3 — Seleção e instalação

Instale as skills em:

/home/gabriel/Documents/Manga-projects/loja-filtros-mgtrator/.agents/skills/

Não instale globalmente.

Antes de instalar:

1. Consulte somente fontes oficiais ou mantidas pela tecnologia.
2. Leia o SKILL.md.
3. Inspecione scripts, ferramentas, permissões e dependências.
4. Não execute scripts internos.
5. Solicite autorização para rede quando necessário.
6. Não instale skills experimentais ou comunitárias.

Seleção pretendida:

Origem vercel-labs/agent-skills:
- web-design-guidelines
- react-best-practices
- composition-patterns

Catálogo curado openai/skills:
- playwright
- security-best-practices
- security-threat-model

Origem supabase/agent-skills:
- supabase-postgres-best-practices

Regras de compatibilidade:

- O projeto usa React 19 com Vite, não Next.js.
- Em react-best-practices, aplique somente regras compatíveis com React/Vite.
- Não aplique recomendações exclusivas de Next.js, RSC, server actions ou SSR.
- composition-patterns pode utilizar padrões compatíveis com React 19.
- web-design-guidelines deve respeitar MUI, Tailwind, tema e componentes atuais.
- Playwright será usado para inspeção e validação no navegador, sem adicionar dependências ao projeto nesta tarefa.
- A skill PostgreSQL complementa Knex e não substitui regras locais de migration ou transação.
- Nenhuma skill pode enfraquecer regras fiscais, permissões, auditoria ou proteção de dados.
- Não instale Flutter, Dart, Prisma, Next.js ou React Native.
- Instale skills de Figma somente se uma conexão Figma já estiver configurada e operacional.
- Não instale Sentry ou CI sem evidência de uso.

A instalação deve ser idempotente:

- instale somente skills ausentes;
- preserve skills idênticas;
- não sobrescreva modificações locais;
- mostre divergências;
- evite nomes duplicados.

FASE 4 — Validação

1. Confirme que as skills estão em loja-filtros-mgtrator/.agents/skills/.
2. Valide frontmatter, nomes, estrutura e links relativos.
3. Detecte nomes duplicados.
4. Valide todas as referências documentais.
5. Compare a contagem de palavras antes/depois.
6. Inspecione o diff final.
7. Confirme que nenhum código, manifest, lockfile ou dependência foi alterado.
8. Remova referências a skills que não tenham sido instaladas.
9. Não execute testes da aplicação apenas para validar documentação e skills.

Ao terminar, informe:
- documentos adaptados;
- tratamento dado a .codex/AGENTS.md;
- contagem antes/depois;
- skills instaladas e fontes;
- regras Next.js explicitamente excluídas;
- skills incompatíveis ou recusadas;
- conflitos e verificações;
- necessidade de reiniciar o Codex ou abrir uma nova conversa.

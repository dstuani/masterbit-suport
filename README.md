# SupportDesk

Memória profissional do suporte técnico: registrar o que foi tratado com cada cliente,
saber o que ficou pendente, programar retornos e consultar o histórico depois.

Projeto independente e autocontido. Não compartilha código, banco, configuração nem
dependências com nenhum outro projeto.

## Stack

| Camada | Escolha |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Server Actions e Route Handlers no próprio Next — sem serviço separado |
| Banco | Postgres no Supabase, com RLS |
| Auth | Supabase Auth via `@supabase/ssr` (cookies HttpOnly) |
| UI | Radix UI + componentes próprios em `components/ui` |
| Formulários | react-hook-form + Zod |
| Tabelas | TanStack Table · Estado de servidor: RSC + TanStack Query |

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha as chaves do Supabase
npm run dev                  # http://localhost:3100
```

Sem as chaves do Supabase o app sobe em **modo de visualização** (apenas em
desenvolvimento): o shell é navegável, sem login e sem banco. Em produção a ausência
das variáveis derruba a aplicação de propósito.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento na porta 3100 |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run test:forms` | Valida os schemas Zod contra o que os formulários enviam |
| `npm run db:check` | Aplica todas as migrations num Postgres efêmero e valida a estrutura |
| `npm run db:test` | Testa triggers, constraints e integridade do schema |
| `npm run db:types:local` | Gera `lib/types/database.ts` a partir das migrations (offline) |
| `npm run db:diff <nome>` | Gera migration a partir das diferenças do schema |
| `npm run db:push` | Aplica as migrations no projeto Supabase |
| `npm run db:types` | Regera os tipos a partir do projeto Supabase linkado |

Os três primeiros rodam num Postgres em WASM (PGlite) e não precisam de Docker nem de
projeto Supabase — é assim que o schema é validado antes de ir para o banco de verdade.

## Estrutura

```
app/
├── (auth)/login/          Login (página servidor + formulário cliente + Server Action)
└── (app)/                 Área autenticada, protegida pelo proxy
    ├── dashboard/         Visão do dia
    ├── atendimentos/      Núcleo do sistema
    ├── clientes/          Cadastro, filiais, contatos, sistemas
    ├── pendencias/        O que ficou em aberto
    ├── agenda/            Retornos e visitas
    ├── consultas/         Busca no histórico
    ├── relatorios/        Métricas do período
    └── configuracoes/     Cadastros de apoio e acesso

components/{ui,layout}     Componentes de interface
lib/
├── supabase/              Clientes (browser, servidor, proxy)
├── schemas/               Schemas Zod por entidade (Fase 2)
├── services/              Lógica de domínio (Fase 2)
├── types/database.ts      Tipos gerados pelo Supabase CLI
├── auth.ts                Camada de acesso à identidade (DAL)
├── constants.ts           Enums e rótulos do domínio
├── env.ts                 Leitura das variáveis de ambiente
├── forms.ts               Contrato entre formulários e Server Actions
└── utils.ts               cn() e formatadores pt-BR

proxy.ts                   Renovação de sessão e checagem otimista de rota
scripts/                   Validação do schema e geração de tipos (PGlite)
supabase/migrations/       Migrations SQL versionadas
.claude/launch.json        Configuração local do dev server (porta 3100)
```

## Banco de dados

14 tabelas, todas com RLS. O desenho segue três decisões que valem ser lembradas:

- **`org_id` em toda tabela de negócio** desde o início. Com um usuário só isso não faz
  diferença; adicioná-lo depois exigiria reescrever todas as policies e fazer backfill.
- **Timeline append-only no próprio banco**: `atendimento_interacoes` só tem policy de
  SELECT e INSERT. Sem policy de UPDATE/DELETE o RLS nega essas operações — a
  imutabilidade não depende do código da aplicação.
- **Auditoria por trigger**, não pela aplicação: nenhuma escrita escapa do registro, nem
  as feitas direto no SQL.
- **Automações do atendimento no banco**: abertura, mudança de status e data de
  fechamento são gravadas por trigger. Um atendimento cuja transição não foi registrada
  seria um buraco no histórico, e a garantia não pode depender do código da aplicação.

O primeiro usuário que se cadastra vira `owner`, ganha uma organização e recebe um
catálogo inicial de 7 categorias e 28 subcategorias — tudo editável em Configurações.

## Convenções

- **Domínio em português** (tabelas, rotas, enums, nomes de função); termos técnicos em inglês.
- **Segurança em camadas**: o `proxy.ts` faz apenas checagem otimista; a autorização real
  é o RLS no Postgres, e toda Server Action revalida a sessão antes de escrever.
- **Nunca use `getSession()` no servidor** — só `getUser()`, que valida o token de fato.
- **Timeline imutável**: `atendimento_interacoes` é append-only; correção entra como nova
  interação, nunca como edição.
- **Filtros vivem na URL**, não em `useState` — assim são compartilháveis e sobrevivem ao refresh.
- Valores monetários em R$ e datas em `pt-BR` (`lib/utils.ts`).

## Roadmap

1. **Fundação** — scaffold, Supabase, auth, shell ← *concluída*
2. **Schema e cadastros** — 14 tabelas, RLS, triggers, CRUD de clientes e sistemas ← *concluída*
3. **Atendimentos** — lista, criação, timeline, conclusão ← *concluída*
4. **Pendências** ← *concluída*
5. **Agenda e retornos** ← *concluída*
6. **Consulta e memória** — full-text, buscas salvas, CSV ← *concluída*
7. **Relatórios e dashboard** ← *concluída*
8. **Equipe** — papéis, atribuição, auditoria ← *concluída*
9. **Anexos** — arquivos e prints nos atendimentos (Supabase Storage, bucket privado) ← *concluída*

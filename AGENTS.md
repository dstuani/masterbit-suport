<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SupportDesk

Sistema de organização de atendimentos de suporte técnico. Uso inicial por um único
profissional, arquitetado desde o início para suportar uma equipe. Leia o `README.md`
para stack, estrutura e roadmap.

## Isolamento

Este projeto é **autocontido**. Pastas vizinhas contêm aplicações sem relação com esta:
não importe, copie nem referencie o código, a configuração, o schema ou as dependências
delas. Não edite nada fora desta pasta — nem configurações na raiz do workspace. Toda
ferramenta deste projeto (dev server, migrations, lint) é configurada aqui dentro.

## Regras deste projeto

- **Next.js 16**: o middleware chama-se `proxy.ts` e fica na raiz. `searchParams` e
  `cookies()` são assíncronos — sempre `await`.
- **Português no domínio**: tabelas, colunas, enums, rotas e nomes de função em pt-BR.
  Termos técnicos (props, tipos utilitários, libs) em inglês.
- **Autorização**: `proxy.ts` é checagem otimista, não é defesa. A autorização real é o
  RLS no Postgres. Toda Server Action revalida sessão e entrada (Zod) antes de escrever —
  Server Actions são endpoints POST públicos.
- **Supabase no servidor**: use `getUser()`, nunca `getSession()`. Crie um cliente por
  requisição (`criarClienteServidor()`); jamais guarde em variável de módulo.
- **Migrations**: SQL versionado em `supabase/migrations/`, não Prisma. Depois de alterar
  o schema, rode `npm run db:types`.
- **Timeline append-only**: `atendimento_interacoes` nunca é editada nem apagada.
- **Soft delete**: clientes e atendimentos usam `ativo`/`status`, nunca `DELETE`.
- **Estado**: dado canônico em RSC; filtros e paginação na URL; TanStack Query só onde há
  polling ou scroll infinito; Zustand só para UI efêmera.
- **Porta 3100** no dev server, para não colidir com outros projetos.
- **Validar o schema sem Docker**: `npm run db:check` (aplica as migrations) e
  `npm run db:test` (triggers e constraints) rodam num Postgres em WASM. Rode os dois
  depois de mexer em qualquer migration, e `npm run db:types:local` para regerar os tipos.
- **`lib/types/database.ts` é gerado.** Não edite à mão.
- **Arquivos `"use server"` só exportam funções async.** Tipos e constantes de formulário
  moram em `lib/forms.ts`, ou o build falha ao coletar as rotas.
- **Campos opcionais de formulário aceitam ausente, não só vazio.** Um `<select>` ou
  `<input>` desabilitado não entra no FormData; schemas que exigem string reprovam por um
  campo que o próprio formulário não enviou. Use os helpers `.optional().transform(...)`
  de `lib/schemas/`, e rode `npm run test:forms` ao mexer neles.
- **Todo campo do formulário mostra a mensagem do seu erro.** Sem isso o usuário lê
  "confira os campos destacados" sem ter destaque nenhum na tela.

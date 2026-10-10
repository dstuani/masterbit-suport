<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Masterbit Suport (SupportDesk)

Guia para quem vai mexer neste código — pessoa ou agente. Nome interno do projeto:
**SupportDesk** (pasta `suport`, pacote `suport`). Nome exibido na interface:
**Masterbit Suport**. Repositório: `github.com/dstuani/masterbit-suport`, branch `main`.

## Isolamento

Este projeto é **autocontido**. Pastas vizinhas (`../hr-suite`, `../masterbit`, etc.)
são aplicações sem relação: não importe, copie nem referencie código, configuração,
schema ou dependências delas. Não edite nada fora desta pasta.

---

## 1. O que o sistema faz

É a **memória de trabalho de um profissional de suporte técnico** (hoje, o Denilson,
da Masterbit). Ele registra cada atendimento feito para cada cliente e permite, depois:

- saber **o que está aberto**, o que está **aguardando** o cliente ou um terceiro, e
  o que ficou **pendente**;
- **programar retornos** e visitas (agenda);
- **consultar o histórico**: "como resolvi isso da última vez?" — por palavra, por
  cliente, ou por casos parecidos já resolvidos;
- ver **relatórios** de volume e horas gastas;
- controlar o **parque de máquinas** dos clientes: hardware coletado automaticamente por um
  script em cada computador e o histórico de manutenções de cada máquina.

Uso atual: um único usuário. O sistema foi desenhado desde o início para equipe
(papéis, atribuição, auditoria), mas a operação real é de uma pessoa só.

---

## 2. Tecnologias e como rodar

### Stack (o que está de fato em uso)

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.3 (App Router, Turbopack), React 19.2, TypeScript |
| Estilo | Tailwind CSS v4 + tokens CSS em `app/globals.css` |
| Backend | Server Components + Server Actions + 1 Route Handler — sem API separada |
| Banco | Postgres no Supabase, com RLS em todas as tabelas |
| Auth | Supabase Auth via `@supabase/ssr` (sessão em cookie) |
| Arquivos | Supabase Storage, bucket privado `anexos` |
| Validação | Zod 4 (`lib/schemas/`) |
| Datas | date-fns com locale pt-BR |
| UI | componentes próprios em `components/ui/` + Radix (só Dialog, Label, Slot) + lucide-react |
| Planilhas | `xlsx` (import dinâmico, só na tela de importar contatos) |
| Avisos | `sonner` (toast) |
| Testes de schema | PGlite (Postgres em WASM) — sem Docker |

**Declaradas no `package.json` mas não usadas em lugar nenhum:** `react-hook-form`,
`@hookform/resolvers`, `@tanstack/react-query`, `@tanstack/react-table`, `nuqs`,
`zustand`, `@supabase/server` e vários `@radix-ui/*` (avatar, checkbox, dropdown,
popover, scroll-area, select, separator, tabs, tooltip). O `README.md` cita
react-hook-form e TanStack Table, mas os formulários usam `<form action>` +
`useActionState` + Zod, e as tabelas são HTML puro.

### Como rodar

```bash
npm install
cp .env.example .env.local   # preencher as chaves do Supabase
npm run dev                  # http://localhost:3100  (porta fixa, não 3000)
```

Variáveis (`.env.local`, nunca commitar — o `.gitignore` já bloqueia `.env*`):

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `..._ANON_KEY`) | chave pública; qualquer uma das duas serve |
| `SUPABASE_SERVICE_ROLE_KEY` | **opcional**; só para criar usuário em Configurações → Equipe. Ignora todo o RLS — **nunca** com prefixo `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | URL base do app |

Sem as chaves do Supabase, o app sobe em **modo de visualização** (só em
desenvolvimento): navega pelo shell, sem login nem dados. Em produção, o `proxy.ts`
devolve erro 500 de propósito.

**Recuperação de senha (configuração no painel, não no código):** em Authentication →
URL Configuration do Supabase, o endereço `{NEXT_PUBLIC_APP_URL}/auth/confirmar` precisa
estar em *Redirect URLs* (um para dev e um para produção) e o *Site URL* deve ser o
endereço de produção. Sem isso o link do e-mail volta para o lugar errado. O envio
padrão do Supabase tem limite muito baixo de e-mails por hora; para uso real configure
SMTP próprio (Authentication → Emails → SMTP). O link só funciona no mesmo navegador
que pediu a recuperação (fluxo PKCE).

**Primeiro acesso:** não há tela de cadastro. Crie o usuário no painel do Supabase
(Authentication → Users → Add user, marcando *Auto Confirm*). O primeiro usuário vira
`owner` e ganha a organização. Os seguintes entram como `tecnico` **desativado** e só
acessam depois que o owner clica em Ativar em Configurações → Equipe. Criados pela
própria tela Equipe (exige a service role key) já saem ativos.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | servidor de desenvolvimento, build e produção (porta 3100) |
| `npm run lint` | ESLint |
| `npm run test:forms` | valida os schemas Zod contra o que os formulários enviam |
| `npm run db:check` | aplica todas as migrations num Postgres em WASM e confere estrutura e RLS |
| `npm run db:test` | testa triggers, constraints e as funções do RLS (75 verificações) |
| `npm run db:types:local` | regera `lib/types/database.ts` a partir das migrations, offline |
| `npm run db:push` | aplica as migrations no Supabase real (exige `npx supabase link`) |
| `npm run db:types` | regera os tipos a partir do projeto Supabase vinculado |

**Fluxo ao mexer no banco:** escrever a migration → `db:check` → `db:test` →
`db:types:local` → `npx tsc --noEmit` → `npm run build` → **`db:push`**. Se o código
for publicado antes do `db:push`, as telas quebram com
`Could not find the 'X' column ... in the schema cache`.

---

## 3. Estrutura de pastas

```
app/
├── layout.tsx              raiz: fontes, script anti-piscar do tema, <Toaster>
├── globals.css             tokens de cor (claro/escuro) e mapeamento para o Tailwind
├── page.tsx                redireciona para /dashboard
├── manifest.ts             manifesto do PWA (nome, ícones, atalhos)
├── (auth)/login/           tela de login + Server Action entrar()/sair()
├── (auth)/recuperar-senha/ pede o link por e-mail (resposta igual exista a conta ou não)
├── (auth)/nova-senha/      define a nova senha (exige a sessão aberta pelo link)
├── auth/confirmar/route.ts GET: troca o ?code= do e-mail por sessão e vai a /nova-senha
├── sair/route.ts           GET: encerra a sessão e volta ao login (?motivo=inativo)
├── error.tsx, global-error.tsx, not-found.tsx    telas de erro/404 (raiz)
├── (app)/                  área autenticada (layout com Sidebar + Header)
│   ├── error.tsx, not-found.tsx    erro e 404 dentro do layout (menu continua)
│   ├── dashboard/
│   ├── solicitacoes/       caixa de entrada do formulário da landing (triagem)
│   ├── atendimentos/       lista, novo, [id] (detalhe) — o núcleo do sistema
│   ├── clientes/           lista, novo, [id] (abas, inclusive Equipamentos com a coleta), [id]/editar, [id]/importar
│   ├── equipamentos/       parque de máquinas: lista, novo (manual), [id] (ficha + manutenções), [id]/editar
│   ├── pendencias/         lista, nova
│   ├── agenda/             lista + minicalendário, novo, [id]
│   ├── consultas/          busca no histórico + buscas salvas + CSV
│   ├── casos-parecidos/    "já resolvi algo assim?"
│   ├── relatorios/         métricas do período + CSV
│   └── configuracoes/      abas: sistemas, categorias, conta, equipe, auditoria
└── api/clientes/[id]/contexto/route.ts   GET: filiais/contatos/sistemas de um cliente

components/
├── layout/   sidebar, header, mobile-nav, nav.ts (MENU — fonte única), page-header,
│             logo, aviso-supabase
└── ui/       button, card, badge, input, select, textarea, label, campo

lib/
├── auth.ts          exigirUsuario / exigirPerfil / exigirPermissaoDeEscrita
├── env.ts           leitura das variáveis, supabaseConfigurado, exigirServiceRole
├── constants.ts     rótulos e cores dos enums do banco (espelho de base.sql)
├── forms.ts         EstadoFormulario, erroDeValidacao, mensagemDoErro
├── utils.ts         cn() e formatadores pt-BR (data, duração, tamanho, moeda, CPF/CNPJ)
├── anexos.ts        regras de anexo compartilhadas (tipos aceitos, 10 MB, assinatura)
├── agente.ts        gera o script PowerShell de coleta de inventário (com URL e chave do cliente)
├── tema.ts          tema claro/escuro/automático (localStorage + script anti-piscar)
├── schemas/         Zod por entidade — mesma validação no form e na Server Action
├── services/        regra de negócio e acesso ao banco, um arquivo por domínio
├── supabase/        server.ts (por requisição), proxy.ts (sessão), admin.ts (service role)
└── types/database.ts   GERADO — não editar à mão

supabase/migrations/   SQL versionado — única fonte da verdade do banco
scripts/               validar-migrations, testar-schema, gerar-tipos, testar-formularios
proxy.ts               o "middleware" do Next 16: renova sessão e manda para /login
landing/                página de apresentação estática (HTML único), fora do app Next. O formulário
                         de contato grava no sistema (veja Solicitações); URL e chave pública do
                         Supabase, e o e-mail, ficam no objeto CONTATO, no fim do index.html.
atendimento/             página só do formulário de pedido de atendimento, para um subdomínio
                         próprio; mesma função registrar_solicitacao e mesmo objeto CONTATO.
                         Preview: configuração "atendimento" (porta 4200)
                         Preview: preview_start com a configuração "landing" (porta 4100)
public/                 masterbit-logo.png, sw.js (service worker), offline.html e icons/ do PWA
```

**Onde fica cada coisa, na prática:** a página (`page.tsx`, Server Component) chama
um serviço em `lib/services/`; os formulários (componentes `"use client"` na mesma
pasta da rota) chamam Server Actions do `actions.ts` da rota, que validam com o schema
de `lib/schemas/` e chamam o serviço.

---

## 4. Telas e como se conectam

Menu lateral definido em `components/layout/nav.ts`. Todas as rotas exceto `/login`
exigem sessão (o `proxy.ts` redireciona com `?de=` para voltar depois).

| Tela | O que faz | Liga com |
|---|---|---|
| **Dashboard** | contadores (abertos, em andamento, aguardando, resolvidos no mês) e 3 colunas: Pendências, Agenda (próximos 30 dias), Aguardando retorno; abaixo, Últimos atendimentos (só em aberto) | contadores levam a `/atendimentos?status=…` |
| **Solicitações** | pedidos do formulário do site, novas primeiro (selo com a contagem no menu). Responder por e-mail (mailto com o assunto), abrir atendimento (assunto e descrição já preenchidos), marcar como tratada ou descartar | `/atendimentos/novo?titulo=&descricao=` |
| **Atendimentos** (lista) | sem parâmetros abre filtrado em **Em aberto**; `status=todos` mostra tudo. Busca por número, assunto, cliente e — com 3+ letras — por descrição, solução e texto do histórico | `/atendimentos/[id]` |
| **Novo atendimento** | cliente + assunto (sempre em MAIÚSCULAS) bastam; aceita `?cliente=` e `?titulo=` | selects de filial/contato/sistema vêm da API `/api/clientes/[id]/contexto` |
| **Detalhe do atendimento** | assunto editável (lápis); caixa "o que foi feito" com anexo junto da nota (clipe, arrastar, Ctrl+V); timeline; status; resolver (exige solução); responsável; card de anexos; pendências | botões levam a `/pendencias/nova?atendimento=` e `/agenda/novo?atendimento=` |
| **Clientes** | lista com filtro de status; ficha com abas Visão geral, Filiais, Contatos (editar, excluir, reativar, importar planilha), Sistemas | Editar → `/clientes/[id]/editar` (tem "Excluir cliente", que inativa) |
| **Pendências** | agrupadas por status; vencidas em vermelho; iniciar, concluir (com resultado), cancelar | nascem de um atendimento ou de um cliente |
| **Agenda** | Próximos (cedo → tarde), Este mês e Todos (recente → antigo); minicalendário filtra por `?dia=` | detalhe: realizar (pode gravar interação no atendimento), remarcar, cancelar |
| **Consultas** | full-text + filtros combinados; buscas salvas no navegador; exporta CSV | resultados abrem o atendimento |
| **Casos parecidos** | busca nos atendimentos **resolvidos** (função `buscar_atendimentos_parecidos`) | sem resultado → "Criar novo atendimento com estes termos" (`?titulo=`) |
| **Relatórios** | painel com filtros na URL (período, cliente, categoria, sistema, responsável, situação, canal, tipo, prioridade e a métrica atendimentos/tempo): indicadores com variação contra o período anterior, faixa de situação (barra de 100% por situação, situação dentro de cada tipo/categoria/canal e resolvidos por categoria), evolução (dia/semana/mês), barras por dimensão (clicar numa barra aplica o filtro), mapa de calor por dia e faixa do horário, lista do recorte e CSV | `/atendimentos/[id]` |
| **Equipamentos** | parque de máquinas dos clientes: busca (nome, patrimônio, série, usuário, setor), filtros por cliente, tipo e situação (inclui "sem coleta há 15+ dias"); ficha com hardware, discos com espaço livre, rede e o histórico de manutenções (registrar manutenção, ligar ao atendimento) | ficha do cliente, aba Equipamentos: lista do cliente + **Coleta automática** (gerar chave e baixar o script, revogar chave) |
| **Configurações** | Sistemas, Categorias, Conta (tema, perfil, senha); Equipe e Auditoria só para `owner` | Equipe: papel, ativar/desativar, novo usuário com senha temporária |

**Fluxo central:** cliente → atendimento → interações na timeline (texto, tempo,
anexos) → pendências e retornos agendados → resolução com solução escrita → a solução
vira memória consultável em Consultas e Casos parecidos.

---

## 5. Banco de dados

23 tabelas, 1 view, RLS em todas. Toda tabela de negócio tem `org_id`.

```
organizacoes ─┬─ profiles (1:1 com auth.users; role owner|tecnico|visualizador; ativo)
              │
              ├─ clientes ─┬─ filiais
              │            ├─ cliente_contatos ──(filial_id)── filiais
              │            └─ clientes_sistemas ── sistemas
              │
              ├─ categorias ── subcategorias
              │
              ├─ atendimentos ── cliente, filial, contato, sistema, categoria,
              │      │           subcategoria, responsavel (profile)
              │      ├─ atendimento_interacoes   (timeline, append-only)
              │      ├─ atendimento_anexos       (metadados; arquivo no Storage)
              │      ├─ pendencias               (ou ligada só ao cliente)
              │      └─ agenda_eventos           (ou ligado a cliente/pendência)
              │
              ├─ consultoria_projetos ── consultoria_topicos ─┬─ consultoria_comentarios
              │                                               └─ consultoria_anexos
              │   (SEM TELA no app desde 07/10/2026: a Consultoria Citel foi retirada;
              │    as tabelas e os dados continuam no banco, as migrations não se editam)
              ├─ equipamentos ── cliente, filial ─── equipamento_manutencoes (append-only)
              ├─ coleta_chaves (por cliente; só o hash SHA-256 da chave)
              ├─ solicitacoes (formulário público da landing; só a função
              │               registrar_solicitacao() cria linhas)
              └─ audit_logs   (preenchida só por trigger)

view atendimentos_lista = atendimentos + nomes de cliente, categoria, sistema,
                          responsável + contagem de pendências abertas
```

### Regras que estão no banco (não na aplicação)

- **Isolamento por organização:** `org_atual()`, `papel_atual()` e `pode_escrever()`
  são usadas por todas as policies. Leitura: mesma organização. Escrita: `owner` ou
  `tecnico`. `visualizador` só lê. Usuário com `ativo = false` não lê nem escreve nada.
- **Timeline imutável:** `atendimento_interacoes` e `consultoria_comentarios` só têm
  policy de SELECT e INSERT. Correção entra como nova interação.
- **Triggers do atendimento:** número `AT-AAAA-NNNNN` automático; interação "Atendimento
  aberto" na criação; interação de mudança de status; `finalizado_em` preenchido ao
  resolver/cancelar e limpo ao reabrir; tempo das interações somado no atendimento.
- **Novo usuário:** trigger em `auth.users` cria o `profile` (primeiro = owner ativo;
  demais = tecnico **inativo**, até o owner ativar) e semeia 7 categorias e 28
  subcategorias na primeira vez.
- **Proteção de papel:** trigger `proteger_profile` — só owner muda papel ou situação;
  a organização sempre mantém um owner ativo.
- **Anexos:** só `removido_em` pode mudar (soft delete); caminho tem de começar pelo
  `org_id`; limite de 10 MB. Triggers `proteger_anexo` (atendimento) e
  `proteger_anexo_consultoria` (tópico) são **funções diferentes** — cada uma conhece
  a sua coluna (`atendimento_id` / `topico_id`).
- **Auditoria:** clientes, atendimentos, pendências, profiles, clientes_sistemas e
  consultoria_topicos gravam em `audit_logs` (só o owner lê).
- **Constraints com mensagem em português:** `lib/services/erros.ts` traduz o nome da
  constraint. Constraint nova → acrescentar lá.

- **Solicitações (formulário público):** a tabela não tem policy de INSERT nem de DELETE.
  Quem não tem conta grava pela função `registrar_solicitacao` (SECURITY DEFINER), liberada
  ao papel `anon`: valida tamanhos e e-mail, ignora quem preenche o campo-armadilha `p_site`,
  freia 3 envios por e-mail e 30 no total por hora, e usa a primeira organização. O
  conteúdo enviado nunca é editável; só o status muda (e o trigger registra quem tratou).

- **Coleta de equipamentos:** o agente chama a função `registrar_coleta(chave, dados)`
  (SECURITY DEFINER, liberada a `anon`). A chave decide cliente e organização; o banco só
  guarda o SHA-256 dela. Repetição da mesma máquina em menos de 5 minutos é ignorada, cada
  chave cria no máximo 300 máquinas novas por hora, textos e listas são cortados. A
  coleta nunca sobrescreve patrimônio, setor, observações, tipo e filial. Manutenções
  são append-only (só SELECT e INSERT). Equipamentos não têm auditoria automática: cada
  coleta é um UPDATE e lotaria o `audit_logs`.

### Storage

Um bucket só, `anexos`, privado. Caminhos: `{org_id}/{atendimento_id}/{uuid}.ext` e
`{org_id}/consultoria/{topico_id}/{uuid}.ext`. A policy confere só a primeira pasta
(= organização). Não há policy de UPDATE nem DELETE: arquivo enviado nunca é apagado.
URLs exibidas são assinadas e valem 1 hora.

---

## 6. Padrões de código e de layout

### Regras obrigatórias

- **Next.js 16:** o middleware é `proxy.ts`. `params`, `searchParams` e `cookies()`
  são assíncronos — sempre `await`.
- **Português no domínio:** tabelas, colunas, enums, rotas, funções e variáveis em
  pt-BR. Termos técnicos (props, tipos utilitários, libs) em inglês.
- **Autorização:** `proxy.ts` é checagem otimista, não defesa. A defesa é o RLS. Toda
  Server Action revalida sessão e entrada (Zod) antes de escrever — Server Actions são
  endpoints POST públicos.
- **`org_id` sempre do perfil logado**, nunca do formulário.
- **Visualizador não vê controles de escrita.** Botão, formulário ou link para
  criar/editar/excluir só aparece com `await podeEscreverAgora()` verdadeiro, e páginas
  de criar/editar começam com `await exigirEscritaNaPagina("/listagem")`
  (`lib/auth.ts`). Isso é conveniência de tela — a barreira real continua sendo
  `exigirPermissaoDeEscrita()` na Server Action e o RLS. Tela nova com escrita segue
  as duas regras.
- **Supabase no servidor:** `getUser()`, nunca `getSession()`. Um cliente por
  requisição (`criarClienteServidor()`), nunca em variável de módulo. O cliente admin
  (`lib/supabase/admin.ts`) só em código de servidor e só para o que exige service role.
- **Migrations:** SQL em `supabase/migrations/`, nunca editar uma já aplicada — crie
  outra. Rode `db:check` e `db:test` sempre que mexer no schema.
- **`lib/types/database.ts` é gerado.** Não editar à mão.
- **Arquivos `"use server"` só exportam funções async.** Tipos e constantes vão para
  `lib/forms.ts`, `lib/schemas/` ou o serviço — senão o build falha.
- **Campos opcionais aceitam ausente, não só vazio:** campo desabilitado não entra no
  FormData. Use os helpers `.optional().transform(...)` dos schemas e rode
  `npm run test:forms`.
- **Todo campo mostra a mensagem do seu erro** logo abaixo dele.
- **Soft delete:** clientes (`status`), contatos (`ativo`), atendimentos, pendências e
  eventos (`status`), anexos (`removido_em`). Nada de `DELETE` em dado de negócio.
- **Estado:** dado canônico vem do servidor (RSC); filtros e paginação na URL;
  `localStorage` só para preferência do navegador (tema, buscas salvas).
- **Enums:** `lib/constants.ts` espelha os enums de `base.sql` — ao mudar um, mude o outro.

### Padrão de uma funcionalidade

1. `page.tsx` — Server Component, `export const dynamic = "force-dynamic"`, começa com
   o guard `if (!supabaseConfigurado) return <AvisoSupabase />`, busca pelo serviço.
2. `lib/services/x.ts` — `exigirPermissaoDeEscrita()` em toda escrita, `traduzirErro`
   nos erros do Supabase.
3. `lib/schemas/x.ts` — schema Zod.
4. `app/(app)/x/actions.ts` — `"use server"`; valida com
   `schema.safeParse(dadosDoFormulario(formData))`, chama o serviço, `revalidatePath`.
5. Componente cliente na mesma pasta da rota.

Dois formatos de Server Action convivem:
- `(_estado, formData) => Promise<EstadoFormulario>` — com `useActionState` ou chamada
  direta; devolve erros por campo. **Use este** para qualquer coisa que possa falhar.
- `(formData) => Promise<void>` — formulário simples (cancelar, inativar). Não tem como
  mostrar erro: se lançar, o usuário vê a página de erro genérica do Next.

Para "resetar" um formulário ao trocar de item, o padrão é **trocar a `key`** do
componente (veja contatos e progresso), não sincronizar campo a campo.

Comentários: só para o *porquê* (restrição escondida, decisão de produto), em
português, curtos.

### Padrão visual

- **Shell:** Sidebar fixa (desktop) + Header com "Novo atendimento"; no celular, menu
  em gaveta (`mobile-nav`). Conteúdo em `main` com `p-6`.
- **Página:** `PageHeader` (título, descrição, ações à direita) → filtros → conteúdo.
- **Contêiner padrão:** `Card` / `CardHeader` / `CardTitle` / `CardContent`.
- **Tabela:** dentro de `Card className="overflow-hidden"` + `div overflow-x-auto`;
  `thead` com `bg-surface-muted`; células `px-4 py-2.5`.
- **Detalhe:** grade `lg:grid-cols-[1fr_20rem]` — conteúdo à esquerda, lateral à direita.
- **Estado vazio:** card centralizado com ícone, frase curta e, quando faz sentido, o botão
  da ação.
- **Badges:** cor e rótulo vêm de `lib/constants.ts` (ex.: `STATUS_ATENDIMENTO[s].cor`).
- **Botões:** variantes `primary`, `outline`, `ghost`, `destructive`; tamanhos `sm`,
  `md`, `lg`, `icon`. Ícones `lucide-react` em `size-3.5`/`size-4`.
- **Erro de campo:** texto `text-xs text-red-600 dark:text-red-400` com `role="alert"`.
- **Cores:** só por tokens (`bg-surface`, `text-muted-foreground`, `border-border`,
  `bg-primary`…) definidos em `app/globals.css`. Tema claro, escuro e automático.
- **Marca Masterbit:** laranja `#F47B36` (no tema claro o primário é `#C4561B`, por
  contraste). O vermelho da logo (`#CD242B`) **não** é cor de marca na interface —
  vermelho significa urgente, vencido e excluir.
- **Datas e números:** sempre pelos formatadores de `lib/utils.ts` (pt-BR).

---

## 7. Pontos frágeis — não mexer sem cuidado

### Segurança (prioridade)

1. **Cadastro público.** A chave pública do Supabase vai no navegador, então, se o
   projeto aceitar cadastro (padrão do Supabase), qualquer pessoa cria usuário pela API
   do Auth, e o trigger `tratar_novo_usuario` a põe na organização. Duas camadas:
   - **Painel (configuração, não código):** manter desligado "Allow new users to sign
     up" em Authentication → Sign In / Providers. Criar usuário pela tela Equipe
     continua funcionando, porque usa a API admin.
   - **Banco — desde 01/10/2026, não desfazer:** usuário novo nasce `ativo = false`
     (migration `20261001130000`), e por isso não vê nada até o owner ativar. A tela
     Equipe ativa logo após criar (`criarUsuario` em `lib/services/equipe.ts`). Se
     alguém mudar o trigger para nascer ativo, o cadastro público volta a dar acesso
     de técnico a desconhecidos.
2. **Usuário desativado — corrigido em 01/10/2026, não desfazer.** `org_atual()` e
   `papel_atual()` filtram `ativo` (migration `20261001120000`); para um desativado
   devolvem NULL e nenhuma policy casa, nem pela API direta. No app, `exigirUsuario()`
   manda quem não tem perfil ativo para `/sair?motivo=inativo`, e o login recusa conta
   desativada. Consequência: o desativado não enxerga nem o próprio perfil — `perfil`
   nulo para um usuário logado significa "inativo".
3. **Redirecionamento do login — corrigido em 01/10/2026.** `destinoSeguro()` em
   `app/(auth)/login/actions.ts` só aceita caminho interno (resolve contra uma origem
   fictícia, o que barra `//site`, `/\site` e afins). Não troque por um `startsWith("/")`
   simples.
4. **Service role key** ignora todo o RLS. Só em `lib/supabase/admin.ts`, só no
   servidor, nunca com `NEXT_PUBLIC_`, nunca em log.

### Banco e dados

5. **`supabase/schema-completo.sql` está desatualizado** (gerado em 08/09/2026). Faltam
   as 8 migrations seguintes, inclusive a proteção de papel, o bloqueio de usuário
   desativado e o usuário novo nascendo inativo. Não use para montar banco
   novo — use `npm run db:push`.
6. **View `atendimentos_lista`:** precisa manter `security_invoker = true` (sem isso
   ela ignora o RLS e vaza dados entre organizações). Coluna nova em `atendimentos` só
   aparece na lista, no dashboard, em consultas e em relatórios se for acrescentada na
   view.
7. **Limite de 1.000 linhas do Supabase.** Relatórios agora lê em páginas de 1.000 (teto de
   20.000 linhas, com aviso na tela quando passa) e agrega em JavaScript; a busca por
   conteúdo em Atendimentos ainda levanta IDs e os passa em `id.in.(…)`, então com volume
   grande a URL dela pode estourar.
8. **Suposição de organização única:** `tratar_novo_usuario` e a semente da Consultoria
   Citel pegam "a primeira organização". Multi-empresa exigiria revisar os dois.
9. **Função `buscar_atendimentos_parecidos`:** o gerador de tipos não descreve funções,
   então `lib/services/similares.ts` chama o `rpc` com cast. Mudar a assinatura no SQL
   não quebra o TypeScript — quebra em execução.
10. **Automação fora do banco:** a primeira interação muda o atendimento de `aberto`
    para `em_andamento` em `registrarInteracao` (aplicação), não por trigger.
11. **Fuso horário:** "hoje" e "este mês" ainda usam a hora do servidor fora dos Relatórios. Nos
    Relatórios os limites do período usam `-03:00` fixo e o agrupamento por dia, semana e
    faixa do dia usa `America/Sao_Paulo` (o Brasil não tem horário de verão desde 2019; se
    voltar, ajustar `DESLOCAMENTO` em `lib/services/relatorios.ts`).

### Código

12. **Regex de caracteres de controle** em `limparNomeDoAnexo` (`lib/anexos.ts`) é
    `/[\x00-\x1f]/g`, mas editores e ferramentas a exibem como `[ -]`. Copiar o que se vê
    troca a regra por "remover espaços e hífens". Não redigite essa linha.
13. **Anexo junto da nota:** os arquivos sobem antes (`prepararAnexoAction`) e a nota grava
    `[{id, nome}]` em `atendimento_interacoes.anexos` (jsonb). Se a nota falhar depois do
    upload, o arquivo fica no card de Anexos sem nota correspondente.
14. **Limite de upload:** `next.config.ts` aumenta o corpo das Server Actions para 11 MB.
    O servidor de hospedagem também precisa aceitar esse tamanho.
15. **`xlsx` 0.18.5:** é a última versão no npm, que tem vulnerabilidades conhecidas; as
    correções só existem no CDN da SheetJS. Hoje lê só arquivos que o próprio usuário
    escolhe, no navegador.
16. **Sessão, recuperação e erros (resolvido em 03/10/2026):** o botão Sair do cabeçalho
    usa a action `sair()`; a rota `GET /sair` serve ao desvio de conta desativada. No
    `proxy.ts`, `/sair` e `/auth/confirmar` passam sem desvio, e `/nova-senha` exige sessão
    mas **não** está em `ROTAS_PUBLICAS` — pôr lá faria o proxy tirar do formulário quem
    chegou pelo link (logado pela sessão de recuperação). `/auth/confirmar` tem destino
    fixo; nunca faça o destino depender da URL (redirecionamento aberto). Em
    `error.tsx` a função de tentar de novo se chama `retry` nesta versão do Next, não
    `reset`. `global-error.tsx` não recebe o CSS global — o estilo é inline.
17. **Sem uso, mas presentes:** `lib/supabase/client.ts`, `components/layout/placeholder.tsx`
    e as dependências listadas na seção 2. O `README.md` está atrás do código (fala em
    14 tabelas e não cita Casos parecidos nem Consultoria).
18. **Formulário público (migration `20261006120000`).** É a única escrita aberta a quem não
    está logado. Pontos de atenção: (a) `registrar_solicitacao` precisa continuar sem policy
    de INSERT para `anon` na tabela — nunca troque a função por uma policy; (b) os códigos de
    erro (`dados_invalidos`, `limite_excedido`, `sem_organizacao`) são lidos por
    `landing/index.html`; (c) a chave que a landing carrega é a **Publishable** (pública por
    desenho), nunca a Secret nem a service_role; (d) o freio global (30 por hora) deixa uma
    enxurrada bloquear o formulário por até uma hora — nada é perdido; (e) o texto vem de
    estranhos: a tela exibe como texto puro (`whitespace-pre-wrap`), nunca como HTML;
    (f) a assinatura da função não aparece nos tipos gerados — mudar o SQL não quebra o
    TypeScript, quebra a landing em execução.
19. **PWA (07/10/2026).** O app é instalável (`app/manifest.ts`, ícones em `public/icons/`). O service
    worker `public/sw.js` só mostra `public/offline.html` quando a navegação falha: **não guarda
    páginas nem dados**, porque são de clientes e exigem login — nunca acrescente cache de
    resposta sem decidir antes o que pode ficar no aparelho. O `proxy.ts` exclui
    `manifest.webmanifest`, `sw.js` e `offline.html` no `matcher`: o navegador os busca sem sessão,
    e um redirecionamento ao login invalidaria o PWA. O worker só se registra em produção
    (`RegistrarServiceWorker`). Ao mudar o `sw.js`, aumente `VERSAO` nele. Notificações push
    ainda não existem. Os ícones foram gerados de uma imagem pequena (119 x 93 px): se houver
    a logo em 512 px ou mais, refazer.
20. **Cores dos gráficos (Relatórios).** Os tokens `--viz-1` (laranja) e `--viz-2` (azul) em
    `app/globals.css` foram validados com o validador de paleta da skill de dataviz nos dois
    temas. No escuro o laranja é `#e0652c`, não o `#f47b36` da marca, que sai da faixa de
    luminosidade. Laranja = atendimentos abertos, azul = resolvidos: não reutilize essas
    cores com outro significado no mesmo painel. As sete situações têm cores fixas (`--sit-*`, na
    ordem de `ORDEM_SITUACAO` em `lib/constants.ts`), validadas nos dois temas: no claro três tons
    ficam abaixo de 3:1, por isso a legenda sempre mostra os números e há tabela equivalente.
    Resolvido é azul em todo o painel; a cor segue a situação, nunca a posição. Todo gráfico tem gêmea em tabela (`<details>`
    ou a própria `<table>` do mapa de calor).
21. **Agente de coleta (`lib/agente.ts`, migration `20261010120000`).** O script é PowerShell 5.1
    gerado dentro de um template string do TypeScript: **não pode ter crase nem `${`** no
    texto do PowerShell (usa só aspas simples e `$variavel`). O download leva BOM (sem ele o
    PowerShell 5.1 lê como ANSI) e quebra de linha CRLF. A instalação cria a tarefa agendada
    "Masterbit Suport - Inventario" (SYSTEM, ao ligar + diária às 12h) e copia o script para
    `C:\ProgramData\MasterbitSuport`, com permissão só para SYSTEM e Administradores por SID (o
    nome do grupo muda com o idioma). A chave de coleta fica nesse arquivo: quem é
    administrador da máquina consegue lê-la e enviar inventário falso **daquele cliente** —
    o remédio é revogar a chave na ficha do cliente. O hash da chave é calculado igual nos
    dois lados (`sha256` do Node e `sha256(convert_to(...))` do Postgres); mudar um exige
    mudar o outro e invalida as chaves existentes. Os códigos de erro (`chave_invalida`,
    `dados_invalidos`, `limite_excedido`) aparecem no log `ultimo-envio.txt` do computador.

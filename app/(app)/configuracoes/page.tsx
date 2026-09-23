import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { AvisoSupabase } from "@/components/layout/aviso-supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obterPerfil } from "@/lib/auth";
import { serviceRoleConfigurado, supabaseConfigurado } from "@/lib/env";
import { listarCategorias, listarSistemas } from "@/lib/services/catalogo";
import { listarAuditoria, listarEquipe, TABELAS_AUDITADAS } from "@/lib/services/equipe";
import { formatarData, formatarDataHora } from "@/lib/utils";
import { FormularioCategoria, FormularioSistema, FormularioSubcategoria } from "./formularios";
import {
  ControlesDoMembro,
  FormularioNovoUsuario,
  FormularioPerfil,
  FormularioSenha,
} from "./formularios-equipe";
import { SeletorDeTema } from "./seletor-de-tema";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

const ABAS = [
  { chave: "sistemas", rotulo: "Sistemas", soOwner: false },
  { chave: "categorias", rotulo: "Categorias", soOwner: false },
  { chave: "conta", rotulo: "Conta", soOwner: false },
  { chave: "equipe", rotulo: "Equipe", soOwner: true },
  { chave: "auditoria", rotulo: "Auditoria", soOwner: true },
] as const;

const ROTULOS_PAPEL = {
  owner: "Owner",
  tecnico: "Técnico",
  visualizador: "Visualizador",
} as const;

const ACOES_AUDITORIA = { INSERT: "Criou", UPDATE: "Alterou", DELETE: "Excluiu" } as const;

/** Só as tabelas com tela própria têm link para o registro. */
const ROTAS_DO_REGISTRO: Record<string, string> = {
  atendimentos: "/atendimentos",
  clientes: "/clientes",
};

function linkAuditoria(tabela: string | undefined, pagina: number) {
  const params = new URLSearchParams({ aba: "auditoria" });
  if (tabela) params.set("tabela", tabela);
  if (pagina > 1) params.set("pagina", String(pagina));
  return `/configuracoes?${params}`;
}

function FiltroAuditoria({ rotulo, href, ativo }: { rotulo: string; href: string; ativo: boolean }) {
  return (
    <Link
      href={href}
      className={
        ativo
          ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
      }
    >
      {rotulo}
    </Link>
  );
}

function RegistroLink({ tabela, id }: { tabela: string; id: string | null }) {
  const base = ROTAS_DO_REGISTRO[tabela];
  if (!base || !id) return null;
  return (
    <Link href={`${base}/${id}`} className="ml-2 text-xs text-primary hover:underline">
      abrir
    </Link>
  );
}

const TIPOS_SISTEMA: Record<string, string> = {
  erp: "ERP",
  fiscal: "Fiscal",
  sistema_proprio: "Sistema próprio",
  infraestrutura: "Infraestrutura",
  outro: "Outro",
};

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; tabela?: string; pagina?: string }>;
}) {
  const { aba: abaParam, tabela, pagina: paginaParam } = await searchParams;
  const pagina = Number.parseInt(paginaParam ?? "1", 10) || 1;

  if (!supabaseConfigurado) {
    return (
      <>
        <PageHeader titulo="Configurações" descricao="Cadastros de apoio, preferências e acesso." />
        <AvisoSupabase />
      </>
    );
  }

  const perfil = await obterPerfil();
  const ehOwner = perfil?.role === "owner";
  const abasVisiveis = ABAS.filter((a) => !a.soOwner || ehOwner);
  const aba = abasVisiveis.some((a) => a.chave === abaParam) ? abaParam! : "sistemas";

  const [sistemas, categorias, equipe, auditoria] = await Promise.all([
    listarSistemas(true),
    listarCategorias(),
    aba === "equipe" && ehOwner ? listarEquipe() : Promise.resolve([]),
    aba === "auditoria" && ehOwner ? listarAuditoria({ tabela }, pagina) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader titulo="Configurações" descricao="Cadastros de apoio, preferências e acesso." />

      <nav className="mb-4 flex gap-1 border-b border-border">
        {abasVisiveis.map((item) => (
          <Link
            key={item.chave}
            href={`/configuracoes?aba=${item.chave}`}
            className={
              item.chave === aba
                ? "border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
                : "border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {item.rotulo}
          </Link>
        ))}
      </nav>

      {aba === "sistemas" ? (
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            {sistemas.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum sistema cadastrado. Adicione os softwares que você atende.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-surface-muted text-left">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Sistema</th>
                      <th className="px-4 py-2.5 font-medium">Fabricante</th>
                      <th className="px-4 py-2.5 font-medium">Tipo</th>
                      <th className="px-4 py-2.5 font-medium">Versão</th>
                      <th className="px-4 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sistemas.map((sistema) => (
                      <tr key={sistema.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium">{sistema.nome}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {sistema.fabricante ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {TIPOS_SISTEMA[sistema.tipo] ?? sistema.tipo}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {sistema.versao_atual ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {sistema.ativo ? null : <Badge>Inativo</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adicionar sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <FormularioSistema />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {aba === "categorias" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Categorias e subcategorias</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
              ) : (
                categorias.map((categoria) => (
                  <div key={categoria.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: categoria.cor }}
                        aria-hidden
                      />
                      <span className="text-sm font-medium">{categoria.nome}</span>
                      {categoria.ativo ? null : <Badge>Inativa</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-5">
                      {categoria.subcategorias.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sem subcategorias</span>
                      ) : (
                        categoria.subcategorias.map((sub) => (
                          <Badge key={sub.id}>
                            {sub.nome}
                            {sub.sla_horas ? ` · ${sub.sla_horas}h` : ""}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adicionar categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <FormularioCategoria />
            </CardContent>
          </Card>

          {categorias.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Adicionar subcategoria</CardTitle>
              </CardHeader>
              <CardContent>
                <FormularioSubcategoria categorias={categorias} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {aba === "conta" && perfil ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <p className="text-sm text-muted-foreground">
                Vale só neste navegador. No modo Automático o sistema segue o tema do seu
                computador.
              </p>
            </CardHeader>
            <CardContent>
              <SeletorDeTema />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <p className="text-sm text-muted-foreground">
                {perfil.email} · {ROTULOS_PAPEL[perfil.role]}
              </p>
            </CardHeader>
            <CardContent>
              <FormularioPerfil nome={perfil.nome} telefone={perfil.telefone} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Senha</CardTitle>
            </CardHeader>
            <CardContent>
              <FormularioSenha />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {aba === "equipe" && ehOwner && perfil ? (
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted text-left">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Usuário</th>
                    <th className="px-4 py-2.5 font-medium">Papel</th>
                    <th className="px-4 py-2.5 font-medium">Desde</th>
                    <th className="px-4 py-2.5 text-right font-medium">Gerenciar</th>
                  </tr>
                </thead>
                <tbody>
                  {equipe.map((membro) => (
                    <tr key={membro.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{membro.nome}</span>
                        {membro.ativo ? null : <Badge className="ml-2">Inativo</Badge>}
                        <div className="text-xs text-muted-foreground">{membro.email}</div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {ROTULOS_PAPEL[membro.role]}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatarData(membro.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end">
                          <ControlesDoMembro
                            id={membro.id}
                            role={membro.role}
                            ativo={membro.ativo}
                            ehVoce={membro.id === perfil.id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {serviceRoleConfigurado ? (
            <Card>
              <CardHeader>
                <CardTitle>Novo usuário</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Entra com uma senha temporária — sem e-mail configurado no projeto, é você quem
                  repassa o acesso.
                </p>
              </CardHeader>
              <CardContent>
                <FormularioNovoUsuario />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-300 dark:border-amber-800">
              <CardContent className="p-5 text-sm">
                <p className="font-medium">Criar usuário pelo sistema ainda não está disponível.</p>
                <p className="mt-1 text-muted-foreground">
                  Falta configurar a <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> no
                  servidor (painel do Supabase → Project Settings → API → service_role, colada em
                  <code className="font-mono"> .env.local</code>). Até lá, crie o usuário em
                  Authentication → Users no painel do Supabase — ele já entra automaticamente como
                  Técnico.
                </p>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Owner gerencia papéis; Visualizador só consulta. A organização sempre mantém ao menos
            um owner ativo.
          </p>
        </div>
      ) : null}

      {aba === "auditoria" && ehOwner && auditoria ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            <FiltroAuditoria rotulo="Tudo" href="/configuracoes?aba=auditoria" ativo={!tabela} />
            {Object.entries(TABELAS_AUDITADAS).map(([chave, rotulo]) => (
              <FiltroAuditoria
                key={chave}
                rotulo={rotulo}
                href={`/configuracoes?aba=auditoria&tabela=${chave}`}
                ativo={tabela === chave}
              />
            ))}
          </div>

          <Card className="overflow-hidden">
            {auditoria.itens.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum registro de auditoria.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-surface-muted text-left">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Quando</th>
                      <th className="px-4 py-2.5 font-medium">Quem</th>
                      <th className="px-4 py-2.5 font-medium">O quê</th>
                      <th className="px-4 py-2.5 font-medium">Campos alterados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoria.itens.map((registro) => (
                      <tr key={registro.id} className="border-b border-border last:border-0">
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {formatarDataHora(registro.created_at)}
                        </td>
                        <td className="px-4 py-2.5">{registro.ator_nome ?? "Sistema"}</td>
                        <td className="px-4 py-2.5">
                          <Badge>{ACOES_AUDITORIA[registro.acao]}</Badge>{" "}
                          {TABELAS_AUDITADAS[registro.tabela] ?? registro.tabela}
                          <RegistroLink tabela={registro.tabela} id={registro.registro_id} />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {registro.campos_alterados?.join(", ") ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {auditoria.total} {auditoria.total === 1 ? "registro" : "registros"}
              {auditoria.paginas > 1 ? ` · página ${pagina} de ${auditoria.paginas}` : ""}
            </span>
            {auditoria.paginas > 1 ? (
              <div className="flex gap-2">
                {pagina > 1 ? (
                  <Link href={linkAuditoria(tabela, pagina - 1)} className="text-primary hover:underline">
                    Anterior
                  </Link>
                ) : null}
                {pagina < auditoria.paginas ? (
                  <Link href={linkAuditoria(tabela, pagina + 1)} className="text-primary hover:underline">
                    Próxima
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

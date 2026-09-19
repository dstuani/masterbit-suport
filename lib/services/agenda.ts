import { exigirPermissaoDeEscrita } from "@/lib/auth";
import { traduzirErro } from "@/lib/services/erros";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Inserir, Tabelas } from "@/lib/types/database";
import type {
  DadosEvento,
  DadosRealizarEvento,
  DadosRemarcarEvento,
} from "@/lib/schemas/agenda";

export type Evento = Tabelas<"agenda_eventos">;

export type EventoComContexto = Evento & {
  clientes: { razao_social: string } | null;
  atendimentos: { titulo: string; numero: string } | null;
  pendencias: { titulo: string } | null;
};

export type FiltrosAgenda = {
  de?: string;   // ISO date (inclusive)
  ate?: string;  // ISO date (exclusive)
  clienteId?: string;
  atendimentoId?: string;
  status?: "agendado" | "confirmado" | "realizado" | "cancelado" | "remarcado" | "pendentes";
};

export async function listarEventos(filtros: FiltrosAgenda = {}): Promise<EventoComContexto[]> {
  const supabase = await criarClienteServidor();

  let query = supabase
    .from("agenda_eventos")
    .select("*, clientes(razao_social), atendimentos(titulo, numero), pendencias(titulo)")
    .order("inicio", { ascending: true });

  if (filtros.status === "pendentes") {
    query = query.in("status", ["agendado", "confirmado"]);
  } else if (filtros.status) {
    query = query.eq("status", filtros.status);
  }

  if (filtros.de) query = query.gte("inicio", filtros.de);
  if (filtros.ate) query = query.lt("inicio", filtros.ate);
  if (filtros.clienteId) query = query.eq("cliente_id", filtros.clienteId);
  if (filtros.atendimentoId) query = query.eq("atendimento_id", filtros.atendimentoId);

  const { data, error } = await query;
  if (error) throw new Error(traduzirErro(error.message));
  return (data ?? []) as EventoComContexto[];
}

export async function obterEvento(id: string): Promise<EventoComContexto | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("agenda_eventos")
    .select("*, clientes(razao_social), atendimentos(titulo, numero), pendencias(titulo)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(traduzirErro(error.message));
  return (data ?? null) as EventoComContexto | null;
}

export async function criarEvento(dados: DadosEvento): Promise<Evento> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  // Se veio atendimento_id sem cliente_id, herda o cliente do atendimento.
  let clienteId = dados.cliente_id;
  if (!clienteId && dados.atendimento_id) {
    const { data } = await supabase
      .from("atendimentos")
      .select("cliente_id")
      .eq("id", dados.atendimento_id)
      .maybeSingle();
    clienteId = data?.cliente_id ?? null;
  }

  const registro: Inserir<"agenda_eventos"> = {
    org_id: perfil.org_id,
    titulo: dados.titulo,
    descricao: dados.descricao,
    tipo: dados.tipo,
    cliente_id: clienteId,
    atendimento_id: dados.atendimento_id,
    pendencia_id: dados.pendencia_id,
    responsavel_id: perfil.id,
    inicio: dados.inicio,
    fim: dados.fim ?? null,
    dia_inteiro: dados.dia_inteiro,
    local: dados.local,
    lembrete_minutos: dados.lembrete_minutos ?? null,
    status: "agendado",
    created_by: perfil.id,
  };

  const { data, error } = await supabase.from("agenda_eventos").insert(registro).select().single();
  if (error) throw new Error(traduzirErro(error.message));
  return data;
}

export async function realizarEvento(dados: DadosRealizarEvento): Promise<void> {
  const perfil = await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("agenda_eventos")
    .update({ status: "realizado", resultado: dados.resultado })
    .eq("id", dados.id);

  if (error) throw new Error(traduzirErro(error.message));

  // Quando o evento está vinculado a um atendimento e o usuário pediu para
  // registrar, grava uma interação na timeline do atendimento.
  if (dados.registrar_interacao && dados.resultado) {
    const { data: evento } = await supabase
      .from("agenda_eventos")
      .select("atendimento_id, tipo, titulo")
      .eq("id", dados.id)
      .maybeSingle();

    if (evento?.atendimento_id) {
      await supabase.from("atendimento_interacoes").insert({
        org_id: perfil.org_id,
        atendimento_id: evento.atendimento_id,
        autor_id: perfil.id,
        tipo: evento.tipo === "visita" ? "visita" : "nota",
        conteudo: `Retorno realizado — ${evento.titulo}:\n${dados.resultado}`,
        tempo_gasto_minutos: 0,
      });
    }
  }
}

export async function remarcarEvento(dados: DadosRemarcarEvento): Promise<void> {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("agenda_eventos")
    .update({
      status: "remarcado",
      resultado: dados.motivo ? `Remarcado: ${dados.motivo}` : "Remarcado",
    })
    .eq("id", dados.id);

  if (error) throw new Error(traduzirErro(error.message));

  // Cria novo evento com as datas atualizadas.
  const { data: original } = await supabase
    .from("agenda_eventos")
    .select("*")
    .eq("id", dados.id)
    .maybeSingle();

  if (!original) return;

  const perfil = await exigirPermissaoDeEscrita();

  await supabase.from("agenda_eventos").insert({
    org_id: original.org_id,
    titulo: original.titulo,
    descricao: original.descricao,
    tipo: original.tipo,
    cliente_id: original.cliente_id,
    atendimento_id: original.atendimento_id,
    pendencia_id: original.pendencia_id,
    responsavel_id: original.responsavel_id,
    inicio: dados.inicio,
    fim: dados.fim ?? null,
    dia_inteiro: original.dia_inteiro,
    local: original.local,
    lembrete_minutos: original.lembrete_minutos,
    status: "agendado",
    created_by: perfil.id,
  });
}

export async function cancelarEvento(id: string): Promise<void> {
  await exigirPermissaoDeEscrita();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("agenda_eventos")
    .update({ status: "cancelado" })
    .eq("id", id);

  if (error) throw new Error(traduzirErro(error.message));
}

/** Conta eventos pendentes (agendado + confirmado) para o dashboard. */
export async function contarEventosPendentes(): Promise<number> {
  const supabase = await criarClienteServidor();
  const { count, error } = await supabase
    .from("agenda_eventos")
    .select("*", { count: "exact", head: true })
    .in("status", ["agendado", "confirmado"]);

  if (error) return 0;
  return count ?? 0;
}

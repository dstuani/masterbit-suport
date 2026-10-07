"use server";

import { redirect } from "next/navigation";

import { dadosDoFormulario } from "@/lib/schemas/cadastros";
import { senhaSchema } from "@/lib/schemas/equipe";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoNovaSenha = { erro: string | null };

export async function definirNovaSenha(
  _estado: EstadoNovaSenha,
  formData: FormData,
): Promise<EstadoNovaSenha> {
  const analise = senhaSchema.safeParse(dadosDoFormulario(formData));
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await criarClienteServidor();

  // O proxy já barra quem não tem sessão; confirmar aqui porque Server Action é
  // endpoint público e esta é a gravação que importa.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Peça um novo link de recuperação." };

  const { error } = await supabase.auth.updateUser({ password: analise.data.senha });

  if (error) {
    console.error("[nova-senha] falha:", { code: error.code, status: error.status, message: error.message });
    if (error.code === "same_password") {
      return { erro: "A nova senha precisa ser diferente da atual." };
    }
    if (error.code === "weak_password") {
      return { erro: "Senha fraca demais. Use letras, números e mais caracteres." };
    }
    return { erro: "Não foi possível salvar a nova senha. Tente de novo." };
  }

  // Quem pediu a recuperação pode ter perdido a senha por ela ter vazado: derruba as
  // outras sessões abertas, mantendo só esta.
  await supabase.auth.signOut({ scope: "others" });

  redirect("/dashboard");
}

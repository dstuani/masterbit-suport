import { FormularioLogin } from "./formulario-login";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; motivo?: string }>;
}) {
  const { de, motivo } = await searchParams;
  return (
    <FormularioLogin
      de={de ?? ""}
      aviso={
        motivo === "inativo"
          ? "Sua conta está desativada ou aguardando liberação. Fale com o administrador do sistema."
          : null
      }
    />
  );
}

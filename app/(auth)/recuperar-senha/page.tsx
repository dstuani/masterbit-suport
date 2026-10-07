import { FormularioRecuperacao } from "./formulario";

export const metadata = { title: "Recuperar senha" };

export default async function RecuperarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <FormularioRecuperacao
      aviso={
        erro === "link"
          ? "Esse link não é mais válido: ele expira, só funciona uma vez e precisa ser aberto no mesmo navegador em que foi pedido. Peça um novo abaixo."
          : null
      }
    />
  );
}

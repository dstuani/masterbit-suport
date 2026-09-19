import { FormularioLogin } from "./formulario-login";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const { de } = await searchParams;
  return <FormularioLogin de={de ?? ""} />;
}

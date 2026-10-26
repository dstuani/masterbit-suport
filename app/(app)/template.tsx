import { headers } from "next/headers";

import { desviarSeForaDoPapel } from "@/lib/auth";

/**
 * O layout não roda de novo quando se navega entre páginas pelo menu; o template
 * roda. Por isso o desvio de papel restrito se repete aqui.
 */
export default async function AppTemplate({ children }: { children: React.ReactNode }) {
  await desviarSeForaDoPapel((await headers()).get("x-caminho"));
  return children;
}

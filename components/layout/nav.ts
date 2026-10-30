import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Search,
  Settings,
  BarChart3,
  Building2,
  Inbox,
  Monitor,
  type LucideIcon,
} from "lucide-react";

import type { Papel } from "@/lib/papeis";

export type ItemNav = {
  titulo: string;
  href: string;
  icone: LucideIcon;
};

export const NAVEGACAO: { secao: string; itens: ItemNav[] }[] = [
  {
    secao: "Operação",
    itens: [
      { titulo: "Dashboard", href: "/dashboard", icone: LayoutDashboard },
      { titulo: "Solicitações", href: "/solicitacoes", icone: Inbox },
      { titulo: "Atendimentos", href: "/atendimentos", icone: ClipboardList },
      { titulo: "Pendências", href: "/pendencias", icone: ListChecks },
      { titulo: "Agenda", href: "/agenda", icone: CalendarDays },
    ],
  },
  {
    secao: "Base",
    itens: [
      { titulo: "Clientes", href: "/clientes", icone: Building2 },
      { titulo: "Equipamentos", href: "/equipamentos", icone: Monitor },
      { titulo: "Base de conhecimento", href: "/conhecimento", icone: BookOpen },
    ],
  },
  {
    secao: "Análise",
    itens: [
      { titulo: "Consultas", href: "/consultas", icone: Search },
      { titulo: "Relatórios", href: "/relatorios", icone: BarChart3 },
    ],
  },
  {
    secao: "Sistema",
    itens: [{ titulo: "Configurações", href: "/configuracoes", icone: Settings }],
  },
];

/** Menu de cada papel. Os restritos veem só o que podem abrir (veja rotaPermitida em lib/papeis.ts). */
export function navegacaoDoPapel(papel: Papel | null): { secao: string; itens: ItemNav[] }[] {
  const configuracoes = { secao: "Conta", itens: [{ titulo: "Configurações", href: "/configuracoes", icone: Settings }] };
  if (papel === "solicitante") {
    return [
      {
        secao: "Atendimento",
        itens: [{ titulo: "Meus atendimentos", href: "/meus-atendimentos", icone: ClipboardList }],
      },
      configuracoes,
    ];
  }
  if (papel === "agenda") {
    return [{ secao: "Operação", itens: [{ titulo: "Agenda", href: "/agenda", icone: CalendarDays }] }, configuracoes];
  }
  return NAVEGACAO;
}

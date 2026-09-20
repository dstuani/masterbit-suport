import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Search,
  Settings,
  BarChart3,
  Building2,
  type LucideIcon,
} from "lucide-react";

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
      { titulo: "Atendimentos", href: "/atendimentos", icone: ClipboardList },
      { titulo: "Pendências", href: "/pendencias", icone: ListChecks },
      { titulo: "Agenda", href: "/agenda", icone: CalendarDays },
    ],
  },
  {
    secao: "Base",
    itens: [{ titulo: "Clientes", href: "/clientes", icone: Building2 }],
  },
  {
    secao: "Análise",
    itens: [
      { titulo: "Consultas", href: "/consultas", icone: Search },
      { titulo: "Casos parecidos", href: "/casos-parecidos", icone: Lightbulb },
      { titulo: "Relatórios", href: "/relatorios", icone: BarChart3 },
    ],
  },
  {
    secao: "Sistema",
    itens: [{ titulo: "Configurações", href: "/configuracoes", icone: Settings }],
  },
];

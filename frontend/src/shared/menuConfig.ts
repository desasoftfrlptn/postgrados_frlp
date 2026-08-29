// Items del menú lateral según roles de usuario

import {
  LayoutDashboard,
  UserPlus,
  Users,
  BarChart3,
  MessageSquare,
  CalendarDays,
  FileText,
  Newspaper,
} from "lucide-react";
import type { MenuItem } from "@/shared/types/types";

export const menuItems: MenuItem[] = [
  {
    id: "panel",
    label: "Panel",
    href: "/panel",
    icon: LayoutDashboard,
  },
  {
    id: "inscriptos",
    label: "Inscriptos",
    href: "/inscriptos",
    icon: Users,
    roles: ["coordinador", "admin"],
  },
  {
    id: "inscripcion",
    label: "Inscripción",
    href: "/inscripcion",
    icon: UserPlus,
    roles: ["coordinador", "admin"],
  },
  {
    id: "estadisticas",
    label: "Estadísticas",
    href: "/estadisticas",
    icon: BarChart3,
    roles: ["coordinador", "cpr", "admin"],
  },
  {
    id: "consultas",
    label: "Consultas",
    href: "/consultas",
    icon: MessageSquare,
    roles: ["coordinador", "admin"],
  },
  {
    id: "proximas-clases",
    label: "Próximas Clases",
    href: "/proximas-clases",
    icon: CalendarDays,
    roles: ["coordinador", "admin"]
  },
  {
    id: "mesa-examen",
    label: "Mesa de Examen",
    href: "/mesa-examen",
    icon: FileText,
    roles: ["coordinador", "admin"],
  },
  {
    id: "noticias",
    label: "Noticias",
    href: "/noticias",
    icon: Newspaper,
  }
];

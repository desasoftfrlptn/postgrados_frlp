import {
  LayoutDashboard,
  UserPlus,
  Users,
  BarChart3,
  MessageSquare,
  CalendarDays,
  FileText,
  Newspaper,
  BookOpen,
  Bell,
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
    roles: ["coordinador", "cpr", "admin"],
  },
  {
    id: "inscripcion",
    label: "Inscribir aspirante",
    href: "/inscriptos/nuevo",
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
    id: "seminarios",
    label: "Seminarios",
    href: "/seminarios",
    icon: BookOpen,
    roles: ["coordinador", "admin"],
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
    roles: ["coordinador", "admin"],
  },
  {
    id: "mesa-examen",
    label: "Mesa de Examen",
    href: "/mesa-examen",
    icon: FileText,
    roles: ["coordinador", "admin"],
  },
  {
    id: "notificaciones",
    label: "Notificaciones",
    href: "/notificaciones",
    icon: Bell,
  },
  {
    id: "noticias",
    label: "Noticias",
    href: "/noticias",
    icon: Newspaper,
  },
];
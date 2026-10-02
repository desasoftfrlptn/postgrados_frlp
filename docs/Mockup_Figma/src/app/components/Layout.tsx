import { NavLink } from "react-router";
import { Bell, LogOut, GraduationCap } from "lucide-react";

export interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  group?: string;
}

interface LayoutProps {
  portalTitle: string;
  navItems: NavItem[];
  onLogout: () => void;
  children: React.ReactNode;
}

const NAV_BG = "#0d2035";
const HEADER_BG = "#1d6b59";
const ACTIVE_BG = "#1a4b78";

export function Layout({ portalTitle, navItems, onLogout, children }: LayoutProps) {
  const groups = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group ?? "_default";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const groupOrder = Array.from(
    navItems.reduce<Set<string>>((s, i) => { s.add(i.group ?? "_default"); return s; }, new Set())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Top header */}
      <header
        style={{
          backgroundColor: HEADER_BG,
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "white" }}>
          <GraduationCap size={18} />
          <span style={{ fontSize: "14px", fontWeight: 500 }}>Sistema de Gestión de Posgrado</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <Bell size={16} color="white" style={{ cursor: "pointer" }} />
          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside
          style={{
            backgroundColor: NAV_BG,
            width: "240px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "16px 16px 14px",
              color: "white",
              fontSize: "15px",
              fontWeight: 600,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {portalTitle}
          </div>

          <nav style={{ paddingTop: "8px" }}>
            {groupOrder.map((groupKey) => (
              <div key={groupKey}>
                {groupKey !== "_default" && (
                  <div
                    style={{
                      padding: "12px 16px 4px",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {groupKey}
                  </div>
                )}
                {(groups[groupKey] ?? []).map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "calc(100% - 16px)",
                      margin: "1px 8px",
                      padding: "9px 10px",
                      backgroundColor: isActive ? ACTIVE_BG : "transparent",
                      borderRadius: "6px",
                      color: "white",
                      textDecoration: "none",
                      fontSize: "13px",
                    })}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <main style={{ flex: 1, overflow: "auto", backgroundColor: "#f2f3f5" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

/* ---- Page header bar ---- */
interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div
      style={{
        backgroundColor: "#2d7a65",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <h2 style={{ color: "white", fontSize: "15px", fontWeight: 600, margin: 0 }}>{title}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}

import { Construction } from "lucide-react";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "60vh",
        color: "#9ca3af",
      }}
    >
      <Construction size={48} color="#d1d5db" style={{ marginBottom: "16px" }} />
      <div style={{ fontSize: "16px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
        {title}
      </div>
      <div style={{ fontSize: "13px" }}>
        Esta sección está en desarrollo y estará disponible próximamente.
      </div>
    </div>
  );
}

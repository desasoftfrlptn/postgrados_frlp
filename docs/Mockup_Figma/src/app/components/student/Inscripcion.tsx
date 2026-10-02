import { useState } from "react";
import { Upload, FileText, CheckCircle2, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";
import { PageHeader } from "../Layout";

/* ─── Step indicator ─── */
const STEPS = [
  { label: "Datos\nPersonales",        num: 1 },
  { label: "Contacto y\nResidencia",   num: 2 },
  { label: "Antecedentes\ny Motivaciones", num: 3 },
  { label: "Documentación\ny Archivos", num: 4 },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "32px" }}>
      {STEPS.map((step, i) => {
        const isActive = step.num === current;
        const isDone   = step.num < current;
        return (
          <div key={step.num} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%",
                backgroundColor: isActive ? "#0d2035" : isDone ? "#2d7a65" : "#e5e7eb",
                color: isActive || isDone ? "white" : "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 600, fontSize: "15px",
              }}>
                {isDone ? <CheckCircle2 size={18} /> : step.num}
              </div>
              <div style={{
                textAlign: "center", fontSize: "11px", marginTop: "6px",
                color: isActive ? "#0d2035" : "#9ca3af",
                fontWeight: isActive ? 600 : 400,
                whiteSpace: "pre-line", lineHeight: "1.4",
              }}>
                {step.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: "80px", height: "2px",
                backgroundColor: isDone ? "#2d7a65" : "#e5e7eb",
                margin: "0 4px", marginBottom: "24px",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Shared field styles ─── */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  border: "1px solid #d1d5db", borderRadius: "6px",
  fontSize: "14px", outline: "none",
  boxSizing: "border-box", backgroundColor: "white",
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: "vertical", minHeight: "90px", fontFamily: "inherit",
};

function Field({ label, children, col2 }: { label: string; children: React.ReactNode; col2?: boolean }) {
  return (
    <div style={col2 ? {} : { gridColumn: "1 / -1" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "#374151" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
      {children}
    </div>
  );
}

/* ─── Step 1 ─── */
function Step1() {
  return (
    <>
      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "24px", color: "#111" }}>
        Paso 1 de 4: Datos Personales
      </h3>
      <Grid>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Nombre(s)</label>
          <input type="text" placeholder="Juan" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Apellido(s)</label>
          <input type="text" placeholder="Pérez" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>DNI</label>
          <input type="text" placeholder="12.345.678" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Nacionalidad</label>
          <select style={selectStyle} defaultValue="AR">
            <option value="AR">Argentina</option>
            <option value="BR">Brasil</option>
            <option value="UY">Uruguay</option>
            <option value="PY">Paraguay</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Fecha de Nacimiento</label>
          <input type="date" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Género</label>
          <select style={selectStyle}>
            <option>Masculino</option><option>Femenino</option>
            <option>No binario</option><option>Prefiero no indicar</option>
          </select>
        </div>
      </Grid>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input type="checkbox" id="disc" style={{ width: "16px", height: "16px", accentColor: "#0d2035" }} />
        <label htmlFor="disc" style={{ fontSize: "14px", color: "#374151", fontWeight: 400 }}>¿Posee discapacidad?</label>
      </div>
    </>
  );
}

/* ─── Step 2 ─── */
function Step2() {
  return (
    <>
      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "24px", color: "#111" }}>
        Paso 2 de 4: Contacto y Residencia
      </h3>
      <Grid>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Teléfono celular</label>
          <input type="tel" placeholder="+54 9 11 1234-5678" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Correo electrónico</label>
          <input type="email" placeholder="ejemplo@email.com" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Provincia</label>
          <select style={selectStyle}>
            <option>Buenos Aires</option><option>CABA</option><option>Córdoba</option><option>Santa Fe</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Localidad</label>
          <input type="text" placeholder="Nombre de la localidad" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Calle</label>
          <input type="text" placeholder="Nombre de la calle" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Número</label>
          <input type="text" placeholder="1234" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Piso / Depto (opcional)</label>
          <input type="text" placeholder="2° B" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Código Postal</label>
          <input type="text" placeholder="1234" style={inputStyle} />
        </div>
      </Grid>
    </>
  );
}

/* ─── Step 3 (with Motivaciones) ─── */
function Step3() {
  return (
    <>
      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "24px", color: "#111" }}>
        Paso 3 de 4: Antecedentes Académicos y Motivaciones
      </h3>

      {/* Academic background */}
      <div style={{ marginBottom: "20px", padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Antecedentes académicos
        </div>
        <Grid>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Título de grado obtenido</label>
            <input type="text" placeholder="Lic. en Sociología" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Institución</label>
            <input type="text" placeholder="Universidad Nacional..." style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Año de graduación</label>
            <input type="number" placeholder="2019" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Carrera a inscribirse</label>
            <select style={selectStyle}>
              <option>Maestría en Ciencias Sociales</option>
              <option>Doctorado en Educación</option>
              <option>Especialización en Gestión</option>
            </select>
          </div>
        </Grid>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "8px" }}>¿Posee otro título de posgrado?</label>
          <div style={{ display: "flex", gap: "16px" }}>
            {["Sí", "No"].map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer", fontWeight: 400 }}>
                <input type="radio" name="posgrado" defaultChecked={opt === "No"} style={{ accentColor: "#0d2035" }} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Motivaciones */}
      <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Motivaciones y perfil
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
            ¿Por qué desea realizar esta carrera? <span style={{ color: "#9ca3af", fontWeight: 400 }}>(máx. 500 caracteres)</span>
          </label>
          <textarea
            placeholder="Describa sus motivaciones, objetivos profesionales y por qué eligió esta carrera de posgrado..."
            maxLength={500}
            style={textareaStyle}
          />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
            ¿Actualmente trabaja en el área de la carrera?
          </label>
          <div style={{ display: "flex", gap: "16px" }}>
            {["Sí", "No"].map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer", fontWeight: 400 }}>
                <input type="radio" name="trabaja" defaultChecked={opt === "No"} style={{ accentColor: "#0d2035" }} />
                {opt}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
            ¿Cómo conoció la oferta académica?
          </label>
          <select style={{ ...selectStyle, maxWidth: "320px" }}>
            <option value="">Seleccione una opción...</option>
            <option>Sitio web de la Facultad</option>
            <option>Redes sociales</option>
            <option>Recomendación de un colega</option>
            <option>Correo institucional</option>
            <option>Folleto / material impreso</option>
            <option>Evento o charla informativa</option>
            <option>Otro</option>
          </select>
        </div>
      </div>
    </>
  );
}

/* ─── Dropzone component ─── */
function Dropzone({ label }: { label: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? "#2d7a65" : file ? "#22c55e" : "#d1d5db"}`,
        borderRadius: "8px",
        padding: "16px 20px",
        backgroundColor: isDragging ? "#f0fdf4" : file ? "#f0fdf4" : "#fafafa",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        transition: "border-color 0.15s, background-color 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <FileText size={18} color={file ? "#22c55e" : "#9ca3af"} style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{label}</div>
          {file ? (
            <div style={{ fontSize: "12px", color: "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle2 size={11} /> {file.name}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
              Arrastrar y soltar o seleccionar · PDF, JPG, PNG · máx. 5 MB
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        {file && (
          <button
            onClick={() => setFile(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center" }}
          >
            <X size={14} />
          </button>
        )}
        <label
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "6px 12px",
            backgroundColor: "white", border: "1px solid #d1d5db",
            borderRadius: "5px", fontSize: "12px", color: "#374151",
            cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap",
          }}
        >
          <Upload size={12} />
          {file ? "Cambiar" : "Seleccionar"}
          <input
            type="file" accept=".pdf,image/*" style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    </div>
  );
}

/* ─── Step 4 (Dropzones + Beca) ─── */
function Step4() {
  const [solicitaBeca, setSolicitaBeca] = useState(false);
  const [tipoBeca, setTipoBeca] = useState<"30" | "100" | "">("");

  const docs = [
    "DNI (frente y dorso)",
    "Título universitario (o constancia de título en trámite)",
    "Certificado analítico de materias aprobadas",
    "Partida de nacimiento",
    "Foto carnet (fondo blanco, formato JPG/PNG)",
    "CV actualizado",
  ];

  return (
    <>
      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: "#111" }}>
        Paso 4 de 4: Documentación y Archivos
      </h3>
      <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>
        Arrastrá y soltá cada archivo en el área correspondiente o presioná "Seleccionar". Todos los documentos deben estar en formato PDF, JPG o PNG.
      </p>

      {/* Required docs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        {docs.map((doc) => <Dropzone key={doc} label={doc} />)}
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #e5e7eb", marginBottom: "20px" }} />

      {/* Beca section */}
      <div style={{ padding: "16px", backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0369a1", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Solicitud de Beca (opcional)
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <input
            type="checkbox"
            id="beca"
            checked={solicitaBeca}
            onChange={(e) => { setSolicitaBeca(e.target.checked); if (!e.target.checked) setTipoBeca(""); }}
            style={{ width: "16px", height: "16px", accentColor: "#0d2035" }}
          />
          <label htmlFor="beca" style={{ fontSize: "14px", color: "#374151", fontWeight: 400 }}>
            Deseo solicitar una beca para esta carrera
          </label>
        </div>

        {solicitaBeca && (
          <div style={{ paddingLeft: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
              Tipo de beca solicitada:
            </div>
            <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
              {[
                { value: "30", label: "Beca parcial (30%)", desc: "Descuento del 30% sobre el arancel" },
                { value: "100", label: "Beca completa (100%)", desc: "Exención total del arancel" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    padding: "12px 16px",
                    border: `1px solid ${tipoBeca === opt.value ? "#0d2035" : "#d1d5db"}`,
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: tipoBeca === opt.value ? "#f0f4ff" : "white",
                    flex: 1,
                  }}
                >
                  <input
                    type="radio" name="tipoBeca" value={opt.value}
                    checked={tipoBeca === opt.value}
                    onChange={() => setTipoBeca(opt.value as "30" | "100")}
                    style={{ marginTop: "2px", accentColor: "#0d2035" }}
                  />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#111" }}>{opt.label}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {tipoBeca && (
              <>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                  Formulario de solicitud de beca (PDF con firma analógica):
                </div>
                <Dropzone label="Formulario de beca firmado" />
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Confirmation modal ─── */
function CancelModal({ onConfirm, onDismiss }: { onConfirm: () => void; onDismiss: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          backgroundColor: "white", borderRadius: "10px",
          padding: "28px 32px", maxWidth: "400px", width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <AlertTriangle size={22} color="#d97706" />
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111", margin: 0 }}>
            ¿Cancelar inscripción?
          </h3>
        </div>
        <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: "1.6", marginBottom: "24px" }}>
          Si cancelás ahora perderás todos los datos ingresados hasta el momento. Esta acción no se puede deshacer.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onDismiss}
            style={{ padding: "9px 18px", backgroundColor: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}
          >
            Seguir completando
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "9px 18px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}
          >
            Sí, cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
interface InscripcionProps {
  showHeader?: boolean;
}

export function Inscripcion({ showHeader = true }: InscripcionProps) {
  const [step, setStep] = useState(1);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const navigate = useNavigate();

  const handleConfirmCancel = () => {
    navigate("/", { replace: true });
  };

  return (
    <>
      {showHeader && <PageHeader title="3. PANTALLA DE INSCRIPCIÓN (ASPIRANTES)" />}

      {showCancelModal && (
        <CancelModal
          onConfirm={handleConfirmCancel}
          onDismiss={() => setShowCancelModal(false)}
        />
      )}

      <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <StepIndicator current={step} />
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "28px" }}>
            {step === 1 && <Step1 />}
            {step === 2 && <Step2 />}
            {step === 3 && <Step3 />}
            {step === 4 && <Step4 />}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "24px", borderTop: "1px solid #f3f4f6", marginTop: "24px" }}>
            {/* Cancel on the left */}
            <button
              onClick={() => setShowCancelModal(true)}
              style={{ padding: "10px 20px", backgroundColor: "white", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}
            >
              Cancelar inscripción
            </button>

            {/* Navigation on the right */}
            <div style={{ display: "flex", gap: "10px" }}>
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  style={{ padding: "10px 20px", backgroundColor: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}
                >
                  ‹ Anterior
                </button>
              )}
              {step < 4 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  style={{ padding: "10px 22px", backgroundColor: "#0d2035", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}
                >
                  Siguiente ›
                </button>
              ) : (
                <button style={{ padding: "10px 22px", backgroundColor: "#2d7a65", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>
                  Enviar Inscripción ✓
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

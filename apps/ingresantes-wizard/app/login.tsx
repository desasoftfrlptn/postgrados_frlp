import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [rol, setRol] = useState("Aspirante / Estudiante");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const roles = [
    "Aspirante / Estudiante",
    "Docente",
    "Conducción / CPR / Administrador"
  ];

  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 860;

  const handleLogin = () => {
    if (!email || !password) {
      alert("Por favor, completá todos los campos.");
      return;
    }
    console.log("Iniciando sesión con:", email, password, "| Rol seleccionado:", rol);
  };

  return (
    <View style={[styles.container, isCompact ? styles.containerCompact : styles.containerWide]}>
      
      {/* PANEL IZQUIERDO */}
      <View style={[styles.leftPanel, isCompact && styles.leftPanelCompact]}>
        
        {/* ELEMENTOS DECORATIVOS: Rombos (Solo en escritorio) */}
        {!isCompact && (
          <>
            <View style={[styles.rhombus, styles.rhombusTop]} />
            <View style={[styles.rhombus, styles.rhombusBottom]} />
          </>
        )}

        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>🎓</Text>
        </View>
        <Text style={styles.leftTitle}>Sistema de Gestión de Posgrado</Text>
        <Text style={styles.leftSubtitle}>
          Gestión integral de inscripciones, seguimiento académico y estadísticas de posgrado.
        </Text>
      </View>

      {/* PANEL DERECHO */}
      <View style={styles.rightPanel}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Iniciar sesión</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="usuario@facultad.edu.ar"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.forgotPasswordContainer}>
              <Pressable>
                <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
            </View>

            <Pressable style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>Ingresar</Text>
            </Pressable>

            {/* SELECTOR DE ROL */}
            <View style={[styles.field, { marginTop: 10, zIndex: 10 }]}>
              <Text style={styles.label}>Selecciona tu rol</Text>
              
              <Pressable 
                style={styles.selectSimulation} 
                onPress={() => setDropdownVisible(!dropdownVisible)}
              >
                <Text style={{ fontSize: 16, color: "#4b5563" }}>{rol}</Text>
                <Text style={{ fontSize: 16, color: "#4b5563" }}>
                  {dropdownVisible ? "▲" : "▼"}
                </Text>
              </Pressable>

              {/* Menú desplegable */}
              {dropdownVisible && (
                <View style={styles.dropdownMenu}>
                  {roles.map((opcion, index) => (
                    <Pressable
                      key={index}
                      style={[
                        styles.dropdownItem,
                        rol === opcion && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setRol(opcion);
                        setDropdownVisible(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        rol === opcion && styles.dropdownItemTextSelected
                      ]}>
                        {opcion}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tenés cuenta? </Text>
            <Link href="/wizard/step-1" asChild>
              <Pressable>
                <Text style={styles.linkText}>Comenzar inscripción</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  containerWide: { flexDirection: "row" },
  containerCompact: { flexDirection: "column" },
  
  // PANEL IZQ
  leftPanel: { 
    flex: 1, 
    backgroundColor: "#0d2035", 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 40,
    overflow: "hidden", 
  },
  leftPanelCompact: { flex: 0, paddingVertical: 40, minHeight: 250 },
  iconContainer: { width: 64, height: 64, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 24, zIndex: 2 },
  iconText: { fontSize: 32 },
  leftTitle: { fontSize: 28, fontWeight: "bold", color: "#ffffff", textAlign: "center", marginBottom: 16, zIndex: 2 },
  leftSubtitle: { fontSize: 16, color: "#a0aec0", textAlign: "center", lineHeight: 24, maxWidth: 400, zIndex: 2 },
  
  // ROMBOS DECORATIVOS 
  rhombus: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.08)", 
    transform: [{ rotate: "45deg" }],
    zIndex: 1, 
  },
  rhombusTop: {
    width: 150,
    height: 150,
    top: 60,
    right: 90,
  },
  rhombusBottom: {
    width: 75,
    height: 75,
    bottom: 30,
    left: 30,
  },

  // PANEL DER
  rightPanel: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, zIndex: 1 },
  formContainer: { width: "100%", maxWidth: 400, zIndex: 2 },
  formTitle: { fontSize: 24, fontWeight: "bold", color: "#111827", marginBottom: 24 },
  form: { gap: 16, zIndex: 3 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151" },
  input: { 
    borderWidth: 1, 
    borderColor: "#e5e7eb", 
    borderRadius: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    fontSize: 16, 
    backgroundColor: "#fafafa", 
    color: "#111827" 
  },
  forgotPasswordContainer: { alignItems: "flex-end" },
  forgotPasswordText: { color: "#0d2035", fontSize: 14, fontWeight: "500" },
  primaryButton: { backgroundColor: "#0d2035", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  
  // SELECTOR DROPDOWN
  selectSimulation: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fafafa" },
  dropdownMenu: { 
    position: "absolute", 
    top: 75, 
    left: 0, 
    right: 0, 
    backgroundColor: "#fff", 
    borderWidth: 1, 
    borderColor: "#e5e7eb", 
    borderRadius: 8, 
    elevation: 5, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10,
    zIndex: 1000 
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  dropdownItemSelected: { backgroundColor: "#e0f2fe" }, 
  dropdownItemText: { fontSize: 16, color: "#374151" },
  dropdownItemTextSelected: { color: "#0369a1", fontWeight: "600" },
  
  // FOOTER
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32, zIndex: 1 },
  footerText: { color: "#6b7280", fontSize: 14 },
  linkText: { color: "#0d2035", fontSize: 14, fontWeight: "bold" },
});
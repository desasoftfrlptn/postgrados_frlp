import { useState } from "react";
import { Link } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { WizardShell, wizardStyles } from "../../src/components/wizard/WizardShell";
import { scheduleTestNotification } from "../../src/lib/notifications";

export default function Step4Screen() {
  const [scheduled, setScheduled] = useState(false);
  const [solicitaBeca, setSolicitaBeca] = useState(false);

  const docs = [
    "DNI (frente y dorso)",
    "Título universitario (o constancia en trámite)",
    "Certificado analítico",
    "Partida de nacimiento",
    "Foto carnet (fondo blanco)",
    "CV actualizado",
  ];

  return (
    <WizardShell
      currentStep={4}
      title="Documentación y Archivos"
      subtitle="Subí los documentos requeridos para completar tu inscripción."
      footer={
        <>
          <Link href="/wizard/step-3" asChild>
            <Pressable style={wizardStyles.secondaryButton}>
              <Text style={wizardStyles.secondaryButtonText}>‹ Anterior</Text>
            </Pressable>
          </Link>
          <Link href="/" asChild>
            <Pressable style={wizardStyles.successButton}>
              <Text style={wizardStyles.primaryButtonText}>Enviar Inscripción ✓</Text>
            </Pressable>
          </Link>
        </>
      }
    >
      <View style={{ marginBottom: 20 }}>
        {docs.map((doc, idx) => (
          <View key={idx} style={wizardStyles.dropzone}>
            <View>
              <Text style={wizardStyles.dropzoneText}>{doc}</Text>
              <Text style={wizardStyles.dropzoneSubtext}>PDF, JPG, PNG · máx. 5 MB</Text>
            </View>
            <Pressable style={wizardStyles.dropzoneAction}>
              <Text style={wizardStyles.dropzoneActionText}>Seleccionar</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={[wizardStyles.section, { backgroundColor: "#f0f9ff", borderColor: "#bae6fd", borderWidth: 1 }]}>
        <Text style={[wizardStyles.sectionTitle, { color: "#0369a1" }]}>Solicitud de Beca (opcional)</Text>
        
        <Pressable 
          style={wizardStyles.radioItem} 
          onPress={() => setSolicitaBeca(!solicitaBeca)}
        >
          <View style={[wizardStyles.checkbox, solicitaBeca && { backgroundColor: "#0d2035", borderColor: "#0d2035" }]}>
            {solicitaBeca && <Text style={{ color: "white", fontSize: 10, textAlign: "center" }}>✓</Text>}
          </View>
          <Text style={wizardStyles.checkboxLabel}>Deseo solicitar una beca para esta carrera</Text>
        </Pressable>

        {solicitaBeca && (
          <View style={{ marginTop: 16, paddingLeft: 24 }}>
            <Text style={wizardStyles.label}>Tipo de beca solicitada:</Text>
            <View style={{ gap: 10, marginBottom: 16 }}>
              <View style={[wizardStyles.section, { backgroundColor: "white", borderWidth: 1, borderColor: "#d1d5db", padding: 12 }]}>
                <View style={wizardStyles.radioItem}>
                  <View style={wizardStyles.radioCircle} />
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "600" }}>Beca parcial (30%)</Text>
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>Descuento sobre el arancel</Text>
                  </View>
                </View>
              </View>
              <View style={[wizardStyles.section, { backgroundColor: "white", borderWidth: 1, borderColor: "#d1d5db", padding: 12 }]}>
                <View style={wizardStyles.radioItem}>
                  <View style={wizardStyles.radioCircle} />
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "600" }}>Beca completa (100%)</Text>
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>Exención total del arancel</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={wizardStyles.label}>Formulario de solicitud de beca:</Text>
            <View style={wizardStyles.dropzone}>
              <Text style={wizardStyles.dropzoneText}>Formulario firmado</Text>
              <Pressable style={wizardStyles.dropzoneAction}>
                <Text style={wizardStyles.dropzoneActionText}>Seleccionar</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={[wizardStyles.section, { marginTop: 20 }]}>
        <Text style={wizardStyles.sectionTitle}>Prueba de Notificaciones</Text>
        <Text style={wizardStyles.stepSubtitle}>
          Podés probar el sistema de notificaciones local antes de finalizar.
        </Text>
        <Pressable
          style={wizardStyles.secondaryButton}
          onPress={async () => {
            await scheduleTestNotification();
            setScheduled(true);
            Alert.alert("Notificación", "Se programó una notificación de prueba.");
          }}
        >
          <Text style={wizardStyles.secondaryButtonText}>Probar notificación</Text>
        </Pressable>
        {scheduled && (
          <Text style={{ color: "#2d7a65", fontWeight: "600", marginTop: 8, fontSize: 12 }}>
            ✓ Notificación programada correctamente
          </Text>
        )}
      </View>
    </WizardShell>
  );
}

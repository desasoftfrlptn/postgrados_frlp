import { Link } from "expo-router";
import { Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import { WizardShell, wizardStyles } from "../../src/components/wizard/WizardShell";

export default function Step3Screen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 860;
  const halfOrFull = isCompact ? wizardStyles.fullField : wizardStyles.halfField;

  return (
    <WizardShell
      currentStep={3}
      title="Antecedentes y Motivaciones"
      subtitle="Información académica y razones para tu postulación."
      footer={
        <>
          <Link href="/wizard/step-2" asChild>
            <Pressable style={wizardStyles.secondaryButton}>
              <Text style={wizardStyles.secondaryButtonText}>‹ Anterior</Text>
            </Pressable>
          </Link>
          <Link href="/wizard/step-4" asChild>
            <Pressable style={wizardStyles.primaryButton}>
              <Text style={wizardStyles.primaryButtonText}>Siguiente ›</Text>
            </Pressable>
          </Link>
        </>
      }
    >
      <View style={wizardStyles.section}>
        <Text style={wizardStyles.sectionTitle}>Antecedentes académicos</Text>
        <View style={wizardStyles.twoColumns}>
          <View style={halfOrFull}>
            <Text style={wizardStyles.label}>Título de grado obtenido</Text>
            <TextInput placeholder="Lic. en Sociología" style={wizardStyles.input} />
          </View>
          <View style={halfOrFull}>
            <Text style={wizardStyles.label}>Institución</Text>
            <TextInput placeholder="Universidad Nacional..." style={wizardStyles.input} />
          </View>
          <View style={halfOrFull}>
            <Text style={wizardStyles.label}>Año de graduación</Text>
            <TextInput placeholder="2019" keyboardType="numeric" style={wizardStyles.input} />
          </View>
          <View style={halfOrFull}>
            <Text style={wizardStyles.label}>Carrera a inscribirse</Text>
            <TextInput placeholder="Seleccionar maestría/doctorado" style={wizardStyles.input} />
          </View>
        </View>
        
        <Text style={wizardStyles.label}>¿Posee otro título de posgrado?</Text>
        <View style={wizardStyles.radioRow}>
          <View style={wizardStyles.radioItem}>
            <View style={wizardStyles.radioCircle} />
            <Text style={wizardStyles.checkboxLabel}>Sí</Text>
          </View>
          <View style={wizardStyles.radioItem}>
            <View style={[wizardStyles.radioCircle, wizardStyles.radioCircleSelected]}>
              <View style={wizardStyles.radioInner} />
            </View>
            <Text style={wizardStyles.checkboxLabel}>No</Text>
          </View>
        </View>
      </View>

      <View style={wizardStyles.section}>
        <Text style={wizardStyles.sectionTitle}>Motivaciones y perfil</Text>
        <View style={wizardStyles.fullField}>
          <Text style={wizardStyles.label}>¿Por qué desea realizar esta carrera? (máx. 500 caracteres)</Text>
          <TextInput 
            placeholder="Describa sus motivaciones..." 
            multiline 
            numberOfLines={4} 
            maxLength={500} 
            style={[wizardStyles.input, wizardStyles.textArea]} 
          />
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={wizardStyles.label}>¿Actualmente trabaja en el área de la carrera?</Text>
          <View style={wizardStyles.radioRow}>
            <View style={wizardStyles.radioItem}>
              <View style={wizardStyles.radioCircle} />
              <Text style={wizardStyles.checkboxLabel}>Sí</Text>
            </View>
            <View style={wizardStyles.radioItem}>
              <View style={[wizardStyles.radioCircle, wizardStyles.radioCircleSelected]}>
                <View style={wizardStyles.radioInner} />
              </View>
              <Text style={wizardStyles.checkboxLabel}>No</Text>
            </View>
          </View>
        </View>

        <View style={[wizardStyles.fullField, { marginTop: 20 }]}>
          <Text style={wizardStyles.label}>¿Cómo conoció la oferta académica?</Text>
          <TextInput placeholder="Seleccione una opción..." style={wizardStyles.input} />
        </View>
      </View>
    </WizardShell>
  );
}
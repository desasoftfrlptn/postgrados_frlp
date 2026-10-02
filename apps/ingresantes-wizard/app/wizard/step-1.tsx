import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { WizardShell, wizardStyles } from "../../src/components/wizard/WizardShell";

export default function Step1Screen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 860;
  const halfOrFull = isCompact ? wizardStyles.fullField : wizardStyles.halfField;

  return (
    <WizardShell
      currentStep={1}
      title="Datos Personales"
      subtitle="Completá la información básica del aspirante."
      footer={
        <Link href="/wizard/step-2" asChild>
          <Pressable style={wizardStyles.primaryButton}>
            <Text style={wizardStyles.primaryButtonText}>Siguiente ›</Text>
          </Pressable>
        </Link>
      }
    >
      <View style={wizardStyles.twoColumns}>
        <View style={halfOrFull}>
          <Text style={wizardStyles.label}>Nombre(s)</Text>
          <TextInput placeholder="Juan" style={wizardStyles.input} />
        </View>
        <View style={halfOrFull}>
          <Text style={wizardStyles.label}>Apellido(s)</Text>
          <TextInput placeholder="Pérez" style={wizardStyles.input} />
        </View>
        <View style={halfOrFull}>
          <Text style={wizardStyles.label}>DNI</Text>
          <TextInput placeholder="12.345.678" keyboardType="numeric" style={wizardStyles.input} />
        </View>
        <View style={halfOrFull}>
          <Text style={wizardStyles.label}>Nacionalidad</Text>
          <TextInput placeholder="Argentina" style={wizardStyles.input} />
        </View>
        <View style={halfOrFull}>
          <Text style={wizardStyles.label}>Fecha de Nacimiento</Text>
          <TextInput placeholder="DD/MM/AAAA" style={wizardStyles.input} />
        </View>
        <View style={halfOrFull}>
          <Text style={wizardStyles.label}>Género</Text>
          <TextInput placeholder="Seleccionar" style={wizardStyles.input} />
        </View>
      </View>
      <View style={wizardStyles.radioItem}>
        <View style={wizardStyles.checkbox} />
        <Text style={wizardStyles.checkboxLabel}>¿Posee discapacidad?</Text>
      </View>
    </WizardShell>
  );
}

const styles = StyleSheet.create({});

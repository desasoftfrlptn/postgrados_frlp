import type { ReactNode } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Link } from "expo-router";

const STEPS = [
  { label: "Datos\nPersonales", num: 1 },
  { label: "Contacto y\nResidencia", num: 2 },
  { label: "Antecedentes\ny Motivaciones", num: 3 },
  { label: "Documentación\ny Archivos", num: 4 },
];

export function WizardShell({
  currentStep,
  title,
  subtitle,
  children,
  footer,
}: {
  currentStep: 1 | 2 | 3 | 4;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const isCompact = width < 720;

  return (
    <View style={styles.page}>
      <View style={styles.headerTop}>
        <View style={styles.brand}>
          <Text style={styles.brandIcon}>🎓</Text>
          <Text style={styles.headerTopTitle}>Sistema de Gestión de Posgrado</Text>
        </View>

        <Link href="/" asChild>
          <Pressable style={styles.homeLink}>
            <Text style={styles.headerTopAction}>‹ Volver al inicio</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.headerSub}>
        <Text style={styles.headerSubTitle}>INSCRIPCIÓN DE ASPIRANTES</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          isCompact && styles.contentCompact,
        ]}
      >
        <View style={[styles.card, isCompact && styles.cardCompact]}>
          <StepIndicator current={currentStep} compact={isCompact} />

          <View style={styles.formContent}>
            <Text style={styles.stepTitle}>
              Paso {currentStep} de 4: {title}
            </Text>

            {subtitle ? (
              <Text style={styles.stepSubtitle}>{subtitle}</Text>
            ) : null}

            {children}
          </View>

          <View
            style={[
              styles.actionsRow,
              isCompact && styles.actionsRowCompact,
            ]}
          >
            <Link href="/" asChild>
              <Pressable style={wizardStyles.cancelButton}>
                <Text style={wizardStyles.cancelButtonText}>
                  Cancelar inscripción
                </Text>
              </Pressable>
            </Link>

            <View
              style={[
                styles.navigationActions,
                isCompact && styles.navigationActionsCompact,
              ]}
            >
              {footer}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StepIndicator({
  current,
  compact,
}: {
  current: number;
  compact: boolean;
}) {
  return (
    <View style={[styles.stepper, compact && styles.stepperCompact]}>
      {STEPS.map((step, index) => {
        const isActive = step.num === current;
        const isDone = step.num < current;

        return (
          <View key={step.num} style={styles.stepItem}>
            <View style={styles.stepCircleWrap}>
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isDone && styles.stepCircleDone,
                ]}
              >
                <Text
                  style={[
                    styles.stepCircleText,
                    (isActive || isDone) && styles.stepCircleTextOn,
                  ]}
                >
                  {isDone ? "✓" : step.num}
                </Text>
              </View>

              {!compact ? (
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
              ) : null}
            </View>

            {index < STEPS.length - 1 ? (
              <View
                style={[
                  styles.stepLine,
                  isDone && styles.stepLineDone,
                  compact && styles.stepLineCompact,
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export const wizardStyles = StyleSheet.create({
  twoColumns: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 20,
    rowGap: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  fullField: {
    width: "100%",
  },
  halfField: {
    flexGrow: 1,
    flexBasis: "47%",
  },
  label: {
    marginBottom: 6,
    color: "#374151",
    fontSize: 13,
    fontWeight: "500",
  },
  input: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    color: "#111827",
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  section: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  sectionTitle: {
    marginBottom: 14,
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  radioRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#0d2035",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0d2035",
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#fafafa",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  dropzoneActive: {
    borderColor: "#2d7a65",
    backgroundColor: "#f0fdf4",
  },
  dropzoneText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  dropzoneSubtext: {
    fontSize: 12,
    color: "#9ca3af",
  },
  dropzoneAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 5,
  },
  dropzoneActionText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  primaryButton: {
    minWidth: 130,
    minHeight: 40,
    paddingHorizontal: 22,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d2035",
    borderRadius: 6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  successButton: {
    minWidth: 180,
    minHeight: 40,
    paddingHorizontal: 22,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2d7a65",
    borderRadius: 6,
  },
  secondaryButton: {
    minWidth: 120,
    minHeight: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },
  cancelButton: {
    minHeight: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 6,
  },
  cancelButtonText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "500",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#9ca3af",
    backgroundColor: "#ffffff",
  },
  checkboxLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "400",
  },
});

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f2f3f5",
  },
  headerTop: {
    minHeight: 48,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1d6b59",
  },
  brand: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    fontSize: 18,
  },
  headerTopTitle: {
    flexShrink: 1,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  homeLink: {
    paddingVertical: 8,
    paddingLeft: 12,
  },
  headerTopAction: {
    color: "#ffffff",
    fontSize: 13,
  },
  headerSub: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#2d7a65",
  },
  headerSubTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  contentCompact: {
    padding: 12,
  },
  card: {
    width: "100%",
    maxWidth: 900,
    padding: 32,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
      },
      default: {
        elevation: 2,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
    }),
  },
  cardCompact: {
    padding: 16,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: 32,
  },
  stepperCompact: {
    alignItems: "center",
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepCircleWrap: {
    minWidth: 76,
    alignItems: "center",
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
  },
  stepCircleActive: {
    backgroundColor: "#0d2035",
  },
  stepCircleDone: {
    backgroundColor: "#2d7a65",
  },
  stepCircleText: {
    color: "#9ca3af",
    fontSize: 15,
    fontWeight: "600",
  },
  stepCircleTextOn: {
    color: "#ffffff",
  },
  stepLabel: {
    marginTop: 6,
    color: "#9ca3af",
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },
  stepLabelActive: {
    color: "#0d2035",
    fontWeight: "600",
  },
  stepLine: {
    width: 80,
    marginHorizontal: 4,
    marginTop: 19,
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
  },
  stepLineDone: {
    borderTopColor: "#2d7a65",
  },
  stepLineCompact: {
    width: 22,
  },
  formContent: {
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  stepTitle: {
    marginBottom: 8,
    color: "#111111",
    fontSize: 16,
    fontWeight: "600",
  },
  stepSubtitle: {
    marginBottom: 20,
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 19,
  },
  actionsRow: {
    marginTop: 24,
    paddingTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 12,
  },
  actionsRowCompact: {
    alignItems: "stretch",
    flexDirection: "column-reverse",
  },
  navigationActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  navigationActionsCompact: {
    flexDirection: "column-reverse",
  },
});

import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { scheduleTestNotification } from "../src/lib/notifications";

export default function HealthScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Funciona!</Text>
      <Text style={styles.subtitle}>(en teoría...)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb", // Un fondo gris muy sutil
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0d2035", // Azul institucional
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#6b7280",
    fontStyle: "italic",
  },
});
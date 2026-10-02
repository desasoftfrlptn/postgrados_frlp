import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface UnderConstructionProps {
  seccion?: string;
}

export default function UnderConstruction({ seccion = "esta sección" }: UnderConstructionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🚧</Text>
        <Text style={styles.title}>Próximamente</Text>
        <Text style={styles.subtitle}>
          Estamos trabajando para habilitar <Text style={styles.highlight}>{seccion}</Text>. 
          ¡Pronto estará disponible!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    width: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxWidth: 500,
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d2035', // Azul institucional
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#111827',
  }
});
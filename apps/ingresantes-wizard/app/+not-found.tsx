import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página no encontrada', headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.icon}>🕵️‍♂️</Text>
        <Text style={styles.title}>¡Epa! Error 404</Text>
        <Text style={styles.subtitle}>
          Parece que te fuiste del mapa. La página que buscás no existe o fue movida.
        </Text>
        
        <Link href="/" style={styles.button}>
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  icon: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    maxWidth: 400,
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#0d2035', // El azul institucional
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
import { Stack } from "expo-router";

export default function WizardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#f6f7fb" },
      }}
    />
  );
}

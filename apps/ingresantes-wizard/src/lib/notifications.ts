import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleTestNotification() {
  const { status } = await Notifications.getPermissionsAsync();
  const finalStatus = status === "granted" ? status : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== "granted") {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Wizard de Ingresantes",
      body: "Expo Notifications está listo para usar.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    },
  });
}

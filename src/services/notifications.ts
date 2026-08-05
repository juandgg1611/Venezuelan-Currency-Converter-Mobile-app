// src/services/notifications.ts
// Servicio de notificaciones push locales para FinanzasIA
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { BcvRates } from "./api";

// ─── CONFIGURACIÓN DEL HANDLER ──────────────────────────────────
// Controla cómo se muestra la notificación cuando la app está abierta en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = "finanzas-ia-daily";
const AM_ID = "daily-rates-8am";
const PM_ID = "daily-rates-2pm";

// ─── CONFIGURAR CANAL DE ANDROID ────────────────────────────────
async function ensureChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Tasas diarias",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150, 100, 150],
      lightColor: "#24db86",
      description: "Notificaciones diarias con las tasas BCV y USDT",
    });
  }
}

// ─── SOLICITAR PERMISOS ─────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function scheduleDailyRateNotifications(): Promise<void> {
  await cancelDailyNotifications();
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;
  await ensureChannel();

  await Notifications.scheduleNotificationAsync({
    identifier: AM_ID,
    content: {
      title: "Actualización de Tasas BCV",
      body: "Las tasas oficiales del BCV han sido actualizadas.",
      ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });

  await Notifications.scheduleNotificationAsync({
    identifier: PM_ID,
    content: {
      title: "Actualización de Tasas BCV",
      body: "Las tasas oficiales del BCV han sido actualizadas.",
      ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 14,
      minute: 0,
    },
  });
}

export async function sendTestNotification(rates: BcvRates): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  await ensureChannel();

  const usdStr = rates.USD > 0 ? `Bs. ${rates.USD.toFixed(2)}` : "—";
  const eurStr = rates.EUR > 0 ? `Bs. ${rates.EUR.toFixed(2)}` : "—";
  const usdtStr = rates.USDT > 0 ? `Bs. ${rates.USDT.toFixed(2)}` : "—";

  await Notifications.scheduleNotificationAsync({
    identifier: "test-notification",
    content: {
      title: "🔔 Prueba de notificación — FinanzasIA",
      body: `💵 USD: ${usdStr}  |  💶 EUR: ${eurStr}  |  ₮ USDT: ${usdtStr}`,
      data: { type: "test" },
      ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
    },
  });

  console.log("🧪 Notificación de prueba programada (en 5 segundos)");
}

// ─── CANCELAR NOTIFICACIONES ─────────────────────────────────────
export async function cancelDailyNotifications(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(AM_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(PM_ID).catch(() => {});
}

// ─── VERIFICAR SI ESTÁN ACTIVAS ──────────────────────────────────
export async function areDailyNotificationsScheduled(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some(
    (n) => n.identifier === AM_ID || n.identifier === PM_ID
  );
}

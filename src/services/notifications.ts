// src/services/notifications.ts
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { bcvApiService, BcvRates } from "./api";
import { notificationHistoryService } from "./notificationHistory";

const TASK_NAME = "bcv-daily-check";
const CHANNEL_ID = "finanzas-ia-daily";
const ALERTS_ENABLED_KEY = "@bcv_alerts_enabled";
const LAST_NOTIFIED_DATE_KEY = "@bcv_last_notified_date";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

async function checkAndNotifyBcv(): Promise<void> {
  try {
    const result = await bcvApiService.refreshRates();
    const rates = result.rates;
    if (!rates) return;

    const lastNotified = await AsyncStorage.getItem(LAST_NOTIFIED_DATE_KEY);
    const today = new Date().toISOString().split("T")[0];

    // Only notify once per day when rates update
    if (lastNotified === today) return;

    await ensureChannel();

    const usdStr = rates.USD > 0 ? rates.USD.toFixed(2) : "—";
    const eurStr = rates.EUR > 0 ? rates.EUR.toFixed(2) : "—";
    const usdtStr = rates.USDT > 0 ? rates.USDT.toFixed(2) : "—";

    const title = "Actualizacion de Tasas";
    const body = `Dolar: Bs. ${usdStr} | Euro: Bs. ${eurStr} | USDT: Bs. ${usdtStr}`;

    await Notifications.scheduleNotificationAsync({
      identifier: `bcv-daily-${Date.now()}`,
      content: {
        title,
        body,
        data: { type: "bcv-daily" },
        ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        repeats: false,
      },
    });

    await notificationHistoryService.addNotification({
      title,
      body,
      type: "bcv"
    });

    await AsyncStorage.setItem(LAST_NOTIFIED_DATE_KEY, today);
  } catch (error) {
    console.error("Error in bcv background task:", error);
  }
}

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const enabled = await AsyncStorage.getItem(ALERTS_ENABLED_KEY);
    if (enabled !== "true") {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    await checkAndNotifyBcv();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function scheduleDailyRateNotifications(): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  await AsyncStorage.setItem(ALERTS_ENABLED_KEY, "true");

  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 60 * 2, // 2 hours
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }

  // Initial check
  await checkAndNotifyBcv();
}

export async function cancelDailyNotifications(): Promise<void> {
  await AsyncStorage.setItem(ALERTS_ENABLED_KEY, "false");
  
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
  }
}

export async function areDailyNotificationsScheduled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(ALERTS_ENABLED_KEY);
    return enabled === "true";
  } catch {
    return false;
  }
}

export async function sendTestNotification(rates: BcvRates): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  await ensureChannel();

  const usdStr = rates.USD > 0 ? rates.USD.toFixed(2) : "—";
  const eurStr = rates.EUR > 0 ? rates.EUR.toFixed(2) : "—";
  const usdtStr = rates.USDT > 0 ? rates.USDT.toFixed(2) : "—";

  const title = "🔔 Prueba de notificación — FinanzasIA";
  const body = `💵 USD: Bs. ${usdStr} | 💶 EUR: Bs. ${eurStr} | ₮ USDT: Bs. ${usdtStr}`;

  await Notifications.scheduleNotificationAsync({
    identifier: "test-notification",
    content: {
      title,
      body,
      data: { type: "test" },
      ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
    },
  });

  await notificationHistoryService.addNotification({
    title,
    body,
    type: "system"
  });

  console.log("🧪 Notificación de prueba programada (en 5 segundos)");
}

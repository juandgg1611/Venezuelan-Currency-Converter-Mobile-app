// src/services/usdtAlertTask.ts
// Background task para monitorear movimientos de precio USDT y enviar alertas push
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { notificationHistoryService } from "./notificationHistory";

// ─── CONSTANTES ──────────────────────────────────────────────
const TASK_NAME = "usdt-price-monitor";
const CHANNEL_ID = "finanzas-ia-usdt";
const LAST_PRICE_KEY = "@usdt_last_alert_price";
const ALERTS_ENABLED_KEY = "@usdt_alerts_enabled";
const THRESHOLD_KEY = "@usdt_alert_threshold";
const DEFAULT_THRESHOLD = 0.5; // 0.5% de variación mínima para notificar

const BINANCE_P2P_URL =
  "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

// ─── CANAL DE NOTIFICACIÓN ──────────────────────────────────
async function ensureUsdtChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Alertas USDT",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#39c647",
      description: "Alertas de movimientos significativos del precio USDT/VES",
    });
  }
}

// ─── ALMACENAMIENTO DE PRECIO ───────────────────────────────
async function saveLastUsdtPrice(price: number): Promise<void> {
  await AsyncStorage.setItem(LAST_PRICE_KEY, JSON.stringify(price));
}

async function getLastUsdtPrice(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_PRICE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── OBTENER PRECIO ACTUAL DESDE BINANCE P2P ────────────────
function median(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function fetchCurrentUsdtPrice(): Promise<number> {
  const response = await fetch(BINANCE_P2P_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      fiat: "VES",
      page: 1,
      rows: 20,
      tradeType: "BUY",
      asset: "USDT",
      countries: [],
      proMerchantAds: false,
      shieldMerchantAds: false,
      filterType: "tradable",
      periods: [],
      additionalKycVerifyFilter: 0,
      publisherType: null,
      payTypes: [],
      classifies: ["mass", "profession", "fiat_trade"],
      tradedWith: false,
      followed: false,
    }),
  });

  if (!response.ok) throw new Error(`Binance HTTP ${response.status}`);
  const json = await response.json();
  if (json.code !== "000000") throw new Error(`Binance error: ${json.code}`);

  const data: any[] = json.data || [];
  if (data.length === 0) throw new Error("Sin anuncios");

  const prices: number[] = data
    .map((item: any) => parseFloat(item.adv?.price))
    .filter((p: number) => !isNaN(p) && p > 0);

  if (prices.length === 0) throw new Error("Precios inválidos");
  return median(prices);
}

// ─── OBTENER UMBRAL ─────────────────────────────────────────
export async function getAlertThreshold(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(THRESHOLD_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_THRESHOLD;
}

export async function setAlertThreshold(threshold: number): Promise<void> {
  await AsyncStorage.setItem(THRESHOLD_KEY, JSON.stringify(threshold));
}

// ─── VERIFICAR MOVIMIENTO Y NOTIFICAR ───────────────────────
export async function checkUsdtMovement(
  currentPrice?: number,
): Promise<void> {
  try {
    const price = currentPrice ?? (await fetchCurrentUsdtPrice());
    const lastPrice = await getLastUsdtPrice();
    const threshold = await getAlertThreshold();

    // Primera ejecución: solo guardar el precio
    if (lastPrice === null) {
      await saveLastUsdtPrice(price);
      return;
    }

    const changePct = ((price - lastPrice) / lastPrice) * 100;

    if (Math.abs(changePct) >= threshold) {
      await ensureUsdtChannel();

      const direction = changePct > 0 ? "subió" : "bajó";
      const emoji = changePct > 0 ? "📈" : "📉";
      const advice =
        changePct > 0
          ? "Buen momento para vender"
          : "Buen momento para comprar";
      const sign = changePct > 0 ? "+" : "";

      const title = `${emoji} USDT ${direction} ${sign}${changePct.toFixed(2)}%`;
      const body = `Bs. ${lastPrice.toFixed(2)} → Bs. ${price.toFixed(2)} | ${advice}`;

      await Notifications.scheduleNotificationAsync({
        identifier: `usdt-alert-${Date.now()}`,
        content: {
          title,
          body,
          data: { type: "usdt-alert", price, lastPrice, changePct },
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
        type: "usdt"
      });

      // Actualizar precio de referencia
      await saveLastUsdtPrice(price);
    }
  } catch (error) {
    console.error("Error checking USDT movement:", error);
  }
}

// ─── BACKGROUND TASK ────────────────────────────────────────
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const enabled = await AsyncStorage.getItem(ALERTS_ENABLED_KEY);
    if (enabled !== "true") {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    await checkUsdtMovement();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Background USDT task error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── CONTROL DE ALERTAS ─────────────────────────────────────
export async function scheduleUsdtAlerts(): Promise<void> {
  await AsyncStorage.setItem(ALERTS_ENABLED_KEY, "true");

  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutos mínimo
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }

  // Chequear inmediatamente al activar
  await checkUsdtMovement();
}

export async function cancelUsdtAlerts(): Promise<void> {
  await AsyncStorage.setItem(ALERTS_ENABLED_KEY, "false");

  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
  }
}

export async function areUsdtAlertsActive(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(ALERTS_ENABLED_KEY);
    return enabled === "true";
  } catch {
    return false;
  }
}

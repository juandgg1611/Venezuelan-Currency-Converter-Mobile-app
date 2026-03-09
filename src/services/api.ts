// src/services/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface BcvRates {
  USD: number;
  EUR: number;
  USDT: number;
  VES: number;
  lastUpdated: string;
  usdtSource?: string;
}

export type CurrencyCode = "USD" | "EUR" | "USDT" | "VES";

const BCV_API_KEY =
  "a37f147c890a759b23ab7e7f3c3ea9b4d2c07e8fcb7572416ebafb24f552018f";
const BCV_API_URL = "https://api.dolarvzla.com/public/exchange-rate";
const BINANCE_P2P_URL =
  "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

const CACHE_KEY = "@exchange_rates_v4";
const CACHE_DURATION = 5 * 60 * 1000;

const buildBinanceBody = () => ({
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
});

function median(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

class BcvApiService {
  // ==========================================
  // CACHÉ
  // ==========================================

  private async saveToCache(rates: BcvRates): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ rates, savedAt: Date.now() })
      );
    } catch (e) {
      console.log("❌ Cache save error:", e);
    }
  }

  private async getFromCache(): Promise<BcvRates | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.savedAt < CACHE_DURATION) {
        console.log("✅ Rates from cache");
        return data.rates;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ==========================================
  // BCV: USD y EUR
  // ==========================================

  private async fetchBcvRates(): Promise<{
    usd: number;
    eur: number;
    date: string;
  }> {
    const response = await fetch(BCV_API_URL, {
      method: "GET",
      headers: {
        "x-dolarvzla-key": BCV_API_KEY,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error(`BCV HTTP ${response.status}`);
    const data = await response.json();
    if (!data.current) throw new Error("BCV: formato inválido");
    return {
      usd: data.current.usd,
      eur: data.current.eur,
      date: data.current.date,
    };
  }

  // ==========================================
  // USDT via Binance P2P — fuente primaria
  // ==========================================

  private async fetchUsdtViaBinance(): Promise<number> {
    console.log("📡 Binance P2P...");

    const response = await fetch(BINANCE_P2P_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(buildBinanceBody()),
    });

    if (!response.ok) throw new Error(`Binance HTTP ${response.status}`);

    const json = await response.json();

    if (json.code !== "000000") {
      throw new Error(`Binance error code: ${json.code}`);
    }

    const data: any[] = json.data || [];
    if (data.length === 0) throw new Error("Binance: sin anuncios");

    const prices: number[] = data
      .map((item: any) => parseFloat(item.adv?.price))
      .filter((p: number) => !isNaN(p) && p > 0);

    if (prices.length === 0) throw new Error("Binance: precios inválidos");

    const med = median(prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    console.log(
      `✅ Binance P2P: ${prices.length} anuncios | mediana=${med.toFixed(2)} | promedio=${avg.toFixed(2)}`
    );

    return med;
  }

  // ==========================================
  // MÉTODO PRINCIPAL
  // ==========================================

  async fetchExchangeRates(): Promise<{ rates: BcvRates; error?: string }> {
    try {
      const cached = await this.getFromCache();
      if (cached) return { rates: cached };

      console.log("🔄 Obteniendo tasas frescas...");

      // BCV: USD + EUR
      let usd = 36.5;
      let eur = 39.2;
      let dateStr = new Date().toISOString();
      let bcvError = false;

      try {
        const bcv = await this.fetchBcvRates();
        usd = bcv.usd;
        eur = bcv.eur;
        dateStr = bcv.date;
        console.log(`✅ BCV: USD=${usd} EUR=${eur}`);
      } catch (e) {
        bcvError = true;
        console.log("⚠️ BCV falló, usando defaults");
      }

      // USDT: Binance P2P directo
      let usdt = 0;
      let usdtSource = "";

      try {
        usdt = await this.fetchUsdtViaBinance();
        usdtSource = "Binance P2P";
      } catch (e) {
        console.log("⚠️ Binance P2P falló:", e);
        // Sin fallback a CoinGecko — si falla Binance mostramos error claro
        usdt = 0;
        usdtSource = "sin datos";
      }

      const formattedDate = new Date(dateStr).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const rates: BcvRates = {
        USD: usd,
        EUR: eur,
        USDT: usdt > 0 ? Number(usdt.toFixed(2)) : 0,
        VES: 1.0,
        lastUpdated: formattedDate + (bcvError ? " ⚠️" : ""),
        usdtSource,
      };

      await this.saveToCache(rates);
      return {
        rates,
        error: bcvError
          ? "USD/EUR usando valores locales"
          : usdt === 0
          ? "No se pudo obtener precio de USDT"
          : undefined,
      };
    } catch (e) {
      console.error("❌ Error crítico:", e);
      const now = new Date().toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        rates: {
          USD: 36.5,
          EUR: 39.2,
          USDT: 0,
          VES: 1.0,
          lastUpdated: now + " (sin conexión)",
          usdtSource: "sin datos",
        },
        error: "Sin conexión.",
      };
    }
  }

  async refreshRates(): Promise<{ rates: BcvRates; error?: string }> {
    await AsyncStorage.removeItem(CACHE_KEY);
    return this.fetchExchangeRates();
  }

  // ==========================================
  // CONVERSIÓN
  // ==========================================

  convertAmount(
    amount: string,
    from: CurrencyCode,
    to: CurrencyCode,
    rates: BcvRates
  ): string {
    try {
      const num = parseFloat(amount);
      if (isNaN(num) || num < 0) return "0.00";
      if (from === to) return num.toFixed(2);
      if (from === "VES") return (num / rates[to]).toFixed(2);
      if (to === "VES") return (num * rates[from]).toFixed(2);
      const inVes = num * rates[from];
      return (inVes / rates[to]).toFixed(2);
    } catch (e) {
      return "0.00";
    }
  }

  getConversionRate(
    from: CurrencyCode,
    to: CurrencyCode,
    rates: BcvRates
  ): string {
    try {
      if (from === to) return "1.00";
      if (from === "VES") return (1 / rates[to]).toFixed(6);
      if (to === "VES") return rates[from].toFixed(2);
      return (rates[from] / rates[to]).toFixed(6);
    } catch (e) {
      return "0.00";
    }
  }
}

export const bcvApiService = new BcvApiService();
// src/services/usdtService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// Tipos para las bandas de USDT
export interface UsdtBand {
  band: string;
  buy: number; // Precio al que venden USDT (tú compras)
  sell: number; // Precio al que compran USDT (tú vendes)
}

export interface UsdtRates {
  mid: number; // Precio promedio
  bands: UsdtBand[]; // Bandas por rango
  timestamp: number;
  source: "binance-p2p" | "cache" | "fallback";
}

// Cache
const CACHE_KEY = "@usdt_rates";
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos (Binance actualiza rápido)

class UsdtService {
  private async saveToCache(rates: UsdtRates): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rates));
    } catch (error) {
      console.log("Error saving USDT cache:", error);
    }
  }

  private async getFromCache(): Promise<UsdtRates | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as UsdtRates;
        if (Date.now() - data.timestamp < CACHE_DURATION) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.log("Error reading USDT cache:", error);
      return null;
    }
  }

  // Obtener precios USDT/VES de Binance P2P
  async fetchUsdtRates(): Promise<UsdtRates> {
    try {
      // Intentar cache primero
      const cached = await this.getFromCache();
      if (cached) {
        console.log("Usando USDT en caché");
        return cached;
      }

      console.log("Obteniendo USDT de Binance P2P...");

      // Endpoint de Binance P2P
      const BINANCE_P2P =
        "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

      // Definir bandas de montos (como en tu código)
      const BANDS = [
        { label: "10–50", min: 10, max: 50 },
        { label: "50–100", min: 50, max: 100 },
        { label: "100–200", min: 100, max: 200 },
        { label: "200–500", min: 200, max: 500 },
      ];

      // Función para obtener anuncios
      const fetchAds = async (tradeType: "BUY" | "SELL") => {
        try {
          const response = await fetch(BINANCE_P2P, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({
              asset: "USDT",
              fiat: "VES",
              tradeType,
              page: 1,
              rows: 20,
              payTypes: [],
              publisherType: null,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const json = await response.json();
          return json.data || [];
        } catch (error) {
          console.error(`Error fetching ${tradeType} ads:`, error);
          return [];
        }
      };

      // Obtener anuncios de compra y venta
      const [buyAds, sellAds] = await Promise.all([
        fetchAds("BUY"), // Anuncios donde compran USDT (tú vendes)
        fetchAds("SELL"), // Anuncios donde venden USDT (tú compras)
      ]);

      // Función para calcular precio promedio
      const calculateAveragePrice = (
        ads: any[],
        minAmount: number,
        maxAmount: number,
        type: "buy" | "sell",
      ) => {
        const validAds = ads
          .filter((ad: any) => {
            const price = parseFloat(ad.adv.price);
            const min = parseFloat(ad.adv.minSingleTransAmount);
            const max = parseFloat(ad.adv.dynamicMaxSingleTransAmount);
            const available = parseFloat(ad.adv.tradableQuantity);

            // Para BUY: anuncios donde compran USDT
            // Para SELL: anuncios donde venden USDT
            return !isNaN(price) && price > 0 && available >= minAmount;
          })
          .slice(0, 5); // Tomar los primeros 5 mejores

        if (validAds.length === 0) return 0;

        const prices = validAds.map((ad: any) => parseFloat(ad.adv.price));
        return prices.reduce((a, b) => a + b, 0) / prices.length;
      };

      // Calcular bandas
      const bands: UsdtBand[] = [];

      for (const band of BANDS) {
        const buyPrice = calculateAveragePrice(
          buyAds,
          band.min,
          band.max,
          "buy",
        );
        const sellPrice = calculateAveragePrice(
          sellAds,
          band.min,
          band.max,
          "sell",
        );

        if (buyPrice > 0 || sellPrice > 0) {
          bands.push({
            band: band.label,
            buy: buyPrice > 0 ? Number(buyPrice.toFixed(2)) : 0,
            sell: sellPrice > 0 ? Number(sellPrice.toFixed(2)) : 0,
          });
        }
      }

      // Calcular precio medio (mid)
      const validBands = bands.filter((b) => b.buy > 0 && b.sell > 0);
      let mid = 0;

      if (validBands.length > 0) {
        mid =
          validBands.reduce((acc, b) => acc + (b.buy + b.sell) / 2, 0) /
          validBands.length;
      } else if (bands.length > 0) {
        // Si no hay bandas completas, usar la primera disponible
        mid = bands[0].buy || bands[0].sell || 0;
      }

      const rates: UsdtRates = {
        mid: Number(mid.toFixed(2)),
        bands,
        timestamp: Date.now(),
        source: "binance-p2p",
      };

      // Guardar en caché
      await this.saveToCache(rates);

      return rates;
    } catch (error) {
      console.error("Error fetching USDT rates:", error);

      // Intentar cache expirado
      const expiredCache = await AsyncStorage.getItem(CACHE_KEY);
      if (expiredCache) {
        const data = JSON.parse(expiredCache);
        return {
          ...data,
          source: "cache",
        };
      }

      // Fallback: valores aproximados basados en USD
      return {
        mid: 36.5, // Aproximadamente igual al USD
        bands: [
          { band: "10–50", buy: 36.45, sell: 36.55 },
          { band: "50–100", buy: 36.48, sell: 36.52 },
          { band: "100–200", buy: 36.49, sell: 36.51 },
          { band: "200–500", buy: 36.5, sell: 36.5 },
        ],
        timestamp: Date.now(),
        source: "fallback",
      };
    }
  }

  // Obtener precio promedio simple (para usar en conversiones)
  async getAverageUsdtRate(): Promise<number> {
    const rates = await this.fetchUsdtRates();
    return rates.mid;
  }

  // Forzar actualización
  async refreshUsdtRates(): Promise<UsdtRates> {
    await AsyncStorage.removeItem(CACHE_KEY);
    return this.fetchUsdtRates();
  }
}

export const usdtService = new UsdtService();

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BcvRates } from "./api";

// Cache keys
const BCV_CACHE_PREFIX = "@fi_bcv_cache_v4_";
const USDT_LOCAL_KEY = "@fi_usdt_local_v4";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface RateSnapshot {
  date: string;   // YYYY-MM-DD
  time?: string;  // HH:MM AM/PM
  usd: number;
  eur: number;
  usdt: number;
  usdtBuy: number;
  usdtSell: number;
  timestamp: number;
}

export interface UsdtRawEntry {
  date: string;      // YYYY-MM-DD
  time: string;      // HH:MM
  value: number;
  timestamp: number; // ms
}

export class HistoryService {

  // ─────────────────────────────────────────────
  //  BCV HISTORY (USD + EUR) — from dolarvzla.com
  // ─────────────────────────────────────────────

  private async fetchBcvMonth(year: number, month: number): Promise<RateSnapshot[]> {
    const cacheKey = `${BCV_CACHE_PREFIX}${year}_${month}`;
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

    // Try cache first (skip for current month so it stays fresh)
    if (!isCurrentMonth) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL_MS) {
            return data;
          }
        }
      } catch {}
    }

    try {
      const url = `https://rates.dolarvzla.com/bcv/${year}/${month}/list.json`;
      const res = await fetch(url, { headers: { "Accept": "application/json", "x-dolarvzla-key": "3f7f4c2f240abc59e040817add55aba016eb7a5419d4f4190e9fdfcc82016221" } });
      if (!res.ok) return [];
      const list: any[] = await res.json();
      if (!Array.isArray(list)) return [];

      const snapshots: RateSnapshot[] = list.map(item => {
        const dateStr = (item.date || "").split("T")[0];
        return {
          date: dateStr,
          usd: item.usd || 0,
          eur: item.eur || 0,
          usdt: 0,
          usdtBuy: 0,
          usdtSell: 0,
          timestamp: new Date(dateStr + "T12:00:00").getTime(),
        };
      }).filter(s => !!s.date);

      // Cache (only non-current months, they won't change)
      if (!isCurrentMonth) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: snapshots, ts: Date.now() }));
      }
      return snapshots;
    } catch {
      return [];
    }
  }

  // Returns BCV snapshots for a given month (USD+EUR), 1 per day, sorted desc
  async getBcvHistory(year: number, month: number): Promise<RateSnapshot[]> {
    const remote = await this.fetchBcvMonth(year, month);

    // Deduplicate by date (keep first occurrence)
    const seen = new Set<string>();
    const unique: RateSnapshot[] = [];
    for (const s of remote) {
      if (!seen.has(s.date)) {
        seen.add(s.date);
        unique.push(s);
      }
    }
    return unique.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ─────────────────────────────────────────────
  //  USDT LOCAL HISTORY — stored from live fetch
  // ─────────────────────────────────────────────

  // Save a raw USDT rate entry (called each time we get a live Binance rate)
  async appendUsdtEntry(usdtValue: number): Promise<void> {
    if (!usdtValue || usdtValue <= 0) return;
    try {
      const raw = await AsyncStorage.getItem(USDT_LOCAL_KEY);
      const entries: UsdtRawEntry[] = raw ? JSON.parse(raw) : [];
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().substring(0, 5);

      // Keep max 1000 entries to avoid bloat
      entries.unshift({
        date: dateStr,
        time: timeStr,
        value: usdtValue,
        timestamp: now.getTime(),
      });
      const trimmed = entries.slice(0, 1000);
      await AsyncStorage.setItem(USDT_LOCAL_KEY, JSON.stringify(trimmed));
    } catch {}
  }

  // Returns all USDT raw entries sorted descending
  async getUsdtRawHistory(): Promise<UsdtRawEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(USDT_LOCAL_KEY);
      if (!raw) return [];
      const entries: UsdtRawEntry[] = JSON.parse(raw);
      return entries.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  // Returns 1 USDT value per day (daily average), sorted descending
  async getUsdtDailyHistory(): Promise<RateSnapshot[]> {
    const raw = await this.getUsdtRawHistory();
    const byDay: Record<string, number[]> = {};
    for (const e of raw) {
      if (!byDay[e.date]) byDay[e.date] = [];
      byDay[e.date].push(e.value);
    }
    return Object.entries(byDay)
      .map(([date, values]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return {
          date,
          usd: 0,
          eur: 0,
          usdt: Number(avg.toFixed(2)),
          usdtBuy: Math.max(...values),
          usdtSell: Math.min(...values),
          timestamp: new Date(date + "T12:00:00").getTime(),
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }


  // ─────────────────────────────────────────────
  //  USDT REMOTE HISTORY
  // ─────────────────────────────────────────────
  async fetchUsdtHistory(from: string, to: string): Promise<any[]> {
    try {
      const response = await fetch(`https://api.dolarvzla.com/public/usdt/exchange-rate/list?from=${from}&to=${to}`, {
        headers: { "Accept": "application/json", "x-dolarvzla-key": "3f7f4c2f240abc59e040817add55aba016eb7a5419d4f4190e9fdfcc82016221" }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.rates || [];
    } catch (e) {
      return [];
    }
  }

  // Returns USDT remote snapshots deduplicated
  async getUsdtRemoteHistory(year: number, month: number): Promise<RateSnapshot[]> {
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    
    const remote = await this.fetchUsdtHistory(from, to);
    const seen = new Set<string>();
    const unique: RateSnapshot[] = [];
    
    for (const item of remote) {
      if (item && item.date) {
        const dateStr = item.date.substring(0, 10);
        if (!seen.has(dateStr)) {
          seen.add(dateStr);
          unique.push({
            date: dateStr,
            usd: 0,
            eur: 0,
            usdt: item.average || 0,
            usdtBuy: item.buy || 0,
            usdtSell: item.sell || 0,
            timestamp: new Date(dateStr + "T12:00:00").getTime()
          });
        }
      }
    }
    return unique;
  }

  // Returns 5 USDT records per day (8 AM, 12 PM, 4 PM, 8 PM, 12 AM)
  async getUsdtDetailedHistory(year: number, month: number): Promise<RateSnapshot[]> {
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    
    const remote = await this.fetchUsdtHistory(from, to);
    const byDay: Record<string, any[]> = {};
    
    for (const item of remote) {
      if (item && item.date) {
        const dateStr = item.date.substring(0, 10);
        if (!byDay[dateStr]) byDay[dateStr] = [];
        byDay[dateStr].push(item);
      }
    }

    const unique: RateSnapshot[] = [];
    const targetHours = [
      { h: 20, label: "08:00 PM" },
      { h: 16, label: "04:00 PM" },
      { h: 12, label: "12:00 PM" },
      { h: 8,  label: "08:00 AM" },
      { h: 0,  label: "12:00 AM" }
    ];

    for (const dateStr of Object.keys(byDay).sort((a, b) => b.localeCompare(a))) {
      const items = byDay[dateStr];
      for (const th of targetHours) {
        let closest = items[0];
        let minDiff = 999;
        for (const item of items) {
          const d = new Date(item.date);
          if (isNaN(d.getTime())) continue;
          // Use UTC hours to align with the provided API data roughly, or getUTCHours
          // Let's use getUTCHours as the data is "2026-08-14 09:00:36.299Z"
          const h = d.getUTCHours();
          const diff = Math.abs(h - th.h);
          if (diff < minDiff) {
            minDiff = diff;
            closest = item;
          }
        }
        
        unique.push({
          date: dateStr,
          time: th.label,
          usd: 0,
          eur: 0,
          usdt: closest.average || 0,
          usdtBuy: closest.buy || 0,
          usdtSell: closest.sell || 0,
          timestamp: new Date(`${dateStr}T${String(th.h).padStart(2, "0")}:00:00`).getTime()
        });
      }
    }
    return unique.sort((a, b) => b.timestamp - a.timestamp);
  }


  // ─────────────────────────────────────────────
  //  COMBINED — for heatmap calendar (1 per day)
  // ─────────────────────────────────────────────

    async getHistory(year: number, month: number): Promise<RateSnapshot[]> {
    const [bcv, usdtRemote, usdtDaily] = await Promise.all([
      this.getBcvHistory(year, month),
      this.getUsdtRemoteHistory(year, month),
      this.getUsdtDailyHistory(),
    ]);

    const map: Record<string, RateSnapshot> = {};

    // Start with BCV data
    for (const s of bcv) {
      map[s.date] = { ...s };
    }

    // Merge USDT Remote
    for (const u of usdtRemote) {
      if (map[u.date]) {
        map[u.date].usdt = u.usdt;
        map[u.date].usdtBuy = u.usdtBuy;
        map[u.date].usdtSell = u.usdtSell;
      } else {
        map[u.date] = { ...u };
      }
    }

    // Merge USDT Local (Local takes precedence if exists because it's live P2P)
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    for (const u of usdtDaily) {
      if (!u.date.startsWith(monthPrefix)) continue;
      if (map[u.date]) {
        if (u.usdt > 0) map[u.date].usdt = u.usdt;
        if (u.usdtBuy > 0) map[u.date].usdtBuy = u.usdtBuy;
        if (u.usdtSell > 0) map[u.date].usdtSell = u.usdtSell;
      } else {
        map[u.date] = { ...u };
      }
    }

    return Object.values(map).sort((a, b) => b.timestamp - a.timestamp);
  }

  // ─────────────────────────────────────────────
  //  LEGACY: appendLocal (kept for compatibility)
  // ─────────────────────────────────────────────

  async appendLocal(rates: BcvRates): Promise<void> {
    await this.appendUsdtEntry(rates.USDT);
  }

  // ─────────────────────────────────────────────
  //  PERIOD HISTORY for charts
  // ─────────────────────────────────────────────

  async getHistoryForPeriod(period: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y"): Promise<RateSnapshot[]> {
    const today = new Date();
    const result: RateSnapshot[] = [];

    let monthsToFetch = 1;
    if (period === "3M") monthsToFetch = 3;
    if (period === "6M") monthsToFetch = 6;
    if (period === "1Y") monthsToFetch = 12;

    const promises = [];
    for (let i = 0; i < monthsToFetch; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      promises.push(this.getHistory(targetDate.getFullYear(), targetDate.getMonth() + 1));
    }

    const monthResults = await Promise.all(promises);
    for (const mData of monthResults) {
      result.push(...mData);
    }

    const sorted = result.sort((a, b) => a.timestamp - b.timestamp);
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let cutoff = 0;
    if (period === "1D") cutoff = now - dayMs * 2;
    else if (period === "1W") cutoff = now - dayMs * 7;
    else if (period === "1M") cutoff = now - dayMs * 30;
    else if (period === "3M") cutoff = now - dayMs * 90;
    else if (period === "6M") cutoff = now - dayMs * 180;
    else if (period === "1Y") cutoff = now - dayMs * 365;

    return sorted.filter(d => d.timestamp >= cutoff);
  }
}

export const historyService = new HistoryService();

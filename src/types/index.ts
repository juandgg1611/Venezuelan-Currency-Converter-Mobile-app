// src/types/index.ts
export interface BcvRates {
  USD: number;
  EUR: number;
  CNY: number;
  TRY: number;
  RUB: number;
  VES: number;
}

export interface UsdtBand {
  band: string;
  buy: number;
  sell: number;
}

export interface CompleteRates extends BcvRates {
  USDT: number;
  usdtDetails?: {
    mid: number;
    bands: UsdtBand[];
    source: string;
  };
}

export type CurrencyCode = keyof BcvRates | "USDT";

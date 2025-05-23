// Gym の生データ（パース後の未整理状態）
export interface GymRaw {
  name: string;
  area?: string;
  address?: string;
  price?: string;
  url?: string;
  features?: string[];
  description?: string;
}

// 最終的な Gym オブジェクト
export interface Gym {
  name: string;
  area: string;
  prefecture: string;
  city: string;
  address: string;
  prices: Price[];
  url: string;
  features: string[];
  description?: string;
  isPersonal: boolean;
  isPersonalReason?: string;
}

// 料金情報
export interface Price {
  type: string;
  amount: number;
  period: 'monthly' | 'daily' | 'single';
  description?: string;
} 
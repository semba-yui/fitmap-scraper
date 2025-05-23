import type { Price } from '../../types/index.js';

export class PriceModel implements Price {
  constructor(
    public type: string,
    public amount: number,
    public period: 'monthly' | 'daily' | 'single',
    public description?: string
  ) {}

  static fromString(priceText: string): PriceModel[] {
    const prices: PriceModel[] = [];
    
    // 価格パターンの正規表現
    const monthlyPattern = /(\d+,?\d*)\s*円\s*\/\s*月/g;
    const dailyPattern = /(\d+,?\d*)\s*円\s*\/\s*日/g;
    const singlePattern = /(\d+,?\d*)\s*円(?!\s*\/)/g;
    
    let match;
    
    // 月額料金
    while ((match = monthlyPattern.exec(priceText)) !== null) {
      if (match[1]) {
        const amount = parseInt(match[1].replace(',', ''));
        prices.push(new PriceModel('月額', amount, 'monthly'));
      }
    }
    
    // 日額料金
    while ((match = dailyPattern.exec(priceText)) !== null) {
      if (match[1]) {
        const amount = parseInt(match[1].replace(',', ''));
        prices.push(new PriceModel('日額', amount, 'daily'));
      }
    }
    
    // 単発料金
    while ((match = singlePattern.exec(priceText)) !== null) {
      if (match[1]) {
        const amount = parseInt(match[1].replace(',', ''));
        prices.push(new PriceModel('単発', amount, 'single'));
      }
    }
    
    return prices;
  }

  toJSON(): Price {
    return {
      type: this.type,
      amount: this.amount,
      period: this.period,
      description: this.description
    };
  }
}
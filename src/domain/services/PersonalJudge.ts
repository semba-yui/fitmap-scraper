import type { GymRaw } from '../../types/index.js';

interface PersonalJudgeResult {
  flag: boolean;
  status: 'personal' | 'unknown' | 'general';
  reason: string;
}

export class PersonalJudge {
  private static personalKeywords = [
    'パーソナル', 'personal', 'PERSONAL',
    'マンツーマン', '個別指導', 'プライベート',
    '1対1', '個人指導', 'オーダーメイド'
  ];

  private static generalKeywords = [
    'フィットネスクラブ', 'スポーツジム', 'スポーツクラブ',
    'フィットネス', '24時間', 'エニタイム', 'カーブス',
    'ジョイフィット', 'セントラル', 'コナミ', 'ルネサンス'
  ];

  static judge(raw: GymRaw): PersonalJudgeResult {
    const text = [
      raw.name,
      raw.description || '',
      (raw.features || []).join(' ')
    ].join(' ').toLowerCase();

    // パーソナル系キーワードの確認
    for (const keyword of PersonalJudge.personalKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        return {
          flag: true,
          status: 'personal',
          reason: `キーワード "${keyword}" が含まれています`
        };
      }
    }

    // 一般的なジムチェーンの確認
    for (const keyword of PersonalJudge.generalKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        return {
          flag: false,
          status: 'general',
          reason: `一般的なジム "${keyword}" として認識`
        };
      }
    }

    // URLから判定
    if (raw.url) {
      const url = raw.url.toLowerCase();
      if (url.includes('personal') || url.includes('private')) {
        return {
          flag: true,
          status: 'personal',
          reason: 'URLにパーソナル系キーワードが含まれています'
        };
      }
    }

    // 料金から判定（高額な場合はパーソナルの可能性）
    if (raw.price) {
      const priceText = raw.price.toLowerCase();
      const priceNumbers = priceText.match(/(\d+,?\d*)/g);
      
      if (priceNumbers) {
        const maxPrice = Math.max(...priceNumbers.map(p => parseInt(p.replace(',', ''))));
        if (maxPrice > 50000) {
          return {
            flag: true,
            status: 'personal',
            reason: `高額料金 (${maxPrice}円) のためパーソナルと判定`
          };
        }
      }
    }

    return {
      flag: false,
      status: 'unknown',
      reason: '判定できませんでした'
    };
  }

  static isPersonal(raw: GymRaw): boolean {
    return PersonalJudge.judge(raw).flag;
  }
} 
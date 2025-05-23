import { load } from 'cheerio';
import type { GymRaw } from '../types/index.js';
import { logger } from '../utils/Logger.js';

export class GymDetailParser {
  static enrich(raw: GymRaw, html: string): GymRaw {
    const $ = load(html);
    
    try {
      // より詳細な情報を抽出
      const enhanced: GymRaw = { ...raw };

      // ジム名の取得 - metaタグのog:titleから取得
      let detailName = $('meta[property="og:title"]').attr('content')?.trim();
      if (!detailName) {
        // フォールバック: title タグから「| FitMap」を除去
        detailName = $('title').text().replace(/\s*\|\s*.*$/, '').trim();
      }
      if (detailName && detailName !== 'FitMap' && !detailName.includes('日本最大級')) {
        enhanced.name = detailName;
      }

      // 住所の詳細取得 - FitMapの構造に合わせて
      const addressSelectors = [
        '.post_adress',  // FitMapの実際の住所クラス
        '.gym-info .address',
        '.location-info .address', 
        '.gym-detail .address',
        '.info-section .address',
        '[class*="address"]',
        '.gym-basic-info .address'
      ];
      
      for (const selector of addressSelectors) {
        const addressElement = $(selector).first();
        if (addressElement.length > 0) {
          const detailAddress = addressElement.text().trim();
          if (detailAddress && detailAddress.length > 10) { // 住所らしい長さ
            enhanced.address = detailAddress;
            break;
          }
        }
      }

      // 料金情報の詳細取得 - FitMapの実際の構造に合わせて
      const priceSelectors = [
        '.panel_ryokin',  // FitMapの実際の料金クラス
        '.gym-price',
        '.price-info',
        '.fee-info', 
        '.cost-info',
        '.pricing',
        '[class*="price"]',
        '[class*="fee"]'
      ];
      
      const prices: string[] = [];
      for (const selector of priceSelectors) {
        $(selector).each((i, el) => {
          const priceText = $(el).text().trim();
          if (priceText && (priceText.includes('円') || /^\d+$/.test(priceText))) {
            // 数字のみの場合は「円」を付加
            const formattedPrice = /^\d+$/.test(priceText) ? `${priceText}円` : priceText;
            if (!prices.includes(formattedPrice)) {
              prices.push(formattedPrice);
            }
          }
        });
      }
      
      if (prices.length > 0) {
        enhanced.price = prices.join(', ');
      }

      // 特徴・タグの詳細取得
      const featureSelectors = [
        '.gym-tags .tag',
        '.gym-features .feature',
        '.gym-categories .category',
        '.badge-list .badge',
        '[class*="tag"]',
        '[class*="badge"]',
        '[class*="feature"]'
      ];
      
      const features = new Set(enhanced.features || []);
      
      for (const selector of featureSelectors) {
        $(selector).each((i, el) => {
          const feature = $(el).text().trim();
          if (feature && feature.length > 0 && feature.length < 50) { // 妥当な長さ
            features.add(feature);
          }
        });
      }

      enhanced.features = Array.from(features);

      // 説明文の取得
      const descriptionSelectors = [
        '.gym-description',
        '.gym-intro', 
        '.gym-about',
        '.description',
        '.about',
        '.intro'
      ];
      
      for (const selector of descriptionSelectors) {
        const descElement = $(selector).first();
        if (descElement.length > 0) {
          const description = descElement.text().trim();
          if (description && description.length > 20) { // 説明らしい長さ
            enhanced.description = description;
            break;
          }
        }
      }

      // エリア情報の取得 - パンくずリストから
      $('.breadcrumb a, .breadcrumbs a, .nav a').each((i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';
        
        // 都道府県の判定
        if (href.includes('/area/') && (text.includes('県') || text.includes('都') || text.includes('府'))) {
          enhanced.area = text;
        }
      });

      // デバッグ情報
      logger.debug(`ジム詳細解析: name="${enhanced.name}", address="${enhanced.address || 'なし'}", prices=${prices.length}件`);
      
      return enhanced;

    } catch (error) {
      logger.error(`詳細パースでエラー: ${error}`);
      return raw;
    }
  }

  static parseMultiple(htmlMap: Map<string, string>): Map<string, GymRaw> {
    const results = new Map<string, GymRaw>();
    
    for (const [url, html] of htmlMap) {
      try {
        // URLから基本情報を作成
        const raw: GymRaw = {
          name: '',
          url
        };
        
        const enriched = this.enrich(raw, html);
        
        // 最低限の情報が取得できた場合のみ結果に含める
        if (enriched.name && enriched.name.length > 0 && !enriched.name.includes('日本最大級')) {
          results.set(url, enriched);
        } else {
          logger.warn(`ジム名が取得できませんでした: ${url}`);
        }
        
      } catch (error) {
        logger.error(`URL ${url} のパースでエラー: ${error}`);
      }
    }
    
    return results;
  }
} 
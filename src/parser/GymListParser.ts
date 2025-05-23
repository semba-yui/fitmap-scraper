import { load } from 'cheerio';
import type { GymRaw } from '../types/index.js';
import { logger } from '../utils/Logger.js';

export class GymListParser {
  static parse(html: string): GymRaw[] {
    const $ = load(html);
    const gyms: GymRaw[] = [];

    try {
      // ジムカードのセレクターを複数試行
      const selectors = [
        '.gym-card',
        '.gym-item',
        '[data-gym-id]',
        'a[href*="/gym/"]'
      ];

      let gymElements: any = null;
      
      for (const selector of selectors) {
        gymElements = $(selector);
        if (gymElements.length > 0) {
          logger.debug(`セレクター "${selector}" で ${gymElements.length} 件のジムを発見`);
          break;
        }
      }

      if (!gymElements || gymElements.length === 0) {
        logger.warn('ジムカードが見つかりませんでした');
        return gyms;
      }

      gymElements.each((index: number, element: any) => {
        try {
          const $gym = $(element);
          
          // 名前を取得
          const name = $gym.find('h3, .gym-name, .title').first().text().trim() ||
                      $gym.find('a').attr('title') ||
                      $gym.text().trim();

          // URLを取得
          const url = $gym.attr('href') || $gym.find('a').attr('href') || '';
          const fullUrl = url.startsWith('http') ? url : `https://fitmap.jp${url}`;

          // 住所を取得
          const address = $gym.find('.address, .location').text().trim();

          // 料金情報を取得
          const price = $gym.find('.price, .fee').text().trim();

          // 特徴を取得
          const features: string[] = [];
          $gym.find('.tag, .feature, .badge').each((i: number, el: any) => {
            const feature = $(el).text().trim();
            if (feature) {
              features.push(feature);
            }
          });

          if (name && fullUrl) {
            const gym: GymRaw = {
              name,
              url: fullUrl,
              address: address || undefined,
              price: price || undefined,
              features
            };

            gyms.push(gym);
          }

        } catch (error) {
          logger.warn(`ジム ${index} のパースでエラー: ${error}`);
        }
      });

      logger.info(`${gyms.length} 件のジムをパースしました`);
      return gyms;

    } catch (error) {
      logger.error(`HTMLパースでエラー: ${error}`);
      return [];
    }
  }
} 
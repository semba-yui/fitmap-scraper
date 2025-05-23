import { Page } from 'playwright';
import { BrowserFactory } from './BrowserFactory.js';
import { logger } from '../utils/Logger.js';
import { Time } from '../utils/Time.js';

export class AreaCrawler {
  private page: Page | null = null;

  async init(): Promise<void> {
    this.page = await BrowserFactory.createPage();
  }

  async fetchArea(areaId: number): Promise<string[]> {
    if (!this.page) {
      await this.init();
    }

    const urls: string[] = [];
    const baseUrl = `https://fitmap.jp/area/${areaId}/`;
    
    // sampleモードの判定
    const isSampleMode = process.argv.includes('--sample');
    
    try {
      logger.info(`エリア ${areaId} の情報を取得中: ${baseUrl}`);
      await this.page!.goto(baseUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // ページが読み込まれるまで待機
      await Time.sleep(2000);

      // ジムカードのURLを抽出
      const gymUrls = await this.page!.evaluate(() => {
        const gymCards = document.querySelectorAll('a[href*="/gym/"]');
        return Array.from(gymCards).map(card => {
          const href = card.getAttribute('href');
          return href ? (href.startsWith('http') ? href : `https://fitmap.jp${href}`) : '';
        }).filter(url => url);
      });

      urls.push(...gymUrls);
      logger.info(`エリア ${areaId} で ${gymUrls.length} 件のジムを発見`);

      // ページネーションがある場合の処理（制限を撤廃）
      let hasNextPage = true;
      let currentPage = 1;
      let emptyPageCount = 0; // 連続で空のページが来た回数
      const maxPages = isSampleMode ? 3 : 60; // sampleモードでは3ページまで、通常は60ページまで

      while (hasNextPage && emptyPageCount < 2 && currentPage < maxPages) { // 最大ページ数制限を追加
        currentPage++;
        
        // maxPages制限チェック
        if (currentPage > maxPages) {
          logger.info(`エリア ${areaId} の最大ページ数 ${maxPages} に到達しました`);
          break;
        }
        
        const nextPageUrl = `${baseUrl}?page=${currentPage}`;
        
        try {
          await this.page!.goto(nextPageUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          await Time.randomDelay(1000, 2000);

          // より厳密なジム存在チェック
          const pageInfo = await this.page!.evaluate(() => {
            // FitMapサイトの実際の構造に基づくジムカード検索
            const gymCards = document.querySelectorAll('a[href*="/gym/"]');
            const gymUrls = Array.from(gymCards).map(card => {
              const href = card.getAttribute('href');
              return href ? (href.startsWith('http') ? href : `https://fitmap.jp${href}`) : '';
            }).filter(url => url);

            // FitMapサイト特有の要素をチェック
            const hasGymListSection = document.querySelector('.gym-list, #gym-list, [class*="gym"], [data-gym]') !== null;
            const hasErrorPage = document.querySelector('.error, .not-found, .no-result') !== null;
            
            // ページタイトルと内容での判定
            const pageTitle = document.title || '';
            const bodyText = document.body.textContent || '';
            
            // ページが存在しない場合の特徴
            const hasValidTitle = !pageTitle.includes('404') && !pageTitle.includes('エラー') && !pageTitle.includes('見つかりません');
            const hasValidContent = bodyText.length > 1000; // 正常なページは十分なコンテンツがある
            const hasGymContent = bodyText.includes('フィットネス') || bodyText.includes('ジム') || bodyText.includes('トレーニング');
            
            // ページネーションリンクの存在チェック
            const paginationNext = document.querySelector('a[href*="?page="], .pagination .next, .page-next') !== null;
            
            return {
              gymUrls,
              gymCount: gymUrls.length,
              hasGymListSection,
              hasErrorPage,
              hasValidTitle,
              hasValidContent,
              hasGymContent,
              paginationNext,
              pageTitle: pageTitle.substring(0, 100),
              contentLength: bodyText.length
            };
          });

          // デバッグ情報をログ出力
          if (process.argv.includes('--debug')) {
            logger.debug(`ページ ${currentPage} 詳細情報:`, pageInfo);
          }

          // より厳密な存在判定: 以下のいずれかの条件で空ページとみなす
          const isEmptyPage = pageInfo.gymUrls.length === 0 || 
                             pageInfo.hasErrorPage ||
                             !pageInfo.hasValidTitle ||
                             !pageInfo.hasValidContent ||
                             (!pageInfo.hasGymContent && pageInfo.contentLength < 2000);

          if (isEmptyPage) {
            emptyPageCount++;
            logger.info(`エリア ${areaId} のページ ${currentPage} は存在しないか空です (${emptyPageCount}/2)`);
            logger.debug(`空ページ判定理由: gymCount=${pageInfo.gymCount}, hasError=${pageInfo.hasErrorPage}, validTitle=${pageInfo.hasValidTitle}, validContent=${pageInfo.hasValidContent}, hasGymContent=${pageInfo.hasGymContent}`);
            
            // 1回目の空ページで終了（FitMapは存在しないページが連続することが多い）
            if (emptyPageCount >= 1) {
              logger.info(`エリア ${areaId} のページネーション終了を検出`);
              hasNextPage = false;
            }
          } else {
            emptyPageCount = 0; // リセット
            urls.push(...pageInfo.gymUrls);
            logger.info(`エリア ${areaId} のページ ${currentPage} で ${pageInfo.gymUrls.length} 件のジムを発見`);
          }
        } catch (error) {
          logger.warn(`エリア ${areaId} のページ ${currentPage} でエラー: ${error}`);
          emptyPageCount++;
          
          // エラーが発生した場合も早めに終了
          if (emptyPageCount >= 1) {
            hasNextPage = false;
          }
        }
      }

      logger.info(`エリア ${areaId} の合計ジム数: ${urls.length}`);
      return [...new Set(urls)]; // 重複を除去

    } catch (error) {
      logger.error(`エリア ${areaId} の取得でエラー: ${error}`);
      
      // リトライを1回行う
      logger.info(`エリア ${areaId} のリトライを実行します...`);
      await Time.sleep(3000);
      
      try {
        await this.page!.goto(baseUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await Time.sleep(3000);
        
        const gymUrls = await this.page!.evaluate(() => {
          const gymCards = document.querySelectorAll('a[href*="/gym/"]');
          return Array.from(gymCards).map(card => {
            const href = card.getAttribute('href');
            return href ? (href.startsWith('http') ? href : `https://fitmap.jp${href}`) : '';
          }).filter(url => url);
        });
        
        logger.info(`エリア ${areaId} リトライで ${gymUrls.length} 件のジムを発見`);
        return [...new Set(gymUrls)];
        
      } catch (retryError) {
        logger.error(`エリア ${areaId} のリトライも失敗: ${retryError}`);
        return [];
      }
    }
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
  }

  // 47都道府県の情報を取得
  static async fetchAllAreas(): Promise<Map<number, string[]>> {
    const areaCrawler = new AreaCrawler();
    const results = new Map<number, string[]>();

    try {
      // 47都道府県のIDをループ
      for (let areaId = 1; areaId <= 47; areaId++) {
        logger.info(`都道府県 ${areaId}/47 の処理開始`);
        
        const urls = await areaCrawler.fetchArea(areaId);
        results.set(areaId, urls);
        
        // レート制限のための待機
        await Time.randomDelay(2000, 4000);
      }
    } finally {
      await areaCrawler.close();
    }

    return results;
  }
} 
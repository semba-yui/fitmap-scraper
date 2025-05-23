import { Page } from 'playwright';
import { BrowserFactory } from './BrowserFactory.js';
import { logger } from '../utils/Logger.js';
import { Time } from '../utils/Time.js';

export class DetailCrawler {
  private page: Page | null = null;
  private pageCounter = 0;
  private readonly MAX_PAGES_PER_SESSION = 5; // セッションあたりの最大ページ数

  async init(): Promise<void> {
    try {
      this.page = await BrowserFactory.createPage();
    } catch (error) {
      logger.error(`DetailCrawlerの初期化でエラー: ${error}`);
      // ブラウザを完全に再起動
      await BrowserFactory.closeBrowser();
      this.page = await BrowserFactory.createPage();
    }
  }

  async fetchDetail(url: string): Promise<string> {
    if (!this.page) {
      await this.init();
    }

    // 定期的にページを再作成してメモリ節約
    if (this.pageCounter >= this.MAX_PAGES_PER_SESSION) {
      logger.debug(`ページ制限に達しました。ページを再作成します (${this.pageCounter}回目)`);
      await this.refreshPage();
    }

    try {
      this.pageCounter++;
      logger.debug(`詳細情報を取得中 (${this.pageCounter}回目): ${url}`);
      
      await this.page!.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // ページが読み込まれるまで待機
      await Time.sleep(2000);

      // HTMLを取得
      const html = await this.page!.content();
      
      // リソース統計をログ出力
      if (this.pageCounter % 3 === 0) {
        const stats = await BrowserFactory.getResourceStats();
        logger.debug(`リソース統計: ページ数=${stats.pages}, コンテキスト数=${stats.contexts}`);
      }
      
      return html;

    } catch (error) {
      logger.error(`詳細取得でエラー (${url}): ${error}`);
      
      // ページが壊れた場合は再作成を試行
      try {
        await this.refreshPage();
        logger.debug(`ページを再作成してリトライ: ${url}`);
        
        await this.page!.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await Time.sleep(2000);
        
        return await this.page!.content();
      } catch (retryError) {
        logger.error(`リトライも失敗 (${url}): ${retryError}`);
        return '';
      }
    }
  }

  async fetchDetails(urls: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      if (!url) continue;
      
      logger.info(`詳細取得中 ${i + 1}/${urls.length}: ${url}`);
      
      const html = await this.fetchDetail(url);
      if (html && html.length > 0) {
        results.set(url, html);
      }
      
      // レート制限のための待機
      await Time.randomDelay(1500, 3000);
      
      // バッチ処理での中間報告
      if ((i + 1) % 5 === 0) {
        const stats = await BrowserFactory.getResourceStats();
        logger.info(`進捗: ${i + 1}/${urls.length} 完了, 成功: ${results.size}件, リソース: ${stats.pages}ページ/${stats.contexts}コンテキスト`);
      }
    }

    return results;
  }

  private async refreshPage(): Promise<void> {
    if (this.page) {
      try {
        await this.page.close();
      } catch (error) {
        logger.warn(`ページクローズでエラー: ${error}`);
      }
    }
    
    // 新しいページを作成
    this.page = await BrowserFactory.createPage();
    this.pageCounter = 0;
    logger.debug('ページを再作成しました');
  }

  async close(): Promise<void> {
    if (this.page) {
      try {
        await this.page.close();
      } catch (error) {
        logger.warn(`ページクローズでエラー: ${error}`);
      }
      this.page = null;
    }
    this.pageCounter = 0;
  }
} 
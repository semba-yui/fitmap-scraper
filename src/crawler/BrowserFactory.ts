import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from '../utils/Logger.js';

export class BrowserFactory {
  private static browser: Browser | null = null;
  private static context: BrowserContext | null = null;

  static async createBrowser(headless: boolean = true): Promise<Browser> {
    if (BrowserFactory.browser) {
      return BrowserFactory.browser;
    }

    logger.info('ブラウザを起動中...');
    BrowserFactory.browser = await chromium.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--memory-pressure-off', // メモリプレッシャーを無効化
        '--max_old_space_size=4096' // Node.jsのヒープサイズを増加
      ]
    });

    logger.info('ブラウザの起動が完了しました');
    return BrowserFactory.browser;
  }

  static async createContext(): Promise<BrowserContext> {
    if (BrowserFactory.context) {
      return BrowserFactory.context;
    }

    const browser = await BrowserFactory.createBrowser();
    BrowserFactory.context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      // リソース節約のための設定
      ignoreHTTPSErrors: true,
      bypassCSP: true
    });

    // コンテキストレベルでのリソース制限
    await BrowserFactory.context.route('**/*', async (route) => {
      const request = route.request();
      // 画像やCSS、フォントをブロックしてメモリ節約
      if (request.resourceType() === 'image' || 
          request.resourceType() === 'stylesheet' || 
          request.resourceType() === 'font') {
        await route.abort();
      } else {
        await route.continue();
      }
    });

    return BrowserFactory.context;
  }

  static async createPage(): Promise<Page> {
    const context = await BrowserFactory.createContext();
    const page = await context.newPage();
    
    // ページの設定
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
    });

    // JavaScript無効化でメモリ節約（必要に応じて）
    // await page.setJavaScriptEnabled(false);

    return page;
  }

  static async closeContext(): Promise<void> {
    if (BrowserFactory.context) {
      logger.info('コンテキストを終了中...');
      await BrowserFactory.context.close();
      BrowserFactory.context = null;
      logger.info('コンテキストの終了が完了しました');
    }
  }

  static async closeBrowser(): Promise<void> {
    await BrowserFactory.closeContext();
    
    if (BrowserFactory.browser) {
      logger.info('ブラウザを終了中...');
      await BrowserFactory.browser.close();
      BrowserFactory.browser = null;
      logger.info('ブラウザの終了が完了しました');
    }
  }

  // デバッグ用：リソース使用状況の監視
  static async getResourceStats(): Promise<{ pages: number, contexts: number }> {
    const browser = BrowserFactory.browser;
    if (!browser) {
      return { pages: 0, contexts: 0 };
    }

    const contexts = browser.contexts();
    let totalPages = 0;
    for (const context of contexts) {
      totalPages += context.pages().length;
    }

    return {
      pages: totalPages,
      contexts: contexts.length
    };
  }
} 
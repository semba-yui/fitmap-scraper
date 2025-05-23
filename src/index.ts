import { AreaCrawler } from './crawler/AreaCrawler.js';
import { DetailCrawler } from './crawler/DetailCrawler.js';
import { GymListParser } from './parser/GymListParser.js';
import { GymDetailParser } from './parser/GymDetailParser.js';
import { GymModel } from './domain/models/Gym.js';
import { PriceModel } from './domain/models/Price.js';
import { PersonalJudge } from './domain/services/PersonalJudge.js';
import { AddressSplitter } from './domain/services/AddressSplitter.js';
import { YamlExporter } from './exporter/YamlExporter.js';
import { BrowserFactory } from './crawler/BrowserFactory.js';
import { logger } from './utils/Logger.js';
import type { Gym, GymRaw } from './types/index.js';

async function orchestrate(): Promise<void> {
  logger.info('FitMapスクレイピングを開始します（全都道府県）');
  
  try {
    // 1. 全都道府県のジムURLを収集
    logger.info('Step 1: 全都道府県のジムURLを収集中...');
    
    const allUrls = new Map<number, string[]>();
    const areaCrawler = new AreaCrawler();
    
    // 全47都道府県をループ処理
    for (let areaId = 1; areaId <= 47; areaId++) {
      try {
        const prefecture = AddressSplitter.getPrefectureFromAreaId(areaId);
        logger.info(`${prefecture}（エリアID: ${areaId}）のジムURLを収集中...`);
        
        const urls = await areaCrawler.fetchArea(areaId);
        allUrls.set(areaId, urls);
        
        logger.info(`${prefecture}: ${urls.length} 件のジム`);
        
        // レート制限のため少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        const prefecture = AddressSplitter.getPrefectureFromAreaId(areaId);
        logger.warn(`${prefecture}のURL収集でエラー: ${error}`);
        allUrls.set(areaId, []); // エラーの場合は空配列をセット
      }
    }
    
    await areaCrawler.close();

    // 収集結果の統計を表示
    const totalUrls = Array.from(allUrls.values()).reduce((sum, urls) => sum + urls.length, 0);
    logger.info(`URL収集完了: 全国で合計 ${totalUrls} 件のジム`);

    // いったんブラウザを閉じる
    await BrowserFactory.closeBrowser();

    // 2. 各都道府県のジムの詳細情報を取得
    logger.info('Step 2: ジムの詳細情報を取得中...');
    const allGyms: Gym[] = [];
    
    for (const [areaId, urls] of allUrls) {
      if (urls.length === 0) continue;
      
      const prefecture = AddressSplitter.getPrefectureFromAreaId(areaId);
      logger.info(`${prefecture} の詳細情報を取得中 (${urls.length} 件)`);
      
      try {
        // サンプルを限定する場合（テスト用）
        const limitedUrls = process.argv.includes('--sample') ? urls.slice(0, 5) : urls;
        
        const detailCrawler = new DetailCrawler();
        const htmlMap = await detailCrawler.fetchDetails(limitedUrls);
        await detailCrawler.close();
        
        const parsedData = GymDetailParser.parseMultiple(htmlMap);
        
        // 3. データを構造化してGymオブジェクトに変換
        for (const [url, raw] of parsedData) {
          const processed = processGymData(raw, prefecture);
          if (processed) {
            allGyms.push(processed);
          }
        }
        
        logger.info(`${prefecture}: ${allGyms.filter(g => g.prefecture === prefecture).length} 件の詳細情報を取得`);
        
        // レート制限のため少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.warn(`${prefecture}の詳細情報取得でエラー: ${error}`);
      }
    }

    logger.info(`合計 ${allGyms.length} 件のジム情報を処理しました`);

    // 4. 都道府県別に分類
    const gymsByPrefecture = new Map<string, Gym[]>();
    for (const gym of allGyms) {
      const pref = gym.prefecture;
      if (!gymsByPrefecture.has(pref)) {
        gymsByPrefecture.set(pref, []);
      }
      gymsByPrefecture.get(pref)!.push(gym);
    }

    // 5. 結果をYAMLファイルに出力
    logger.info('Step 3: 結果をYAMLファイルに出力中...');
    YamlExporter.saveByPrefecture(gymsByPrefecture, 'yaml');
    
    // 統計情報を表示
    printStatistics(gymsByPrefecture);
    
  } catch (error) {
    logger.error(`スクレイピング処理でエラー: ${error}`);
    throw error;
  } finally {
    await BrowserFactory.closeBrowser();
  }
}

function processGymData(raw: GymRaw, defaultPrefecture: string): Gym | null {
  try {
    if (!raw.name || !raw.url) {
      return null;
    }

    // 住所を分割
    const addressParts = AddressSplitter.split(raw.address || '');
    const prefecture = addressParts.prefecture || defaultPrefecture;
    const city = addressParts.city;
    const address = raw.address || '';

    // 料金情報を解析
    const prices = raw.price ? PriceModel.fromString(raw.price) : [];

    // パーソナルジム判定
    const personalResult = PersonalJudge.judge(raw);

    const gym: Gym = {
      name: raw.name,
      area: raw.area || prefecture,
      prefecture,
      city,
      address,
      prices: prices.map(p => p.toJSON()),
      url: raw.url,
      features: raw.features || [],
      description: raw.description,
      isPersonal: personalResult.flag,
      isPersonalReason: personalResult.reason
    };

    return gym;

  } catch (error) {
    logger.warn(`ジムデータ処理でエラー: ${error}`);
    return null;
  }
}

function printStatistics(gymsByPrefecture: Map<string, Gym[]>): void {
  logger.info('\n=== 収集結果統計 ===');
  
  let totalGyms = 0;
  let totalPersonal = 0;
  
  for (const [prefecture, gyms] of gymsByPrefecture) {
    const personalCount = gyms.filter(g => g.isPersonal).length;
    totalGyms += gyms.length;
    totalPersonal += personalCount;
    
    logger.info(`${prefecture}: ${gyms.length} 件 (パーソナル: ${personalCount} 件)`);
  }
  
  logger.info(`\n合計: ${totalGyms} 件`);
  logger.info(`パーソナルジム: ${totalPersonal} 件 (${Math.round(totalPersonal / totalGyms * 100)}%)`);
  logger.info(`一般ジム: ${totalGyms - totalPersonal} 件`);
}

// メイン実行
const currentFile = new URL(import.meta.url).pathname;
const mainFile = process.argv[1];
if (mainFile && (currentFile === mainFile || currentFile.endsWith(mainFile))) {
  // コマンドライン引数の処理
  const args = process.argv.slice(2);
  
  if (args.includes('--debug')) {
    logger.setLogLevel('debug');
  }
  
  if (args.includes('--help')) {
    console.log(`
使用方法: npm run dev [オプション]

オプション:
  --sample    少数のサンプルデータのみ取得（各都道府県5件まで、テスト用）
  --debug     デバッグログを有効化
  --help      このヘルプを表示

例:
  npm run dev --sample --debug   # 全都道府県から少数サンプルを取得
  npm run dev                    # 全都道府県の全ジムを取得
    `);
    process.exit(0);
  }

  orchestrate().catch((error) => {
    logger.error(`実行エラー: ${error}`);
    process.exit(1);
  });
} 
import * as YAML from 'yaml';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Gym } from '../types/index.js';
import { logger } from '../utils/Logger.js';
import { Time } from '../utils/Time.js';

export class YamlExporter {
  static save(list: Gym[], filePath: string = 'gyms.yaml'): void {
    try {
      // ディレクトリが存在しない場合は作成
      const dir = dirname(filePath);
      if (dir !== '.') {
        mkdirSync(dir, { recursive: true });
      }

      // メタデータを追加
      const data = {
        metadata: {
          exportedAt: Time.getTimestamp(),
          totalCount: list.length,
          description: 'FitMapから収集したジム情報'
        },
        gyms: list
      };

      // YAMLに変換
      const yamlString = YAML.stringify(data, {
        indent: 2,
        lineWidth: 120,
        minContentWidth: 40
      });

      // ファイルに保存
      writeFileSync(filePath, yamlString, 'utf-8');
      logger.info(`${list.length} 件のジム情報を ${filePath} に保存しました`);

    } catch (error) {
      logger.error(`YAML保存でエラー: ${error}`);
      throw error;
    }
  }

  static saveByPrefecture(gymsByPref: Map<string, Gym[]>, outputDir: string = 'yaml'): void {
    try {
      // 出力ディレクトリを作成
      mkdirSync(outputDir, { recursive: true });

      for (const [prefecture, gyms] of gymsByPref) {
        if (gyms.length === 0) continue;

        const fileName = `${outputDir}/${prefecture}.yaml`;
        YamlExporter.save(gyms, fileName);
      }

      // 全体のサマリーファイルも作成
      const summary = {
        metadata: {
          exportedAt: Time.getTimestamp(),
          totalPrefectures: gymsByPref.size,
          totalGyms: Array.from(gymsByPref.values()).reduce((sum, gyms) => sum + gyms.length, 0)
        },
        prefectureSummary: Object.fromEntries(
          Array.from(gymsByPref.entries()).map(([pref, gyms]) => [
            pref,
            {
              count: gyms.length,
              personalCount: gyms.filter(g => g.isPersonal).length
            }
          ])
        )
      };

      const summaryYaml = YAML.stringify(summary, { indent: 2 });
      writeFileSync(`${outputDir}/summary.yaml`, summaryYaml, 'utf-8');
      
      logger.info(`都道府県別のYAMLファイルを ${outputDir} に保存しました`);

    } catch (error) {
      logger.error(`都道府県別YAML保存でエラー: ${error}`);
      throw error;
    }
  }
} 
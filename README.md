# FitMap スクレイピングツール

[FitMap](https://fitmap.jp/) から全国のフィットネスジム情報を取得し、都道府県別に整理するスクレイピングツールです。

## 機能

- 全47都道府県のジム情報を自動収集
- パーソナルジムの自動判定
- 都道府県別のYAMLファイル出力
- 料金情報の解析と正規化
- 住所の都道府県・市区町村への分割
- レート制限による負荷制御

## プロジェクト構成

```text
fitmap-scraper/
├─ src/
│  ├─ index.ts             # エントリーポイント
│  ├─ crawler/             # Playwright によるHTML取得
│  │  ├─ BrowserFactory.ts
│  │  ├─ AreaCrawler.ts
│  │  └─ DetailCrawler.ts
│  ├─ parser/              # DOM解析とデータ抽出
│  │  ├─ GymListParser.ts
│  │  └─ GymDetailParser.ts
│  ├─ domain/              # ビジネスロジック
│  │  ├─ models/
│  │  │  ├─ Gym.ts
│  │  │  └─ Price.ts
│  │  └─ services/
│  │     ├─ PersonalJudge.ts
│  │     └─ AddressSplitter.ts
│  ├─ exporter/            # データ出力
│  │  └─ YamlExporter.ts
│  ├─ utils/               # ユーティリティ
│  │  ├─ Logger.ts
│  │  └─ Time.ts
│  └─ types/               # TypeScript型定義
│     └─ index.d.ts
└─ yaml/                    # 出力ディレクトリ
```

## インストール

### 前提条件

- Node.js 18.0.0 以上
- npm または yarn

### 依存関係のインストール

```bash
npm install
```

Playwrightのブラウザをインストール:

```bash
npx playwright install
```

## 使用方法

### 基本実行

全国のジム情報を収集:

```bash
npm run dev
```

### オプション

- `--sample`: テスト用に少数のサンプルデータのみ取得
- `--debug`: デバッグログを有効化
- `--help`: ヘルプを表示

### 実行例

```bash
# サンプルデータでテスト実行
npm run dev --sample --debug

# 全データを収集（本番実行）
npm run dev
```

## 出力ファイル

### 都道府県別YAMLファイル

`yaml/[都道府県名].yaml` の形式で保存されます。

例: `yaml/東京都.yaml`

```yaml
metadata:
  exportedAt: "2024-01-01T00:00:00.000Z"
  totalCount: 1234
  description: "FitMapから収集したジム情報"
gyms:
  - name: "サンプルジム"
    area: "東京都"
    prefecture: "東京都"
    city: "新宿区"
    address: "東京都新宿区..."
    prices:
      - type: "月額"
        amount: 8000
        period: "monthly"
    url: "https://fitmap.jp/gym/12345"
    features: ["24時間営業", "パーソナル"]
    isPersonal: true
    isPersonalReason: "キーワード 'パーソナル' が含まれています"
```

### サマリーファイル

`yaml/summary.yaml` に全体の統計情報が保存されます。

## データ構造

### Gym オブジェクト

| フィールド | 型 | 説明 |
|-----------|----|----|
| name | string | ジム名 |
| area | string | エリア（都道府県） |
| prefecture | string | 都道府県 |
| city | string | 市区町村 |
| address | string | 住所 |
| prices | Price[] | 料金情報の配列 |
| url | string | ジムの詳細ページURL |
| features | string[] | 特徴・タグの配列 |
| description | string? | ジムの説明 |
| isPersonal | boolean | パーソナルジムかどうか |
| isPersonalReason | string? | パーソナル判定の理由 |

### Price オブジェクト

| フィールド | 型 | 説明 |
|-----------|----|----|
| type | string | 料金タイプ（月額、日額など） |
| amount | number | 金額 |
| period | string | 期間（monthly, daily, single） |
| description | string? | 料金の詳細説明 |

## 注意事項

1. **レート制限**: サイトへの負荷を避けるため、リクエスト間に適切な待機時間を設けています
2. **実行時間**: 全国のデータ収集には数時間かかる場合があります
3. **データの正確性**: スクレイピングのため、サイトの変更により動作しなくなる可能性があります
4. **利用規約**: 対象サイトの利用規約を必ず確認してください

## 開発

### TypeScriptのコンパイル

```bash
npm run build
```

### デバッグモード

```bash
npm run dev --debug
```

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

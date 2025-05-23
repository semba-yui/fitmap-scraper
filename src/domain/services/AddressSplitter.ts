interface AddressParts {
  prefecture: string;
  city: string;
  address: string;
}

export class AddressSplitter {
  private static prefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
    '岐阜県', '静岡県', '愛知県', '三重県',
    '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
    '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県',
    '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ];

  static split(address: string): AddressParts {
    if (!address) {
      return {
        prefecture: '',
        city: '',
        address: ''
      };
    }

    // 都道府県を特定
    let prefecture = '';
    let remainingAddress = address;

    for (const pref of AddressSplitter.prefectures) {
      if (address.includes(pref)) {
        prefecture = pref;
        const prefIndex = address.indexOf(pref);
        remainingAddress = address.substring(prefIndex + pref.length);
        break;
      }
    }

    // 市区町村を抽出
    let city = '';
    const cityPatterns = [
      /^([^市区町村]+[市区町村])/,
      /^([^郡]+郡[^町村]+[町村])/,
      /^([^区]+区)/,
      /^([^市]+市)/
    ];

    for (const pattern of cityPatterns) {
      const match = remainingAddress.match(pattern);
      if (match && match[1]) {
        city = match[1];
        remainingAddress = remainingAddress.substring(city.length);
        break;
      }
    }

    return {
      prefecture,
      city,
      address: remainingAddress.trim()
    };
  }

  static getPrefectureFromAreaId(areaId: number): string {
    const prefectureMap: { [key: number]: string } = {
      1: '東京都', 2: '神奈川県', 3: '千葉県', 4: '埼玉県',
      5: '茨城県', 6: '栃木県', 7: '群馬県', 8: '愛知県',
      9: '岐阜県', 10: '三重県', 11: '静岡県', 12: '大阪府',
      13: '兵庫県', 14: '京都府', 15: '滋賀県', 16: '奈良県',
      17: '和歌山県', 18: '北海道', 19: '青森県', 20: '岩手県',
      21: '宮城県', 22: '秋田県', 23: '山形県', 24: '福島県',
      25: '山梨県', 26: '長野県', 27: '新潟県', 28: '富山県',
      29: '石川県', 30: '福井県', 31: '広島県', 32: '岡山県',
      33: '鳥取県', 34: '島根県', 35: '山口県', 36: '香川県',
      37: '徳島県', 38: '愛媛県', 39: '高知県', 40: '福岡県',
      41: '佐賀県', 42: '長崎県', 43: '熊本県', 44: '大分県',
      45: '宮崎県', 46: '鹿児島県', 47: '沖縄県'
    };

    return prefectureMap[areaId] || '';
  }
} 
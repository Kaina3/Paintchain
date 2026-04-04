# 21. 人狼モード - お題データ・ロジック

## 概要
人狼モード用のお題データとお題選出ロジックの実装。
ワードウルフモードでは「微妙に違うお題ペア」、インポスターモードでは「お題+選択肢」が必要。


## ファイル構成

```
server/src/
└── data/
    └── werewolfPrompts.ts    # 人狼用お題データ（新規）
```


## 1. お題データ構造

### ワードウルフ用お題ペア
「微妙に違う」ペアを用意する。描画で表現したときに似てしまいそうな組み合わせ。

```typescript
interface WordWolfPromptPair {
  category: string;
  villager: string;    // 村人のお題
  werewolf: string;    // 人狼のお題
  difficulty: 'easy' | 'normal' | 'hard';
}
```

### インポスター用お題
ジャンル内で複数の選択肢を用意し、そのうち1つが正解。

```typescript
interface ImpostorPrompt {
  category: string;
  answer: string;            // 正解のお題
  decoys: string[];          // ダミーの選択肢（3〜5個）
  difficulty: 'easy' | 'normal' | 'hard';
}
```


## 2. werewolfPrompts.ts 実装

```typescript
// ========== 型定義 ==========

export interface WordWolfPromptPair {
  category: string;
  villager: string;
  werewolf: string;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface ImpostorPrompt {
  category: string;
  answer: string;
  decoys: string[];
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface PromptResult {
  category: string;
  villagerPrompt: string;
  werewolfPrompt: string | null;
  choices: string[];  // インポスターモード用選択肢
}


// ========== ワードウルフ用お題ペア ==========

export const WORDWOLF_PROMPTS: WordWolfPromptPair[] = [
  // 食べ物
  { category: '食べ物', villager: 'ラーメン', werewolf: 'うどん', difficulty: 'easy' },
  { category: '食べ物', villager: 'ハンバーガー', werewolf: 'サンドイッチ', difficulty: 'easy' },
  { category: '食べ物', villager: 'りんご', werewolf: 'みかん', difficulty: 'easy' },
  { category: '食べ物', villager: 'カレーライス', werewolf: 'ハヤシライス', difficulty: 'normal' },
  { category: '食べ物', villager: '寿司', werewolf: '刺身', difficulty: 'normal' },
  { category: '食べ物', villager: 'ピザ', werewolf: 'キッシュ', difficulty: 'normal' },
  { category: '食べ物', villager: 'たこ焼き', werewolf: 'お好み焼き', difficulty: 'easy' },
  { category: '食べ物', villager: 'おにぎり', werewolf: 'おむすび', difficulty: 'hard' },
  { category: '食べ物', villager: 'ケーキ', werewolf: 'パンケーキ', difficulty: 'normal' },
  { category: '食べ物', villager: 'アイスクリーム', werewolf: 'かき氷', difficulty: 'easy' },
  
  // 動物
  { category: '動物', villager: '犬', werewolf: '猫', difficulty: 'easy' },
  { category: '動物', villager: 'ライオン', werewolf: 'トラ', difficulty: 'normal' },
  { category: '動物', villager: 'ペンギン', werewolf: 'アザラシ', difficulty: 'normal' },
  { category: '動物', villager: 'ウサギ', werewolf: 'ハムスター', difficulty: 'normal' },
  { category: '動物', villager: 'キリン', werewolf: 'シマウマ', difficulty: 'easy' },
  { category: '動物', villager: 'イルカ', werewolf: 'クジラ', difficulty: 'normal' },
  { category: '動物', villager: 'パンダ', werewolf: 'シロクマ', difficulty: 'easy' },
  { category: '動物', villager: 'カラス', werewolf: 'ハト', difficulty: 'normal' },
  { category: '動物', villager: '金魚', werewolf: '鯉', difficulty: 'hard' },
  { category: '動物', villager: 'ゴリラ', werewolf: 'チンパンジー', difficulty: 'hard' },
  
  // 乗り物
  { category: '乗り物', villager: '電車', werewolf: '地下鉄', difficulty: 'hard' },
  { category: '乗り物', villager: '飛行機', werewolf: 'ヘリコプター', difficulty: 'easy' },
  { category: '乗り物', villager: '自転車', werewolf: 'バイク', difficulty: 'easy' },
  { category: '乗り物', villager: 'バス', werewolf: 'タクシー', difficulty: 'normal' },
  { category: '乗り物', villager: '船', werewolf: 'ボート', difficulty: 'normal' },
  { category: '乗り物', villager: '新幹線', werewolf: '特急列車', difficulty: 'hard' },
  { category: '乗り物', villager: 'トラック', werewolf: 'バン', difficulty: 'hard' },
  
  // スポーツ
  { category: 'スポーツ', villager: 'サッカー', werewolf: 'フットサル', difficulty: 'hard' },
  { category: 'スポーツ', villager: '野球', werewolf: 'ソフトボール', difficulty: 'hard' },
  { category: 'スポーツ', villager: 'バスケットボール', werewolf: 'バレーボール', difficulty: 'normal' },
  { category: 'スポーツ', villager: 'テニス', werewolf: 'バドミントン', difficulty: 'normal' },
  { category: 'スポーツ', villager: '水泳', werewolf: 'ダイビング', difficulty: 'normal' },
  { category: 'スポーツ', villager: 'スキー', werewolf: 'スノーボード', difficulty: 'easy' },
  { category: 'スポーツ', villager: 'ボクシング', werewolf: 'レスリング', difficulty: 'normal' },
  
  // 場所・建物
  { category: '場所', villager: '学校', werewolf: '塾', difficulty: 'normal' },
  { category: '場所', villager: '病院', werewolf: '歯医者', difficulty: 'normal' },
  { category: '場所', villager: 'コンビニ', werewolf: 'スーパー', difficulty: 'easy' },
  { category: '場所', villager: '映画館', werewolf: '劇場', difficulty: 'normal' },
  { category: '場所', villager: '公園', werewolf: '庭', difficulty: 'hard' },
  { category: '場所', villager: '図書館', werewolf: '本屋', difficulty: 'easy' },
  { category: '場所', villager: '海', werewolf: 'プール', difficulty: 'easy' },
  { category: '場所', villager: '山', werewolf: '丘', difficulty: 'hard' },
  { category: '場所', villager: '城', werewolf: '神社', difficulty: 'normal' },
  
  // 日用品・道具
  { category: '日用品', villager: '鉛筆', werewolf: 'シャーペン', difficulty: 'hard' },
  { category: '日用品', villager: '箸', werewolf: 'フォーク', difficulty: 'easy' },
  { category: '日用品', villager: 'コップ', werewolf: 'マグカップ', difficulty: 'hard' },
  { category: '日用品', villager: '傘', werewolf: '日傘', difficulty: 'hard' },
  { category: '日用品', villager: '時計', werewolf: '砂時計', difficulty: 'normal' },
  { category: '日用品', villager: 'メガネ', werewolf: 'サングラス', difficulty: 'easy' },
  { category: '日用品', villager: '椅子', werewolf: 'ソファ', difficulty: 'normal' },
  { category: '日用品', villager: 'テレビ', werewolf: 'パソコン', difficulty: 'easy' },
  
  // 自然・天気
  { category: '自然', villager: '太陽', werewolf: '月', difficulty: 'easy' },
  { category: '自然', villager: '雨', werewolf: '雪', difficulty: 'easy' },
  { category: '自然', villager: '虹', werewolf: 'オーロラ', difficulty: 'hard' },
  { category: '自然', villager: '花火', werewolf: '流れ星', difficulty: 'normal' },
  { category: '自然', villager: '桜', werewolf: '梅', difficulty: 'hard' },
  { category: '自然', villager: 'ひまわり', werewolf: 'たんぽぽ', difficulty: 'normal' },
  
  // 人・職業
  { category: '人', villager: '医者', werewolf: '看護師', difficulty: 'normal' },
  { category: '人', villager: '警察官', werewolf: '消防士', difficulty: 'easy' },
  { category: '人', villager: 'コック', werewolf: 'パティシエ', difficulty: 'hard' },
  { category: '人', villager: 'サンタクロース', werewolf: '雪だるま', difficulty: 'easy' },
  { category: '人', villager: '王様', werewolf: '王子様', difficulty: 'hard' },
  { category: '人', villager: '忍者', werewolf: '侍', difficulty: 'easy' },
  
  // 季節・イベント
  { category: 'イベント', villager: 'クリスマス', werewolf: 'お正月', difficulty: 'easy' },
  { category: 'イベント', villager: '誕生日', werewolf: '結婚式', difficulty: 'normal' },
  { category: 'イベント', villager: 'ハロウィン', werewolf: 'お祭り', difficulty: 'normal' },
  { category: 'イベント', villager: '花見', werewolf: '紅葉狩り', difficulty: 'hard' },
  { category: 'イベント', villager: '運動会', werewolf: '文化祭', difficulty: 'normal' },
  
  // エンタメ
  { category: 'エンタメ', villager: 'ギター', werewolf: 'ベース', difficulty: 'hard' },
  { category: 'エンタメ', villager: 'ピアノ', werewolf: 'オルガン', difficulty: 'hard' },
  { category: 'エンタメ', villager: 'ゲーム', werewolf: 'パズル', difficulty: 'normal' },
  { category: 'エンタメ', villager: '映画', werewolf: 'ドラマ', difficulty: 'hard' },
  { category: 'エンタメ', villager: 'マジック', werewolf: 'サーカス', difficulty: 'normal' },
];


// ========== インポスター用お題 ==========

export const IMPOSTOR_PROMPTS: ImpostorPrompt[] = [
  // 食べ物
  {
    category: '食べ物',
    answer: 'カレーライス',
    decoys: ['ハンバーグ', 'オムライス', '唐揚げ', 'コロッケ'],
    difficulty: 'easy',
  },
  {
    category: '食べ物',
    answer: 'ラーメン',
    decoys: ['うどん', 'そば', 'パスタ', '焼きそば'],
    difficulty: 'easy',
  },
  {
    category: '食べ物',
    answer: 'ピザ',
    decoys: ['グラタン', 'ドリア', 'ラザニア', 'リゾット'],
    difficulty: 'normal',
  },
  {
    category: '食べ物',
    answer: 'ケーキ',
    decoys: ['プリン', 'シュークリーム', 'ドーナツ', 'マカロン'],
    difficulty: 'easy',
  },
  {
    category: '食べ物',
    answer: '寿司',
    decoys: ['刺身', '天ぷら', '焼き魚', '煮魚'],
    difficulty: 'normal',
  },
  
  // 動物
  {
    category: '動物',
    answer: 'ライオン',
    decoys: ['トラ', 'ヒョウ', 'チーター', 'ジャガー'],
    difficulty: 'hard',
  },
  {
    category: '動物',
    answer: 'ペンギン',
    decoys: ['アザラシ', 'オットセイ', 'セイウチ', 'ラッコ'],
    difficulty: 'normal',
  },
  {
    category: '動物',
    answer: '象',
    decoys: ['キリン', 'カバ', 'サイ', 'シマウマ'],
    difficulty: 'easy',
  },
  {
    category: '動物',
    answer: '猫',
    decoys: ['犬', 'ウサギ', 'ハムスター', 'フェレット'],
    difficulty: 'easy',
  },
  {
    category: '動物',
    answer: 'イルカ',
    decoys: ['クジラ', 'シャチ', 'アシカ', 'マンタ'],
    difficulty: 'normal',
  },
  
  // 乗り物
  {
    category: '乗り物',
    answer: '飛行機',
    decoys: ['ヘリコプター', 'ロケット', '気球', 'グライダー'],
    difficulty: 'easy',
  },
  {
    category: '乗り物',
    answer: '電車',
    decoys: ['バス', 'タクシー', 'トラム', 'モノレール'],
    difficulty: 'normal',
  },
  {
    category: '乗り物',
    answer: '船',
    decoys: ['ボート', 'ヨット', 'フェリー', 'カヌー'],
    difficulty: 'normal',
  },
  
  // スポーツ
  {
    category: 'スポーツ',
    answer: 'サッカー',
    decoys: ['バスケ', 'バレー', 'ラグビー', 'ハンドボール'],
    difficulty: 'easy',
  },
  {
    category: 'スポーツ',
    answer: '野球',
    decoys: ['ゴルフ', 'テニス', 'バドミントン', '卓球'],
    difficulty: 'easy',
  },
  {
    category: 'スポーツ',
    answer: '水泳',
    decoys: ['ダイビング', 'サーフィン', 'ウォーターポロ', 'シンクロ'],
    difficulty: 'normal',
  },
  
  // 場所
  {
    category: '場所',
    answer: '学校',
    decoys: ['図書館', '公園', 'ショッピングモール', '博物館'],
    difficulty: 'easy',
  },
  {
    category: '場所',
    answer: '病院',
    decoys: ['薬局', '老人ホーム', '保健室', 'クリニック'],
    difficulty: 'normal',
  },
  {
    category: '場所',
    answer: '遊園地',
    decoys: ['動物園', '水族館', 'プール', '映画館'],
    difficulty: 'easy',
  },
  
  // 日用品
  {
    category: '日用品',
    answer: 'スマートフォン',
    decoys: ['タブレット', 'パソコン', 'ゲーム機', 'リモコン'],
    difficulty: 'easy',
  },
  {
    category: '日用品',
    answer: '傘',
    decoys: ['帽子', 'マフラー', '手袋', 'サングラス'],
    difficulty: 'easy',
  },
  {
    category: '日用品',
    answer: '時計',
    decoys: ['カレンダー', '体重計', '温度計', 'タイマー'],
    difficulty: 'normal',
  },
  
  // 自然
  {
    category: '自然',
    answer: '桜',
    decoys: ['バラ', 'チューリップ', 'ひまわり', 'あじさい'],
    difficulty: 'normal',
  },
  {
    category: '自然',
    answer: '山',
    decoys: ['川', '海', '湖', '森'],
    difficulty: 'easy',
  },
  {
    category: '自然',
    answer: '雷',
    decoys: ['雨', '雪', '台風', '竜巻'],
    difficulty: 'normal',
  },
  
  // イベント
  {
    category: 'イベント',
    answer: 'クリスマス',
    decoys: ['ハロウィン', 'イースター', 'バレンタイン', '七夕'],
    difficulty: 'easy',
  },
  {
    category: 'イベント',
    answer: '運動会',
    decoys: ['文化祭', '遠足', '修学旅行', '卒業式'],
    difficulty: 'normal',
  },
];


// ========== お題選出関数 ==========

/**
 * カテゴリでフィルタリング
 */
function filterByCategory<T extends { category: string }>(
  prompts: T[],
  selectedCategories?: string[]
): T[] {
  if (!selectedCategories || selectedCategories.length === 0) {
    return prompts;
  }
  return prompts.filter(p => selectedCategories.includes(p.category));
}

/**
 * 難易度でフィルタリング
 */
function filterByDifficulty<T extends { difficulty: string }>(
  prompts: T[],
  difficulty?: 'easy' | 'normal' | 'hard'
): T[] {
  if (!difficulty || difficulty === 'normal') {
    return prompts;
  }
  
  if (difficulty === 'easy') {
    return prompts.filter(p => p.difficulty === 'easy' || p.difficulty === 'normal');
  }
  
  // hard: 全部含む
  return prompts;
}

/**
 * ランダムに1つ選ぶ
 */
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * 配列をシャッフル
 */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 人狼モード用のお題ペアを取得
 */
export function getWerewolfPromptPair(
  type: 'wordwolf' | 'impostor',
  selectedCategories?: string[],
  difficulty?: 'easy' | 'normal' | 'hard'
): PromptResult {
  if (type === 'wordwolf') {
    // ワードウルフモード
    let prompts = filterByCategory(WORDWOLF_PROMPTS, selectedCategories);
    prompts = filterByDifficulty(prompts, difficulty);
    
    if (prompts.length === 0) {
      prompts = WORDWOLF_PROMPTS;
    }
    
    const pair = pickRandom(prompts);
    
    return {
      category: pair.category,
      villagerPrompt: pair.villager,
      werewolfPrompt: pair.werewolf,
      choices: [],
    };
  } else {
    // インポスターモード
    let prompts = filterByCategory(IMPOSTOR_PROMPTS, selectedCategories);
    prompts = filterByDifficulty(prompts, difficulty);
    
    if (prompts.length === 0) {
      prompts = IMPOSTOR_PROMPTS;
    }
    
    const prompt = pickRandom(prompts);
    
    // 選択肢をシャッフル（正解を含む）
    const choices = shuffle([prompt.answer, ...prompt.decoys]);
    
    return {
      category: prompt.category,
      villagerPrompt: prompt.answer,
      werewolfPrompt: null,
      choices,
    };
  }
}

/**
 * カテゴリ一覧を取得
 */
export function getWerewolfCategories(): string[] {
  const categories = new Set<string>();
  
  WORDWOLF_PROMPTS.forEach(p => categories.add(p.category));
  IMPOSTOR_PROMPTS.forEach(p => categories.add(p.category));
  
  return Array.from(categories).sort();
}

/**
 * お題の選択肢を取得（インポスターモード用）
 */
export function getPromptChoices(roomId: string): string[] {
  // 実際の実装ではWerewolfStateから取得する
  // ここでは型定義のみ
  return [];
}
```


## 3. お題の追加ガイドライン

### ワードウルフ用お題ペアの基準
1. **描くと似てしまう**: 同じカテゴリで形状や特徴が似ている
2. **共通点が多い**: 両方に当てはまる関連イメージがある
3. **微妙な違い**: 決定的に違う特徴が1つはある

#### 良い例
- ラーメン / うどん（麺、丼、スープ → 麺の形状が違う）
- ライオン / トラ（大型猫科、肉食 → たてがみ or 縞模様）

#### 悪い例
- りんご / 車（全く違いすぎる）
- 犬 / 犬種（同じものになってしまう）

### インポスター用お題の基準
1. **明確に描ける**: お題を見たら何を描くべきかわかる
2. **ダミーとの差別化**: ダミーと混同しやすいがギリギリ区別可能
3. **ジャンルの統一感**: ダミーは全て同カテゴリから選ぶ


## 4. 今後の拡張

### お題の動的追加
将来的にはユーザーがお題を追加できる仕組みを検討。

```typescript
interface CustomPrompt {
  id: string;
  type: 'wordwolf' | 'impostor';
  createdBy: string;
  category: string;
  // ...
}
```

### 難易度の自動調整
ゲーム結果をもとに難易度を自動調整する仕組み。

- 人狼が頻繁に当てられる → お題をより似たものにする
- 人狼が全然バレない → お題をより違うものにする


## 実装チェックリスト

- [ ] werewolfPrompts.ts 新規作成
- [ ] ワードウルフ用お題ペア 50件以上
- [ ] インポスター用お題 30件以上
- [ ] カテゴリフィルタリング機能
- [ ] 難易度フィルタリング機能
- [ ] getWerewolfPromptPair関数
- [ ] getWerewolfCategories関数
- [ ] 設定UIでのカテゴリ選択対応

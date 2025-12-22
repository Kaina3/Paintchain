export function isHiraganaOnly(text: string): boolean {
  // ひらがなと長音「ー」のみを許可
  return /^[\u3041-\u3096ー]+$/.test(text);
}

export function convertSmallToLarge(char: string): string {
  const smallToLarge: Record<string, string> = {
    'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
    'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'っ': 'つ',
    'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
    'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ッ': 'ツ',
  };
  return smallToLarge[char] || char;
}

export function getLastCharacter(word: string): string {
  let lastChar = word.slice(-1);

  // Use the previous character when ending with ん or ー
  if (lastChar === 'ん' || lastChar === 'ー') {
    lastChar = word.slice(-2, -1);
  }

  return convertSmallToLarge(lastChar);
}

export function getFirstCharacter(word: string): string {
  const firstChar = word.slice(0, 1);
  return convertSmallToLarge(firstChar);
}

export function removeDakuten(char: string): string {
  const dakutenMap: Record<string, string> = {
    'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け', 'ご': 'こ',
    'ざ': 'さ', 'じ': 'し', 'ず': 'す', 'ぜ': 'せ', 'ぞ': 'そ',
    'だ': 'た', 'ぢ': 'ち', 'づ': 'つ', 'で': 'て', 'ど': 'と',
    'ば': 'は', 'び': 'ひ', 'ぶ': 'ふ', 'べ': 'へ', 'ぼ': 'ほ',
    'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
    'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
    'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
    'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
    'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
    'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ',
  };
  return dakutenMap[char] || char;
}

export function normalizeKana(char: string): string {
  return char.normalize('NFKC').replace(/[\u30A1-\u30F6]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });
}

export function isConnected(prevAnswer: string, currentAnswer: string): boolean {
  const lastChar = getLastCharacter(prevAnswer);
  const firstChar = getFirstCharacter(currentAnswer);

  if (normalizeKana(lastChar) === normalizeKana(firstChar)) return true;

  const lastBase = removeDakuten(lastChar);
  const firstBase = removeDakuten(firstChar);
  return normalizeKana(lastBase) === normalizeKana(firstBase);
}

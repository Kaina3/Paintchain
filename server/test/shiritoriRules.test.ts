import { describe, expect, it } from 'vitest';
import { isConnected, isHiraganaOnly, getLastCharacter } from '../src/application/gameModes/shiritoriRules.js';

describe('shiritoriRules', () => {
  it('accepts hiragana and prolonged sound mark', () => {
    expect(isHiraganaOnly('らーめん')).toBe(true);
  });

  it('rejects mixed scripts', () => {
    expect(isHiraganaOnly('ラーメン')).toBe(false);
  });

  it('connects words with dakuten normalization', () => {
    expect(isConnected('いちご', 'こあら')).toBe(true);
  });

  it('uses previous char when word ends with ん', () => {
    expect(getLastCharacter('らーめん')).toBe('め');
  });
});

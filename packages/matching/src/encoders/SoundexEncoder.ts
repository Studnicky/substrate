import { NON_ASCII_LETTER } from '../constants/NON_ASCII_LETTER.js';
import { StringNormalizer } from '../normalizers/StringNormalizer.js';

export class SoundexEncoder {
  static encode(value: string): string {
    const normalized = StringNormalizer.normalize(value).replace(NON_ASCII_LETTER, '');
    const first = normalized.at(0);
    if (first === undefined) {
      return '';
    }
    const codeByCharacter: Record<string, string> = {
      'b': '1', 'c': '2', 'd': '3', 'f': '1', 'g': '2', 'h': '', 'j': '2', 'k': '2', 'l': '4', 'm': '5', 'n': '5', 'p': '1', 'q': '2', 'r': '6', 's': '2', 't': '3', 'v': '1', 'w': '', 'x': '2', 'y': '', 'z': '2'
    };
    let previous = codeByCharacter[first] ?? '';
    let digits = '';
    for (const character of normalized.slice(1)) {
      const current = codeByCharacter[character] ?? '';
      if (current !== '' && current !== previous) {
        digits += current;
      }
      previous = current;
      if (digits.length === 3) {
        break;
      }
    }
    return `${first.toUpperCase()}${digits.padEnd(3, '0')}`;
  }
}

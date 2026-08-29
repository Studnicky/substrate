import { INITIAL_WH } from '../constants/INITIAL_WH.js';
import { INITIAL_X } from '../constants/INITIAL_X.js';
import { NON_ASCII_LETTER } from '../constants/NON_ASCII_LETTER.js';
import { REPEATED_CHARACTER } from '../constants/REPEATED_CHARACTER.js';
import { SILENT_INITIAL } from '../constants/SILENT_INITIAL.js';
import { StringNormalizer } from '../normalizers/StringNormalizer.js';

export class MetaphoneEncoder {
  static encode(value: string): string {
    let source = StringNormalizer.normalize(value).replace(NON_ASCII_LETTER, '');
    if (source.length === 0) {
      return '';
    }
    source = source.replace(SILENT_INITIAL, (match): string => {
      const result = match.slice(1);
      return result;
    });
    source = source.replace(INITIAL_X, 's').replace(INITIAL_WH, 'w');
    const result: string[] = [];
    let index = 0;
    while (index < source.length) {
      const character = source[index];
      const next = source[index + 1] ?? '';
      const previous = source[index - 1] ?? '';
      const pair = `${character ?? ''}${next}`;
      if (character === undefined) {
        break;
      }
      if ('aeiou'.includes(character)) {
        if (index === 0) {
          result.push(character);
        }
      } else if (character === 'b') {
        if (!(previous === 'm' && index === source.length - 1)) { result.push('b'); }
      } else if (character === 'c') {
        if (pair === 'ch') { result.push('x'); index += 1; }
        else if (pair === 'ci' || pair === 'ce' || pair === 'cy') { result.push('s'); index += 1; }
        else { result.push('k'); }
      } else if (character === 'd') {
        if (pair === 'dg' && 'eiy'.includes(source[index + 2] ?? '')) { result.push('j'); index += 2; }
        else { result.push('t'); }
      } else if (character === 'g') {
        if (pair === 'gh') { index += 1; }
        else if (pair === 'gn') { index += 1; }
        else if ('eiy'.includes(next)) { result.push('j'); }
        else { result.push('k'); }
      } else if (character === 'h') {
        if ('aeiou'.includes(previous) && 'aeiou'.includes(next)) { result.push('h'); }
      } else if (character === 'k') {
        if (previous !== 'c') { result.push('k'); }
      } else if (character === 'p') {
        if (next === 'h') { result.push('f'); index += 1; } else { result.push('p'); }
      } else if (character === 'q') { result.push('k'); }
      else if (character === 's') {
        if (pair === 'sh') { result.push('x'); index += 1; }
        else if (source.slice(index, index + 3) === 'sio' || source.slice(index, index + 3) === 'sia') { result.push('x'); index += 2; }
        else { result.push('s'); }
      } else if (character === 't') {
        if (pair === 'th') { result.push('0'); index += 1; }
        else if (source.slice(index, index + 3) === 'tia' || source.slice(index, index + 3) === 'tio') { result.push('x'); index += 2; }
        else if (pair !== 'tch') { result.push('t'); }
      } else if (character === 'v') { result.push('f'); }
      else if (character === 'w' || character === 'y') {
        if ('aeiou'.includes(next)) { result.push(character); }
      } else if (character === 'x') { result.push('ks'); }
      else if (character === 'z') { result.push('s'); }
      else { result.push(character); }
      index += 1;
    }
    const encoded = result.join('').replace(REPEATED_CHARACTER, '$1').toUpperCase();
    return encoded;
  }
}

import { doubleMetaphone } from 'double-metaphone';

import { StringNormalizer } from '../normalizers/StringNormalizer.js';

export class DoubleMetaphoneEncoder {
  static encode(value: string): readonly string[] {
    const source = StringNormalizer.normalize(value);
    const result = source.length === 0 ? [] : doubleMetaphone(source);
    return result;
  }
}

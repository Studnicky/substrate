import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';

export class StringNormalizer {
  static normalize(value: string, options: { 'caseSensitive'?: boolean; 'trim'?: boolean } = {}): string {
    if (!Predicates.isString(value)) {
      throw RuntimeError.create('StringNormalizer requires a string value.');
    }
    const unicode = value.normalize('NFKC');
    const trimmed = options.trim === false ? unicode : unicode.trim();
    const result = options.caseSensitive === true ? trimmed : trimmed.toLowerCase();
    return result;
  }
}

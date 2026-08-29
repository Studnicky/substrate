import { TOKEN_BOUNDARY } from '../constants/TOKEN_BOUNDARY.js';
import { StringNormalizer } from '../normalizers/StringNormalizer.js';

export class TokenExtractor {
  static extract(value: string): readonly string[] {
    const normalized = StringNormalizer.normalize(value);
    const tokens = normalized.split(TOKEN_BOUNDARY).filter((token) => {
      const isPresent = token.length > 0;
      return isPresent;
    });
    return tokens;
  }
}

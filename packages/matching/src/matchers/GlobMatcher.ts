import { LruCache } from '@studnicky/cache';
import { Predicates } from '@studnicky/types';
import picomatch from 'picomatch';

export class GlobMatcher {
  private static readonly matchers = LruCache.create<string, (value: string) => boolean>({ 'capacity': 256 });

  static matches(pattern: string, value: string): boolean {
    if (!Predicates.isString(pattern) || !Predicates.isString(value)) {
      throw new TypeError('GlobMatcher requires string pattern and value inputs.');
    }
    if (pattern === value) {
      return true;
    }
    const matcher = GlobMatcher.matchers.get(pattern) ?? GlobMatcher.createMatcher(pattern);
    const result = matcher(value);
    return result;
  }

  private static createMatcher(pattern: string): (value: string) => boolean {
    const matcher = picomatch(pattern);
    GlobMatcher.matchers.set(pattern, matcher);
    return matcher;
  }
}

import type { HasRegexMetaCharacterType } from './HasRegexMetaCharacterType.js';
import type { StripPatternAnchorsType } from './StripPatternAnchorsType.js';

/**
 * A `patternProperties` key soundly derivable as a template-literal key: an anchored
 * literal-ish body with no remaining regex metacharacters. Any other pattern (true
 * alternation, character classes, unanchored bodies) resolves to `never` — the caller
 * folds that into `Record<never, X>`, which is `{}`, a safe no-op fallback.
 */
export type PatternPropertyKeyType<TPattern extends string> = StripPatternAnchorsType<TPattern> extends {
  'anchoring': infer TAnchoring;
  'body': infer TBody extends string;
}
  ? HasRegexMetaCharacterType<TBody> extends true
    ? never
    : TAnchoring extends 'both'
      ? TBody
      : TAnchoring extends 'prefix'
        ? `${TBody}${string}`
        : TAnchoring extends 'suffix'
          ? `${string}${TBody}`
          : never
  : never;

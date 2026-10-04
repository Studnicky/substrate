/** Bounded per-character scan of a short pattern-body literal, not a walk over schema nesting. */
export type HasRegexMetaCharacterType<TBody extends string>
  = TBody extends `${infer THead}${infer TRest}`
    ? THead extends '.' | '*' | '+' | '?' | '(' | ')' | '[' | ']' | '{' | '}' | '|' | '\\' | '^' | '$'
      ? true
      : HasRegexMetaCharacterType<TRest>
    : false;

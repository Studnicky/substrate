/** Splits a `pattern` literal into its anchoring and the literal body between the anchors. */
export type StripPatternAnchorsType<TPattern extends string>
  = TPattern extends `^${infer TBody}$`
    ? { 'anchoring': 'both'; 'body': TBody }
    : TPattern extends `^${infer TBody}`
      ? { 'anchoring': 'prefix'; 'body': TBody }
      : TPattern extends `${infer TBody}$`
        ? { 'anchoring': 'suffix'; 'body': TBody }
        : { 'anchoring': 'none'; 'body': TPattern };

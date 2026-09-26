// Must stay an `interface`. A PostToolUse formatter has repeatedly rewritten this
// declaration into a `type` alias, which then trips this repo's own
// `type-alias-invariants` rule. If you find it as a `type`, restore it.
export interface CallabilityFlagsInterface {
  readonly 'hasCallable': boolean;
  readonly 'hasData': boolean;
}

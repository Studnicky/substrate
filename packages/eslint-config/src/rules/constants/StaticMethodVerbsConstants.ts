/** Data constants for the `static-method-verbs` rule: the default detection mode and the triviality options used by the `structural`-mode exemption check. */

export const DEFAULT_MODE = 'structural';

export const TRIVIAL_OPTIONS: Readonly<{ 'allowLiterals': boolean; 'allowMemberExpressions': boolean }> = {
  'allowLiterals': false,
  'allowMemberExpressions': false
};

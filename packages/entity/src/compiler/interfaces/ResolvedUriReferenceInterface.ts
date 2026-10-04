/** A URI-reference resolved against a base URI: the base (no fragment) and the fragment (no leading `#`). */
export interface ResolvedUriReferenceInterface {
  readonly 'base': string;
  readonly 'fragment': string;
}

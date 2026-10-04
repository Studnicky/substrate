/**
 * Consumer-augmentable ambient registry mapping a schema `$id` to its derived
 * type. Empty by default (declaration-merge target only) — an unaugmented
 * `$ref` resolves to `ReferenceNotFoundType` rather than a silent `unknown`.
 * The brand member is a `unique symbol` so it can never collide with a
 * consumer's `$id`-keyed entry.
 */
export interface EntityReferenceRegistryInterface {
  readonly 'entityReferenceRegistryBrand'?: unique symbol;
}

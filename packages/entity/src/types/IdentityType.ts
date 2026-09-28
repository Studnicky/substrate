/**
 * Homomorphic identity mapped type: structurally identical to `T`, but its own
 * AST shape is a mapped type. Wrapping a phantom-brand literal in this type
 * keeps a generic brand alias classified as a type-level function under
 * `type-alias-invariants` rather than as inline contract evidence.
 *
 * @module
 */
export type IdentityType<T> = { [K in keyof T]: T[K] };

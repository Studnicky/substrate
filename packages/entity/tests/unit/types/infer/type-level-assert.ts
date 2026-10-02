/**
 * True iff `X` and `Y` are the same type in both directions — not merely mutually assignable.
 * The probe signatures carry a value parameter so each compared function type uses its type
 * parameter in more than one position; the identity semantics are unchanged.
 */
export type EqualType<X, Y> = (<T>(value?: T) => T extends X ? 1 : 2) extends (<T>(value?: T) => T extends Y ? 1 : 2) ? true : false;

/** True iff a value of type `A` is usable where `B` is expected. */
export type IsAssignableType<A, B> = A extends B ? true : false;

/** Inverts a type-level boolean. */
export type NotType<T extends boolean> = T extends true ? false : true;

/** Compiles only when `T` is the literal type `true` — the type-level half of an assertion. */
export type AssertType<T extends true> = T extends true ? true : never;

/** Compiles only when `T` is the literal type `false` — the negative half of an assertion. */
export type RefuteType<T extends false> = T extends false ? false : never;

/**
 * True exactly when `K` is optional on `T` — reliable regardless of `T[K]`'s own value type,
 * unlike an `undefined`-assignability check (which false-negatives against a value type of `unknown`).
 */
export type IsOptionalKeyType<T, K extends keyof T> = Record<never, never> extends Pick<T, K> ? true : false;

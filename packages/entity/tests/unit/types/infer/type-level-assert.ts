/** True iff `X` and `Y` are the same type in both directions — not merely mutually assignable. */
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

/** True iff a value of type `A` is usable where `B` is expected. */
export type IsAssignable<A, B> = A extends B ? true : false;

/** Inverts a type-level boolean. */
export type Not<T extends boolean> = T extends true ? false : true;

/** Compiles only when `T` is the literal type `true` — the type-level half of an assertion. */
export type Assert<T extends true> = T;

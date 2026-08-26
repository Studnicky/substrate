# Callable contract interfaces and `@typescript-eslint/prefer-function-type`

`type-alias-invariants` requires callable contracts to use interfaces. `@typescript-eslint/prefer-function-type` can object when such an interface contains only a call signature.

Use an optional unique-symbol brand member to make the interface a contract with an explicit nominal marker:

<!-- inline-ts-ok: consumer-side illustration of the brand-member pattern -->
```ts
export interface LoaderInterface {
  (iri: string): Promise<string | null>;
  readonly 'loaderBrand'?: unique symbol;
}
```

The optional member does not require a function value to carry the property, while the interface remains a callable contract. `type-alias-invariants` accepts the interface form, and the additional member means `prefer-function-type` does not see an interface containing only a call signature.

This is a consumer-side declaration pattern, not a rule configuration requirement.

# `type-alias-invariants` and branded primitives

An intersection of a phantom brand and a bare primitive is a contract shape under `type-alias-invariants`:

<!-- inline-ts-ok: consumer-side illustration of the branded-primitive idiom -->
```ts
declare const FORMAT: unique symbol;
type FormatBrandType<TF extends string> = { readonly [FORMAT]: TF };

type EmailBrandType = FormatBrandType<'email'> & string;
```

The rule reports this alias as a contract and its interface remedy cannot represent an interface that extends `string`. A boxed interface is the lint-compliant representation:

<!-- inline-ts-ok: consumer-side illustration of the boxed-wrapper representation -->
```ts
interface EmailBrandInterface {
  readonly value: string;
  readonly [FORMAT]: 'email';
}
```

Boxing changes the runtime representation from a primitive to an object. Consumers that require primitive-branded values need to account for this design constraint before enabling the rule.

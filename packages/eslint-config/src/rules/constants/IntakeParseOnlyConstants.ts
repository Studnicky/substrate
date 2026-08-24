/**
 * Data constants shared by the `intake-parse-only` and `no-unparsed-assertion` rules:
 * the default exempt package names and the entity member that accepts unparsed input.
 * Both rules police the same boundary from opposite sides — one the parameter that
 * receives unparsed data, the other the assertion that fakes having parsed it — so
 * they must exempt the same packages or the boundary is inconsistent.
 *
 * Exemptions rationale:
 *   - `@studnicky/types`: Narrowing primitives every parser is built from (e.g. `Guard.isObject`).
 *   - `@studnicky/eslint-config`: Operates on foreign ESLint and TypeScript AST nodes.
 *   - `@studnicky/predicates`: Type predicates, coercion, and matching machinery (e.g. `coerceValue`) that parsing depends on; requiring intake here is circular.
 *   - `@studnicky/intake-kit`: The generic `{create, intake}` compile orchestration and cycle-safe
 *     clone primitives every entity's `intake` is built from (see `IntakeCompiler`,
 *     `BoundaryCycleGuard`). An engine cannot be required to go through the boundary it exists to
 *     implement, for the same reason `@studnicky/predicates` is exempt.
 */

export const DEFAULT_EXEMPT_PACKAGES = [
  '@studnicky/types',
  '@studnicky/eslint-config',
  '@studnicky/predicates',
  '@studnicky/intake-kit'
];

export const INTAKE_MEMBER = 'intake';

/**
 * Default `structuralProperties` for `OpaqueValueShape`: non-called reads that belong to a fixed
 * JS/DOM built-in surface rather than an application-defined schema field, so reading one during a
 * generic value walk isn't trusting a shape `intake` would need to validate — `.length`/`.size`
 * (`Array`/`String`/`Map`/`Set`), `.buffer`/`.byteOffset`/`.byteLength` (`ArrayBufferView`), and
 * `.then` (the thenable protocol). This is THIS PACKAGE'S OWN vocabulary, not an exhaustive list —
 * a consumer working with `Blob`, `FormData`, `URL`, or their own non-schema value types passes
 * their own `structuralProperties` array (which replaces, not merges with, this default) to name
 * whatever built-in surface their code reads the same way.
 */
export const DEFAULT_STRUCTURAL_PROPERTIES = ['buffer', 'byteLength', 'byteOffset', 'length', 'size', 'then'];

/** Data constants shared by the `intake-parse-only` and `no-unparsed-assertion` rules: the default exempt package names and the entity member that accepts unparsed input. Both rules police the same boundary from opposite sides — one the parameter that receives unparsed data, the other the assertion that fakes having parsed it — so they must exempt the same packages or the boundary is inconsistent. */

export const DEFAULT_EXEMPT_PACKAGES = ['@studnicky/types', '@studnicky/eslint-config'];

export const INTAKE_MEMBER = 'intake';

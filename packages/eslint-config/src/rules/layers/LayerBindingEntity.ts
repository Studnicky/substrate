import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

// ONE RULE, FIVE KINDS, ONE ORDERED LIST.
//
// A layer is resolvable from any of four kinds of unit, not just a directory under
// `sourceRoot` (the hexagonal `src/domain`, `src/adapters` layout this resolver originally
// assumed). `bindings` (see `LayerOptionsEntity`) is the single ordered list every one of
// them is expressed through — evaluated in ARRAY ORDER, first match wins. A config author
// controls precedence directly by where they place an entry, rather than through an implicit
// "most specific wins" heuristic this resolver would have to define and every reader would
// have to learn.
//
// 'folder' and 'package' both match a PATH SEGMENT — the segment immediately after
// `sourceRoot` — by exact equality against `pattern`. They are kept as two distinct `kind`
// values, even though today's matcher treats them identically, because they answer different
// questions for a config author: 'folder' says "this directory under `sourceRoot` IS the
// layer" (`src/domain/` -> `domain`), 'package' says "this workspace package's directory IS
// the layer" (`packages/retry/` -> `coordinator`, `packages/errors/` -> `foundation`) — a flat
// monorepo where the package IS the architectural unit, not a directory inside it. Substrate
// is the latter: no directory inside any one package is named after a band, so 'folder'
// bindings can never match there.
//
// PACKAGE RESOLUTION IS PATH-SEGMENT ONLY, DELIBERATELY NOT `package.json`-READING. A package
// could instead be identified by reading the nearest `package.json`'s `name` field, which
// would also tolerate a directory renamed differently from its declared package name. That is
// not implemented: every other resolution mechanism in this file is a pure string/array
// operation with no filesystem access, callable identically from a real lint run or a unit
// test with a fabricated path, and adding disk I/O to a function invoked per file/per import
// in every lint run trades that for a cost with no offsetting need here — the directory name
// substrate actually uses (`packages/retry`) already matches its package name's own unscoped
// suffix (`@studnicky/retry`). If a project needs package.json-name resolution because its
// directory names diverge from its package names, that is a real, separate capability to add
// to 'package' matching later, not a reason to blend disk I/O into this pass now.
//
// 'module' and 'dependency' both match an IMPORT SPECIFIER by `specifier.startsWith(pattern)`
// — again mechanically identical, again kept distinct for what a config author is declaring:
// 'module' binds an INTERNAL specifier (a path alias like `@domain/`, or a bare workspace
// specifier like `@studnicky/errors`) to a layer; 'dependency' binds an EXTERNAL specifier (an
// npm package like `undici`) to a layer. Folding both into one list is what makes dependency
// boundaries expressible at all — before this, a bare specifier that was not a relative import
// resolved to no layer unconditionally, so "capability code must not import `node:fs`
// directly" had no way to be checked; the entire external dependency surface was invisible to
// every architecture rule built on this resolver.
//
// 'builtin' binds THE WHOLE Node builtin surface as one group, verified through
// `node:module`'s own `isBuiltin` — not a hand-maintained list of module names, and not a
// `node:` prefix check alone (`isBuiltin('fs')` and `isBuiltin('node:fs')` both resolve to
// `true`, so the bare and prefixed spellings need no separate binding). `pattern` plays no
// role for this kind: there is nothing to bind a builtin group MORE narrowly than "is this
// specifier a Node builtin", and a config wanting one specific builtin bound to a different
// layer than the rest already has that expressed as a 'dependency' binding with `pattern:
// 'node:fs'` evaluated ahead of the group binding in the list — the ordered-list precedence
// rule above, not a second mechanism inside 'builtin' itself.
export namespace LayerBindingEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'kind': {
        'description': "'folder': pattern matches a path segment after sourceRoot exactly. 'package': pattern matches a workspace package's directory segment exactly. 'module': pattern is a prefix matched against an internal import specifier. 'dependency': pattern is a prefix matched against an external import specifier. 'builtin': matches every Node builtin module as one group; pattern is unused.",
        'enum': [
          'folder',
          'package',
          'module',
          'dependency',
          'builtin'
        ],
        'type': 'string'
      },
      'layer': {
        'description': 'The layer name this binding resolves a match to. Must be one of the configured `layers` — a binding naming an unconfigured layer never matches, the same as a typo.',
        'type': 'string'
      },
      'pattern': {
        'description': "The path segment (folder/package) or specifier prefix (module/dependency) to match. Unused, and omissible, for kind 'builtin'.",
        'type': 'string'
      }
    },
    'required': [
      'kind',
      'layer'
    ],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  // A binding entry is a closed shape — nothing extends it the way the four `arch/*` rules
  // extend `LayerOptionsEntity.Schema` with their own additional properties, so `validate`
  // compiles `Schema` itself (`additionalProperties: false` and all) rather than a lenient
  // variant. An unrecognized property on a binding entry is a config mistake, not a
  // legitimate superset to tolerate.
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}

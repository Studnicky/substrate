import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { DEFAULT_EXEMPT_PACKAGES, DEFAULT_STRUCTURAL_PROPERTIES } from '../constants/IntakeParseOnlyConstants.js';
import { AstHelpers } from '../shared/astHelpers.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import { ResolvedType } from '../shared/ResolvedType.js';
import { EntityIntake } from './EntityIntake.js';
import { ExemptPackage } from './ExemptPackage.js';
import { OpaqueValueShape } from './OpaqueValueShape.js';

// UNPARSED DATA HAS EXACTLY ONE WAY IN.
//
// Three rules already guarantee that every data shape in this codebase IS an entity:
// `all-types-are-entities` requires each canonical pure-data alias to be an exported
// `*Entity.Type` derived from its own `Schema`, `whole-canonical-types` forbids subsetting one
// positionally, and `folder-content-shape` fixes the members an entity namespace exposes.
//
// What none of them constrains is the DIRECTION IN. Nothing required `unknown` to become an
// entity by passing through one, so it did not: measured before this rule, 483 functions took an
// `unknown` parameter and only 29 of them lived in an entity file.
//
// This rule closes the loop. `unknown` and `any` may appear as a parameter ONLY on an entity
// namespace's `intake` member:
//
//   export namespace LogRecordEntity {
//     export const Schema = { ... } as const satisfies JSONSchema;
//     export type Type = FromSchema<typeof Schema>;
//     export function intake(input: unknown): Type { ... }
//   }
//
//   const record = LogRecordEntity.intake(rawPayload);
//
// Together with the three rules above that reads as: every data shape is an entity, and the only
// way to make one from unparsed input is `Entity.intake`. Therefore no code works with data that
// is not an entity.
//
// WHY MEMBERSHIP AND NOT A DIRECTORY. An earlier revision keyed on an `intake/` role directory.
// The type is the better boundary: it needs no new convention propagated across 43 packages, it
// travels with the schema it parses, and it is enforced wherever the entity is used rather than
// wherever a file happens to sit.
//
// WHY A PARSER AND NOT A PREDICATE. `validate(value: unknown): value is Type` narrows a variable
// in place and produces no value, so nothing a caller holds proves the narrowing happened and
// every downstream site re-checks. `intake` returns a NEW value whose TYPE IS THE PROOF — it
// cannot be obtained without having crossed the boundary.
//
// WHY THE CHECKER AND NOT THE SYNTAX. An earlier revision matched `TSUnknownKeyword` /
// `TSAnyKeyword` annotations directly. That made this boundary bypassable WITHOUT a suppression,
// and it was bypassed: eight parameters across `errors` and `json` were rewritten as
// `unknown extends unknown ? unknown : never` — a conditional type resolving to exactly `unknown`,
// which parses as `TSConditionalType` and so escaped the match. A one-line `type Anything = unknown`
// alias defeats a syntactic check just as easily. Detection now resolves the parameter's real type
// through the TypeScript checker, so how the annotation is spelled stops mattering.
//
// The companion hole is the phantom generic — `f<T>(value: T): string`, a type parameter used once
// in a parameter position and never in the return, semantically identical to `unknown`. The checker
// cannot flag it without also condemning `Clone.deep<T>(value: T): T`, where the generic genuinely
// carries the caller's type through. `@typescript-eslint/no-unnecessary-type-parameters` is enabled
// repo-wide to catch precisely the single-use case. Both checks are required; neither alone closes
// the boundary.
//
// EXEMPT PACKAGES. `@studnicky/types` holds the narrowing primitives, type coercion, and matching
// machinery every parser is built from (`Predicates.isObject`, `JsonObject.is`, `Predicates.coerceValue`,
// and the `as*` helpers that already return a value), so requiring intake there is circular.
// `@studnicky/eslint-config` operates on foreign ESLint and TypeScript AST node shapes rather
// than application data. `@studnicky/intake-kit` is the generic compile-orchestration and clone
// engine every entity's `intake` is built from — same circularity as `@studnicky/types`. None of
// these packages should be forced into application entities. The exemption is by package name so
// it is visible and cannot quietly widen to cover a package that should be parsing.
//
// OPAQUE PARAMETERS. Not every `unknown`/`any` parameter trusts a shape — see
// `OpaqueValueShape` for the decidable, per-parameter check that exempts a value the function
// body only stores, forwards, or walks through a variable key, without ever asserting what it
// contains. The one part of that check with no fixed answer — which non-called property reads
// (`.length`, `.buffer`) belong to a JS/DOM built-in surface rather than an application field —
// is the `structuralProperties` option. It ships this package's own built-in vocabulary as its
// default; a consumer whose code walks a different built-in (`Blob`, `FormData`, a domain
// library) supplies their own array instead of waiting on an upstream release.
//
// PRIVATE HELPERS INSIDE AN ENTITY. `EntityIntake.contains` recognizes more than the literally
// named `intake` member — see its own comment for why a non-exported helper nested in the same
// `*Entity` namespace shares the boundary.

class UntypedParameter {
  /**
   * Returns the first parameter whose RESOLVED type is `unknown` or `any`.
   *
   * Resolution goes through the TypeScript checker rather than the annotation's syntax, so a
   * conditional type or a type alias that evaluates to `unknown` is caught exactly like the bare
   * keyword. See `ResolvedType` for the bypasses this closes and for the one it deliberately
   * leaves to `@typescript-eslint/no-unnecessary-type-parameters`.
   */
  public static find(context: Rule.RuleContext, parameters: readonly unknown[]): Rule.Node | undefined {
    const parameterCount = parameters.length;

    for (let index = 0; index < parameterCount; index += 1) {
      const parameter = parameters[index];

      if (UntypedParameter.#isUntyped(context, parameter)) {
        return parameter as Rule.Node;
      }
    }

    return undefined;
  }

  static #isUntyped(context: Rule.RuleContext, parameter: unknown): boolean {
    if (!ObjectGuard.isObject(parameter)) {
      return false;
    }
    const annotation: unknown = parameter.typeAnnotation;

    if (!ObjectGuard.isObject(annotation)) {
      return false;
    }
    const inner: unknown = annotation.typeAnnotation;

    if (!ObjectGuard.isObject(inner)) {
      return false;
    }
    const result = ResolvedType.isUnparsed(context, inner);

    return result;
  }
}

namespace IntakeParseOnlyOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'exemptPackages': {
        'default': DEFAULT_EXEMPT_PACKAGES,
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'structuralProperties': {
        'default': DEFAULT_STRUCTURAL_PROPERTIES,
        'items': { 'type': 'string' },
        'type': 'array'
      }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}

export const intakeParseOnly: Rule.RuleModule = {
  'create': (context) => {
    const options = IntakeParseOnlyOptionsEntity.intake(context.options.at(0) ?? {});
    const exemptPackages = options.exemptPackages;
    if (ExemptPackage.matches(context.filename, exemptPackages)) {
      return {};
    }
    const structuralProperties = new Set(options.structuralProperties);

    const inspect = (node: Rule.Node): void => {
      const raw = node as unknown as Record<string, unknown>;
      const parameters: unknown = raw.params;

      if (!Array.isArray(parameters)) {
        return;
      }
      const offending = UntypedParameter.find(context, parameters);

      if (offending === undefined) {
        return;
      }
      if (EntityIntake.contains(node)) {
        return;
      }

      const parameterName = AstHelpers.getIdentifierName(offending);
      if (parameterName !== undefined && OpaqueValueShape.isOpaque(node, parameterName, structuralProperties)) {
        return;
      }

      context.report({
        'messageId': 'unparsedOutsideIntake', 'node': offending
      });
    };

    return {
      'ArrowFunctionExpression': inspect,
      'FunctionDeclaration': inspect,
      'FunctionExpression': inspect
    };
  },
  'meta': {
    'docs': {
      'description': "Permit an `unknown` or `any` parameter only on an entity namespace's `intake` member, so unparsed data has one way in.",
      'recommended': false
    },
    'messages': {
      'unparsedOutsideIntake': "An `unknown`/`any` parameter is permitted only on an entity namespace's `intake` member. Parse the input through `SomeEntity.intake(input)` and accept `SomeEntity.Type` here — a value whose type proves it crossed the boundary."
    },
    'schema': [IntakeParseOnlyOptionsEntity.Schema],
    'type': 'problem'
  }
};

import type { Rule } from 'eslint';

import { DEFAULT_EXEMPT_PACKAGES } from '../constants/IntakeParseOnlyConstants.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import { EntityIntake } from './EntityIntake.js';
import { ExemptPackage } from './ExemptPackage.js';

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
// EXEMPT PACKAGES. `@studnicky/types` holds the narrowing primitives every parser is built from
// (`Guard.isObject`, `JsonObject.is`, and the `as*` helpers that already return a value).
// `@studnicky/eslint-config` operates on foreign ESLint and TypeScript AST node shapes rather
// than application data. Neither package should be forced into application entities. The
// exemption is by package name so it is visible and cannot quietly widen to cover a package that
// should be parsing.

class UntypedParameter {
  /** Returns the first parameter annotated `unknown` or `any`, if any. */
  public static find(parameters: readonly unknown[]): Rule.Node | undefined {
    const parameterCount = parameters.length;

    for (let index = 0; index < parameterCount; index += 1) {
      const parameter = parameters[index];

      if (UntypedParameter.#isUntyped(parameter)) {
        return parameter as Rule.Node;
      }
    }

    return undefined;
  }

  static #isUntyped(parameter: unknown): boolean {
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
    const result = inner.type === 'TSUnknownKeyword' || inner.type === 'TSAnyKeyword';

    return result;
  }
}

export const intakeParseOnly: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions: unknown = context.options.at(0);
    const exemptPackages = ObjectGuard.isObject(rawOptions) && Array.isArray(rawOptions.exemptPackages)
      ? rawOptions.exemptPackages.filter((entry): entry is string => {
        const result = typeof entry === 'string';

        return result;
      })
      : DEFAULT_EXEMPT_PACKAGES;
    if (ExemptPackage.matches(context.filename, exemptPackages)) {
      return {};
    }

    const inspect = (node: Rule.Node): void => {
      const raw = node as unknown as Record<string, unknown>;
      const parameters: unknown = raw.params;

      if (!Array.isArray(parameters)) {
        return;
      }
      const offending = UntypedParameter.find(parameters);

      if (offending === undefined) {
        return;
      }
      if (EntityIntake.contains(node)) {
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
    'schema': [
      {
        'additionalProperties': false,
        'properties': { 'exemptPackages': { 'items': { 'type': 'string' }, 'type': 'array' } },
        'type': 'object'
      }
    ],
    'type': 'problem'
  }
};

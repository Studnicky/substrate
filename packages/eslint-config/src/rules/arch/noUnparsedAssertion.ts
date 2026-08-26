import type { Rule } from 'eslint';

import { DEFAULT_EXEMPT_PACKAGES } from '../constants/IntakeParseOnlyConstants.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import { ResolvedType } from '../shared/ResolvedType.js';
import { EntityIntake } from './EntityIntake.js';
import { ExemptPackage } from './ExemptPackage.js';

// UNPARSED DATA CANNOT CLAIM A SHAPE.
//
// `Entity.intake` makes a value's type evidence that parsing happened. An assertion from
// `unknown` or `any` to a named type manufactures that evidence without parsing, reopening the
// boundary that `intake-parse-only` closes.
//
// EXEMPT PACKAGES. `@studnicky/types` provides the narrowing primitives parsers are built from.
// `@studnicky/eslint-config` operates on foreign ESLint and TypeScript AST node shapes, not
// application data; 76 of the repository's 83 assertions describe those foreign shapes. Neither
// package should be forced into application entities.

class AssertionShape {
  public static source(node: Rule.Node): Rule.Node | undefined {
    const raw = node as unknown as Record<string, unknown>;
    const expression: unknown = raw.expression;
    const result = ObjectGuard.isObject(expression) ? expression as unknown as Rule.Node : undefined;
    return result;
  }

  public static hasNamedTarget(node: Rule.Node): boolean {
    const raw = node as unknown as Record<string, unknown>;
    const typeAnnotation: unknown = raw.typeAnnotation;
    const result = ObjectGuard.isObject(typeAnnotation) && typeAnnotation.type === 'TSTypeReference';
    return result;
  }
}

export const noUnparsedAssertion: Rule.RuleModule = {
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
      if (!AssertionShape.hasNamedTarget(node) || EntityIntake.contains(node)) {
        return;
      }

      const source = AssertionShape.source(node);

      if (source === undefined || !ResolvedType.isUnparsed(context, source)) {
        return;
      }

      context.report({ 'messageId': 'unparsedAssertion', 'node': node });
    };

    return { 'TSAsExpression': inspect, 'TSTypeAssertion': inspect };
  },
  'meta': {
    'docs': {
      'description': 'Disallow assertions from `unknown` or `any` to a named type outside an entity namespace’s `intake` member.',
      'recommended': false
    },
    'messages': {
      'unparsedAssertion': 'An `unknown`/`any` value cannot assert a named type. Parse it through `SomeEntity.intake(value)` so the resulting type proves the boundary was crossed.'
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

/**
 * EntityDiagnostics — canonical, engine-neutral schema-validation messages.
 *
 * The specialised-closure engine routes every normalized diagnostic through
 * this module, so the rendered `message` is substrate's own text rather than
 * a compiler-generated one.
 *
 * @module
 */
import type { EntityDiagnosticRenderContextInterface } from './interfaces/EntityDiagnosticRenderContextInterface.js';

interface KeywordMessageRendererInterface {
  (context: EntityDiagnosticRenderContextInterface): string | undefined;
}

export class EntityDiagnostics {
  private static readonly RENDERERS = new Map<string, KeywordMessageRendererInterface>([
    ['additionalProperties', () => {
      const result = 'must NOT have additional properties';
      return result;
    }],
    ['const', () => {
      const result = 'must be equal to constant';
      return result;
    }],
    ['contains', (context) => {
      if (context.containsMinimum === undefined) {
        return undefined;
      }
      const result = context.containsMaximum === undefined
        ? `must contain at least ${context.containsMinimum} valid item(s)`
        : `must contain at least ${context.containsMinimum} and no more than ${context.containsMaximum} valid item(s)`;
      return result;
    }],
    ['dependentRequired', (context) => {
      if (context.dependentProperty === undefined || context.missingDependentProperties === undefined || context.missingDependentProperties.length === 0) {
        return undefined;
      }
      const noun = context.missingDependentProperties.length === 1 ? 'property' : 'properties';
      const result = `must have ${noun} ${context.missingDependentProperties.join(', ')} when property ${context.dependentProperty} is present`;
      return result;
    }],
    ['enum', () => {
      const result = 'must be equal to one of the allowed values';
      return result;
    }],
    ['exclusiveMaximum', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must be < ${value}`;});
      return result;
    }],
    ['exclusiveMinimum', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must be > ${value}`;});
      return result;
    }],
    ['false schema', () => {
      const result = 'boolean schema is false';
      return result;
    }],
    ['format', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must match format "${value}"`;});
      return result;
    }],
    ['maximum', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must be <= ${value}`;});
      return result;
    }],
    ['maxItems', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must NOT have more than ${value} items`;});
      return result;
    }],
    ['maxLength', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must NOT have more than ${value} characters`;});
      return result;
    }],
    ['maxProperties', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must NOT have more than ${value} properties`;});
      return result;
    }],
    ['minimum', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must be >= ${value}`;});
      return result;
    }],
    ['minItems', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must NOT have fewer than ${value} items`;});
      return result;
    }],
    ['minLength', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must NOT have fewer than ${value} characters`;});
      return result;
    }],
    ['minProperties', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must NOT have fewer than ${value} properties`;});
      return result;
    }],
    ['multipleOf', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must be multiple of ${value}`;});
      return result;
    }],
    ['not', () => {
      const result = 'must NOT be valid';
      return result;
    }],
    ['oneOf', () => {
      const result = 'must match exactly one schema in oneOf';
      return result;
    }],
    ['pattern', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must match pattern "${value}"`;});
      return result;
    }],
    ['required', (context) => {
      const result = context.missingProperty === undefined ? undefined : `must have required property '${context.missingProperty}'`;
      return result;
    }],
    ['type', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must be ${value}`;});
      return result;
    }],
    ['unevaluatedItems', (context) => {
      const result = EntityDiagnostics.renderKeywordValue(context, (value) => {return `must NOT have more than ${value} items`;});
      return result;
    }],
    ['unevaluatedProperties', () => {
      const result = 'must NOT have unevaluated properties';
      return result;
    }],
    ['uniqueItems', () => {
      const result = 'must NOT have duplicate items';
      return result;
    }]
  ]);

  /** Renders the canonical message for a diagnostic, or `undefined` when the keyword has no canonical form. */
  public static render(context: EntityDiagnosticRenderContextInterface): string | undefined {
    const renderer = EntityDiagnostics.RENDERERS.get(context.keyword);
    const result = renderer?.(context);
    return result;
  }

  /** Renders a keyword's declared schema value (e.g. `0` for `minimum`) into its message. */
  private static renderKeywordValue(
    context: EntityDiagnosticRenderContextInterface,
    template: (value: string) => string
  ): string | undefined {
    if (context.keywordValue === undefined) {
      return undefined;
    }
    const value = Array.isArray(context.keywordValue) ? context.keywordValue.join(',') : String(context.keywordValue);
    const result = template(value);
    return result;
  }
}

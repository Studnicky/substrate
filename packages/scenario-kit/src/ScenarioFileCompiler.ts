import type { EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';

import { EntityCompiler } from '@studnicky/entity/browser';
import { Predicates } from '@studnicky/types/node';

import type { ScenarioCaseEntityInterface } from './interfaces/ScenarioCaseEntityInterface.js';
import type { ScenarioFileTypeInterface } from './interfaces/ScenarioFileTypeInterface.js';

import { ScenarioCaseIntakeError } from './errors/ScenarioCaseIntakeError.js';
import { NodeSchemaAgreement } from './NodeSchemaAgreement.js';

/** Compiles the `{ cases: [...] }` envelope shared by every `*.scenarios.json` fixture; each case is proven by the entity's own `intake`. */
export class ScenarioFileCompiler {
  private static readonly ENVELOPE_SCHEMA = {
    'additionalProperties': false,
    'properties': { 'cases': { 'type': 'array' } },
    'required': ['cases'],
    'type': 'object'
  } as const;

  /**
   * `TCase` is inferred from the entity's `intake`, so the returned type can never name a shape other than the one the entity proves.
   */

  static compileIntake<TCase>(entity: ScenarioCaseEntityInterface<TCase>): EntityIntakeFunctionInterface<ScenarioFileTypeInterface<TCase>> {
    NodeSchemaAgreement.assertMatches(entity.Schema, entity.Node);
    const envelopeIntake = EntityCompiler.compileIntake<ScenarioFileTypeInterface<unknown>>(ScenarioFileCompiler.ENVELOPE_SCHEMA);

    const fileIntake: EntityIntakeFunctionInterface<ScenarioFileTypeInterface<TCase>> = (input) => {
      const envelope = envelopeIntake(input);
      const cases: TCase[] = [];
      for (let index = 0; index < envelope.cases.length; index += 1) {
        const raw = envelope.cases[index];
        const name: unknown = Predicates.isRecord(raw) ? Reflect.get(raw, 'name') : undefined;
        const label = Predicates.isString(name) ? `cases[${String(index)}] '${name}'` : `cases[${String(index)}]`;
        cases.push(ScenarioFileCompiler.intakeCase(entity, raw, label));
      }
      const file: ScenarioFileTypeInterface<TCase> = { 'cases': cases };
      return file;
    };
    return fileIntake;
  }

  private static intakeCase<TCase>(entity: ScenarioCaseEntityInterface<TCase>, raw: unknown, label: string): TCase {
    try {
      const scenarioCase = entity.intake(raw);
      return scenarioCase;
    } catch (error) {
      throw new ScenarioCaseIntakeError(`${label} rejected: ${String(error)}`, error);
    }
  }
}

import type { EntityIntakeFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import type { ScenarioFileTypeInterface } from './interfaces/ScenarioFileTypeInterface.js';

import { NodeSchemaAgreement } from './NodeSchemaAgreement.js';

/** Compiles the `{ cases: [...] }` envelope shared by every `*.scenarios.json` fixture, validating each case against a caller-supplied schema. */
export class ScenarioFileCompiler {
  /** `TCase` is inferred from `caseNode`, never given explicitly, so the returned type can never name a shape other than the one `caseSchema` was just proven to match. */
  static compileIntake<TCaseNode extends SchemaNodeInterface<unknown, unknown>>(
    caseSchema: Record<string, unknown>, caseNode: TCaseNode, remoteSchemas?: ReadonlyMap<string, object | boolean>
  ): EntityIntakeFunctionInterface<ScenarioFileTypeInterface<NodeStaticType<TCaseNode>>> {
    NodeSchemaAgreement.assertMatches(caseSchema, caseNode);

    const schema = {
      'additionalProperties': false,
      'properties': { 'cases': { 'items': caseSchema, 'type': 'array' } },
      'required': ['cases'],
      'type': 'object'
    } as const;

    const intake = EntityCompiler.compileIntake<ScenarioFileTypeInterface<NodeStaticType<TCaseNode>>>(schema, remoteSchemas);
    return intake;
  }
}

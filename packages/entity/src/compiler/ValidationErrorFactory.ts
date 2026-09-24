import { JsonObject } from '@studnicky/types/browser';

import type { EntityDiagnosticRenderContextInterface } from '../interfaces/EntityDiagnosticRenderContextInterface.js';
import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';

import { EntityDiagnostics } from '../EntityDiagnostics.js';

const VALIDATION_ERROR_PARAMETERS_KEY = 'params';

/** Builds one normalized diagnostic, rendering its message through the shared `EntityDiagnostics` table. */
export class ValidationErrorFactory {
  public static build(
    instancePath: string,
    schemaPath: string,
    renderContext: EntityDiagnosticRenderContextInterface,
    parameters: Readonly<Record<string, unknown>> = {}
  ): EntityValidationErrorInterface {
    const message = EntityDiagnostics.render(renderContext) ?? 'invalid';
    const diagnostic: Record<string, unknown> = {
      'instancePath': instancePath,
      'keyword': renderContext.keyword,
      'message': message,
      'schemaPath': schemaPath
    };
    JsonObject.write(diagnostic, VALIDATION_ERROR_PARAMETERS_KEY, parameters);
    const result = diagnostic as unknown as EntityValidationErrorInterface;
    return result;
  }
}

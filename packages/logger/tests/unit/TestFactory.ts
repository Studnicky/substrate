/**
 * Test factory for logger unit tests.
 * Provides static methods for creating test log bodies and faults.
 */

import type { LogBodyDataType } from '../../src/types/LogBodyDataType.js';
import type { LogFaultDataType } from '../../src/types/LogFaultDataType.js';

import { LOG_STATUS } from '../../src/builders/index.js';
import { LogBody } from '../../src/modules/LogBody.js';
import { LogFault } from '../../src/modules/LogFault.js';

/**
 * Test factory class for creating log bodies and faults in tests.
 */
export class TestFactory {
  /**
   * Creates a test log body with minimal required fields.
   */
  static body(message: string, context?: Record<string, unknown>): LogBodyDataType {
    return LogBody.create()
      .component('TestFactory')
      .operation('body')
      .status(LOG_STATUS.SUCCESS)
      .message(message)
      .context(context ?? {})
      .build();
  }

  /**
   * Creates a test log body with custom component/operation.
   */
  static bodyCustom(
    component: string,
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ): LogBodyDataType {
    return LogBody.create()
      .component(component)
      .operation(operation)
      .status(LOG_STATUS.SUCCESS)
      .message(message)
      .context(context ?? {})
      .build();
  }

  /**
   * Creates a test log fault from an error.
   */
  static fault(error: Error, context?: Record<string, unknown>): LogFaultDataType {
    return LogFault.create()
      .component('TestFactory')
      .operation('fault')
      .status(LOG_STATUS.FAILED)
      .fromError(error)
      .context(context ?? {})
      .build();
  }
}

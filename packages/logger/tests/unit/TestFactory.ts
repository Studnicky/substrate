/**
 * Test factory for logger unit tests.
 * Provides static methods for creating test log bodies and faults.
 */

import type { LogBodyDataEntity } from '../../src/entities/LogBodyDataEntity.js';
import type { LogFaultDataEntity } from '../../src/entities/LogFaultDataEntity.js';

import { LOG_STATUS } from '../../src/constants/index.js';
import { LogBody } from '../../src/modules/LogBody.js';
import { LogFault } from '../../src/modules/LogFault.js';

/**
 * Test factory class for creating log bodies and faults in tests.
 */
export class TestFactory {
  /**
   * Creates a test log body with minimal required fields.
   */
  static body(message: string, context?: Record<string, unknown>): LogBodyDataEntity.Type {
    return LogBody.create({
      'component': 'TestFactory',
      'context': context ?? {},
      'message': message,
      'operation': 'body',
      'status': LOG_STATUS.SUCCESS
    });
  }

  /**
   * Creates a test log body with custom component/operation.
   */
  static bodyCustom(
    component: string,
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ): LogBodyDataEntity.Type {
    return LogBody.create({
      'component': component,
      'context': context ?? {},
      'message': message,
      'operation': operation,
      'status': LOG_STATUS.SUCCESS
    });
  }

  /**
   * Creates a test log fault from an error.
   */
  static fault(error: Error, context?: Record<string, unknown>): LogFaultDataEntity.Type {
    const errorCause = error.cause;
    const cause = errorCause instanceof Error
      ? errorCause.message
      : errorCause === undefined ? undefined : String(errorCause);
    return LogFault.create({
      ...(cause !== undefined && { 'cause': cause }),
      'component': 'TestFactory',
      'context': context ?? {},
      'message': error.message,
      'name': error.name,
      'operation': 'fault',
      ...(error.stack !== undefined && { 'stack': error.stack }),
      'status': LOG_STATUS.FAILED
    });
  }
}

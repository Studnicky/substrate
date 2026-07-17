/**
 * Fluent interface for LogFault builder.
 */

import type { LogFaultDataEntity } from '../entities/LogFaultDataEntity.js';
import type { LogStatusType } from '../types/LogStatusType.js';

/**
 * Builder interface for creating normalized error log entries.
 */
export interface LogFaultInterface {
  build(): LogFaultDataEntity.Type;
  cause(cause: Error | string): LogFaultInterface;
  component(name: string): LogFaultInterface;
  context(data: Record<string, unknown>): LogFaultInterface;
  duration(ms: number): LogFaultInterface;
  fromError(error: Error): LogFaultInterface;
  message(message: string): LogFaultInterface;
  name(name: string): LogFaultInterface;
  operation(name: string): LogFaultInterface;
  stack(stack: string): LogFaultInterface;
  status(status: LogStatusType): LogFaultInterface;
}

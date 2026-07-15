/**
 * Fluent interface for LogBody builder.
 */

import type { LogBodyDataType } from '../types/LogBodyDataType.js';
import type { LogStatusType } from '../types/LogStatusType.js';

/**
 * Builder interface for creating normalized log entries.
 */
export interface LogBodyInterface {
  build(): LogBodyDataType;
  component(name: string): LogBodyInterface;
  context(data: Record<string, unknown>): LogBodyInterface;
  duration(ms: number): LogBodyInterface;
  message(message: string): LogBodyInterface;
  operation(name: string): LogBodyInterface;
  status(status: LogStatusType): LogBodyInterface;
}

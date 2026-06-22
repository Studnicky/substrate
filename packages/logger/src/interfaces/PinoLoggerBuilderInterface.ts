import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';
import type { LoggerBuilderInterface } from './LoggerBuilderInterface.js';
import type { LoggerInterface } from './LoggerInterface.js';

/**
 * Interface for PinoLogger builder methods.
 *
 * Defines the fluent API contract for configuring PinoLogger instances.
 * Extends the base LoggerBuilderInterface for the common build() method.
 */
export interface PinoLoggerBuilderInterface<T extends LoggerInterface>
  extends LoggerBuilderInterface<T> {
  destination(path: string): this;
  enabled(enabled: boolean): this;
  errorKey(key: string): this;
  formatters(formatters: {
    'level'?: (label: string, number: number) => object;
    'log'?: (object: Record<string, unknown>) => Record<string, unknown>;
  }): this;
  level(level: LogLevelStringType | LogLevelType): this;
  messageKey(key: string): this;
  metadata(metadata: LogMetadataType): this;
  mixin(mixin: () => object): this;
  name(name: string): this;
  nestedKey(key: string): this;
  pretty(enabled: boolean): this;
  redact(redact: string[] | { 'censor'?: string;
    'paths': string[];
    'remove'?: boolean }): this;
  safe(safe: boolean): this;
  serializers(serializers: Record<string, (value: unknown) => unknown>): this;
  timestamp(timestamp: (() => string) | boolean): this;
}

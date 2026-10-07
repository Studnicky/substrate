
import { Predicates } from '#runtime';

import type { LoggerOptionsInterface } from '../interfaces/LoggerOptionsInterface.js';

/** Type guards for `Logger` construction options untyped/JS callers can violate at runtime. */
class LoggerOptionGuards {
  public static isValidMetadata(metadata: unknown): metadata is LoggerOptionsInterface['metadata'] {
    const result = metadata === undefined || Predicates.isObject(metadata);
    return result;
  }

  public static isValidTransports(transports: unknown): transports is LoggerOptionsInterface['transports'] {
    const result = transports === undefined || Predicates.isArray(transports);
    return result;
  }
}

export { LoggerOptionGuards };

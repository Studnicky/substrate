import { Context } from '../context/Context.js';
import { ContextConfigError, ContextError } from '../errors/ContextError.js';
import { ContextRuntime } from '../runtime/ContextRuntime.js';
import { ContextAsyncRuntime } from './ContextAsyncRuntime.js';
import { NodeContextStorage } from './NodeContextStorage.js';

ContextRuntime.registerDefaultStorage(() => {
  const result = new NodeContextStorage();
  return result;
});

export { Context, ContextAsyncRuntime, ContextConfigError, ContextError };

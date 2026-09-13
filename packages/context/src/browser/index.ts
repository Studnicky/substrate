import { Context } from '../context/Context.js';
import { ContextConfigError, ContextError } from '../errors/ContextError.js';
import { ContextRuntime } from '../runtime/ContextRuntime.js';
import { BrowserContextStorage } from './BrowserContextStorage.js';
import { ContextAsyncRuntime } from './ContextAsyncRuntime.js';

ContextRuntime.registerDefaultStorage(() => {
  const result = new BrowserContextStorage();
  return result;
});

export { Context, ContextAsyncRuntime, ContextConfigError, ContextError };

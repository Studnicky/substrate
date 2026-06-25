// Browser shim for node:timers/promises.
// Only setTimeout is shimmed here — the packages that use it (retry, throttle)
// only import that named export.
export function setTimeout(ms, value, opts) {
  return new Promise((resolve, reject) => {
    if (opts?.signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = globalThis.setTimeout(() => resolve(value), ms);
    opts?.signal?.addEventListener('abort', () => {
      globalThis.clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export function setInterval(ms, value, opts) {
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (opts?.signal?.aborted) {
            return { done: true, value: undefined };
          }
          await setTimeout(ms, undefined, opts);
          return { done: false, value };
        }
      };
    }
  };
}

export function setImmediate(value, opts) {
  return new Promise((resolve, reject) => {
    if (opts?.signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = globalThis.setImmediate
      ? globalThis.setImmediate(() => resolve(value))
      : globalThis.setTimeout(() => resolve(value), 0);
    opts?.signal?.addEventListener('abort', () => {
      if (globalThis.clearImmediate) {
        globalThis.clearImmediate(id);
      } else {
        globalThis.clearTimeout(id);
      }
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export const scheduler = {
  wait: setTimeout,
  yield: () => new Promise((resolve) => globalThis.setTimeout(resolve, 0))
};

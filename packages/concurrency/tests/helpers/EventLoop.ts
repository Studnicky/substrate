/** Yields to the event loop so every pending microtask and immediate callback runs. */
export class EventLoop {
  static flush(): Promise<void> {
    const flushed = new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    return flushed;
  }
}

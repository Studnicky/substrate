import assert from 'node:assert/strict';

/** Raises a genuine platform `DOMException` from a test double, the way a Web Storage backend does. */
export class DomExceptionRaiser {
  static raise(message: string, name: string): void {
    const exception: unknown = Reflect.construct(DOMException, [message, name]);
    assert.ok(exception instanceof DOMException);
    const source = DomExceptionRaiser.suspended();
    source.next();
    source.throw(exception);
  }

  private static *suspended(): Generator<number> {
    yield 1;
  }
}

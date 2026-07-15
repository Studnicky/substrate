import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import type { LogBodyDataType } from '../../src/types/LogBodyDataType.js';
import type { LogFaultDataType } from '../../src/types/LogFaultDataType.js';

import { LogBuildError } from '../../src/errors/LogBuildError.js';
import { LogBody } from '../../src/modules/LogBody.js';
import { LogFault } from '../../src/modules/LogFault.js';

// ---------------------------------------------------------------------------
// Subclass stubs — capture hook calls without side effects
// ---------------------------------------------------------------------------

class ObservedLogBody extends LogBody {
  constructor() { super(); }

  readonly builtResults: Array<LogBodyDataType | LogFaultDataType> = [];
  readonly buildErrors: string[] = [];

  protected override onBuild(result: LogBodyDataType | LogFaultDataType): void {
    this.builtResults.push(result);
  }

  protected override onBuildError(field: string): void {
    this.buildErrors.push(field);
  }
}

class ObservedLogFault extends LogFault {
  constructor() { super(); }

  readonly builtResults: Array<LogBodyDataType | LogFaultDataType> = [];
  readonly buildErrors: string[] = [];

  protected override onBuild(result: LogBodyDataType | LogFaultDataType): void {
    this.builtResults.push(result);
  }

  protected override onBuildError(field: string): void {
    this.buildErrors.push(field);
  }
}

// ---------------------------------------------------------------------------
// onBuild — LogBody
// ---------------------------------------------------------------------------

void describe('BaseLogEntryBuilder onBuild (LogBody)', () => {
  void it('fires with the assembled result on a successful build', () => {
    const builder = new ObservedLogBody();

    const result = builder
      .component('cache')
      .operation('get')
      .status('success')
      .message('Cache hit')
      .context({})
      .build();

    assert.strictEqual(builder.builtResults.length, 1);
    assert.strictEqual(builder.builtResults[0], result);
  });

  void it('receives the frozen result object', () => {
    const builder = new ObservedLogBody();

    builder
      .component('cache')
      .operation('get')
      .status('success')
      .message('Hit')
      .context({})
      .build();

    assert.ok(Object.isFrozen(builder.builtResults[0]));
  });

  void it('result passed to onBuild contains expected fields', () => {
    const builder = new ObservedLogBody();

    builder
      .component('graph')
      .operation('query')
      .status('success')
      .message('Done')
      .context({ 'n': 1 })
      .duration(100)
      .build();

    const captured = builder.builtResults[0] as LogBodyDataType;

    assert.strictEqual(captured.event, 'graph.query');
    assert.strictEqual(captured.message, 'Done');
    assert.strictEqual(captured.status, 'success');
    assert.strictEqual(captured.durationMs, 100);
    assert.deepStrictEqual(captured.context, { 'n': 1 });
  });

  void it('does not fire when build() throws due to missing field', () => {
    const builder = new ObservedLogBody();

    assert.throws(() => {
      builder
        .operation('query')
        .status('success')
        .message('Test')
        .context({})
        .build();
    }, LogBuildError);

    assert.strictEqual(builder.builtResults.length, 0);
  });
});

// ---------------------------------------------------------------------------
// onBuild — LogFault
// ---------------------------------------------------------------------------

void describe('BaseLogEntryBuilder onBuild (LogFault)', () => {
  void it('fires with the assembled result on a successful build', () => {
    const builder = new ObservedLogFault();

    const result = builder
      .component('api')
      .operation('request')
      .status('failed')
      .name('NetworkError')
      .message('Connection refused')
      .context({})
      .build();

    assert.strictEqual(builder.builtResults.length, 1);
    assert.strictEqual(builder.builtResults[0], result);
  });

  void it('result passed to onBuild contains expected fault fields', () => {
    const builder = new ObservedLogFault();

    builder
      .component('api')
      .operation('request')
      .status('timeout')
      .name('TimeoutError')
      .message('30s exceeded')
      .context({ 'query': 'SELECT...' })
      .build();

    const captured = builder.builtResults[0] as LogFaultDataType;

    assert.strictEqual(captured.event, 'api.request');
    assert.strictEqual(captured.name, 'TimeoutError');
    assert.strictEqual(captured.message, '30s exceeded');
    assert.strictEqual(captured.status, 'timeout');
    assert.deepStrictEqual(captured.context, { 'query': 'SELECT...' });
  });

  void it('does not fire when build() throws due to missing name', () => {
    const builder = new ObservedLogFault();

    assert.throws(() => {
      builder
        .component('api')
        .operation('request')
        .status('failed')
        .message('Missing name')
        .context({})
        .build();
    }, LogBuildError);

    assert.strictEqual(builder.builtResults.length, 0);
  });

  void it('a throwing onBuild hook does not replace a successful body build', () => {
    class ThrowingBuildLogBody extends LogBody {
      constructor() { super(); }

      protected override onBuild(): void {
        throw new Error('onBuild boom');
      }
    }

    const result = new ThrowingBuildLogBody()
      .component('cache')
      .operation('get')
      .status('success')
      .message('ok')
      .context({})
      .build();

    assert.strictEqual(result.event, 'cache.get');
  });

  void it('a throwing onBuild hook does not replace a successful fault build', () => {
    class ThrowingBuildLogFault extends LogFault {
      constructor() { super(); }

      protected override onBuild(): void {
        throw new Error('onBuild boom');
      }
    }

    const result = new ThrowingBuildLogFault()
      .component('api')
      .operation('request')
      .status('failed')
      .name('NetworkError')
      .message('boom')
      .context({})
      .build();

    assert.strictEqual(result.event, 'api.request');
  });
});

// ---------------------------------------------------------------------------
// onBuildError — LogBody
// ---------------------------------------------------------------------------

void describe('BaseLogEntryBuilder onBuildError (LogBody)', () => {
  void it('fires with "component" when component is missing', () => {
    const builder = new ObservedLogBody();

    assert.throws(() => {
      builder.operation('q').status('success').message('m').context({}).build();
    }, LogBuildError);

    assert.ok(builder.buildErrors.includes('component'));
  });

  void it('fires with "operation" when operation is missing', () => {
    const builder = new ObservedLogBody();

    assert.throws(() => {
      builder.component('c').status('success').message('m').context({}).build();
    }, LogBuildError);

    assert.ok(builder.buildErrors.includes('operation'));
  });

  void it('fires with "status" when status is missing', () => {
    const builder = new ObservedLogBody();

    assert.throws(() => {
      builder.component('c').operation('q').message('m').context({}).build();
    }, LogBuildError);

    assert.ok(builder.buildErrors.includes('status'));
  });

  void it('fires with "context" when context() was never called', () => {
    const builder = new ObservedLogBody();

    assert.throws(() => {
      builder.component('c').operation('q').status('success').message('m').build();
    }, LogBuildError);

    assert.ok(builder.buildErrors.includes('context'));
  });

  void it('fires with "message" when message is missing', () => {
    const builder = new ObservedLogBody();

    assert.throws(() => {
      builder.component('c').operation('q').status('success').context({}).build();
    }, LogBuildError);

    assert.ok(builder.buildErrors.includes('message'));
  });

  void it('fires exactly once per build() call with a single missing field', () => {
    const builder = new ObservedLogBody();

    assert.throws(() => {
      builder.operation('q').status('success').message('m').context({}).build();
    }, LogBuildError);

    assert.strictEqual(builder.buildErrors.length, 1);
  });

  void it('does not fire when all required fields are present', () => {
    const builder = new ObservedLogBody();

    builder.component('c').operation('q').status('success').message('m').context({}).build();

    assert.strictEqual(builder.buildErrors.length, 0);
  });
});

// ---------------------------------------------------------------------------
// onBuildError — LogFault
// ---------------------------------------------------------------------------

void describe('BaseLogEntryBuilder onBuildError (LogFault)', () => {
  void it('fires with "name" when name is missing', () => {
    const builder = new ObservedLogFault();

    assert.throws(() => {
      builder.component('c').operation('q').status('failed').message('m').context({}).build();
    }, LogBuildError);

    assert.ok(builder.buildErrors.includes('name'));
  });

  void it('fires with "message" when message is missing', () => {
    const builder = new ObservedLogFault();

    assert.throws(() => {
      builder.component('c').operation('q').status('failed').name('Err').context({}).build();
    }, LogBuildError);

    assert.ok(builder.buildErrors.includes('message'));
  });

  void it('fires with "component" when component is missing', () => {
    const builder = new ObservedLogFault();

    assert.throws(() => {
      builder.operation('q').status('failed').name('Err').message('m').context({}).build();
    }, LogBuildError);

    assert.ok(builder.buildErrors.includes('component'));
  });

  void it('does not fire when all required fields are present', () => {
    const builder = new ObservedLogFault();

    builder.component('c').operation('q').status('failed').name('Err').message('m').context({}).build();

    assert.strictEqual(builder.buildErrors.length, 0);
  });

  void it('a throwing onBuildError hook does not replace LogBuildError', () => {
    class ThrowingBuildErrorLogBody extends LogBody {
      constructor() { super(); }

      protected override onBuildError(): void {
        throw new Error('onBuildError boom');
      }
    }

    assert.throws(() => {
      new ThrowingBuildErrorLogBody()
        .operation('query')
        .status('success')
        .message('m')
        .context({})
        .build();
    }, LogBuildError);
  });
});

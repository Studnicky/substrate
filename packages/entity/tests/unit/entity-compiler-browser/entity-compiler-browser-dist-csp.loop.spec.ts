import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';

class DistProbeError extends BaseError {
  public override readonly name: string = 'DistProbeError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'entity.distProbe',
      'message': message,
      'retryable': false
    });
  }
}

class DistProbe {
  public static executeModule(code: string): string {
    try {
      const output = execFileSync(process.execPath, ['--input-type=module', '--eval', code], {
        'cwd': process.cwd(),
        'encoding': 'utf8'
      });
      return output;
    } catch (error) {
      throw new DistProbeError('dist probe process failed', error);
    }
  }

  public static resolveDistUrl(relativePath: string): string {
    try {
      const { href } = new URL(relativePath, import.meta.url);
      return href;
    } catch (error) {
      throw new DistProbeError(`cannot resolve ${relativePath}`, error);
    }
  }

  public static toLiteral(value: string): string {
    try {
      const literal = JSON.stringify(value);
      return literal;
    } catch (error) {
      throw new DistProbeError('cannot serialize probe literal', error);
    }
  }

  /** Both entrypoints resolve to the same engine; each dist file gets its own hostile-`Function` process. */
  public static hostileEntrypointModule(distUrl: string, schemaId: string): string {
    return `
    globalThis.Function = class ForbiddenFunction {
      constructor() { throw new Error('dynamic code generation is forbidden'); }
    };
    const { EntityCompiler } = await import(${DistProbe.toLiteral(distUrl)});
    const schema = {
      '$id': ${DistProbe.toLiteral(schemaId)},
      'additionalProperties': false,
      'properties': {
        'host': { 'default': 'localhost', 'type': 'string' },
        'port': { 'type': 'integer' }
      },
      'required': ['port'],
      'type': 'object'
    };
    const intake = EntityCompiler.compileIntake(schema);
    const accepted = intake({ 'port': 8080 });
    if (accepted.host !== 'localhost' || accepted.port !== 8080) {
      throw new Error('intake did not fill defaults correctly');
    }
    let rejection;
    try {
      intake({ 'port': 'not-a-number' });
    } catch (error) {
      rejection = error;
    }
    if (rejection === undefined || rejection.errors[0].keyword !== 'type' || rejection.errors[0].instancePath !== '/port') {
      throw new Error('intake did not reject invalid input with the expected error shape: ' + JSON.stringify(rejection));
    }
    process.stdout.write('ok');
    `;
  }
}

void describe('entity browser entry point', () => {
  void it('compiles, fills defaults, and rejects invalid input when Function construction is forbidden', () => {
    const browserUrl = DistProbe.resolveDistUrl('../../../dist/browser/index.js');
    const output = DistProbe.executeModule(DistProbe.hostileEntrypointModule(browserUrl, 'https://studnicky.dev/schemas/entity-browser-dist-csp'));

    assert.equal(output, 'ok');
  });
});

void describe('entity node entry point', () => {
  void it('compiles, fills defaults, and rejects invalid input when Function construction is forbidden', () => {
    const nodeUrl = DistProbe.resolveDistUrl('../../../dist/node/index.js');
    const output = DistProbe.executeModule(DistProbe.hostileEntrypointModule(nodeUrl, 'https://studnicky.dev/schemas/entity-node-dist-csp'));

    assert.equal(output, 'ok');
  });
});

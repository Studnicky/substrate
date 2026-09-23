import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';

function executeModule(code: string): string {
  return execFileSync(process.execPath, ['--input-type=module', '--eval', code], {
    'cwd': process.cwd(),
    'encoding': 'utf8'
  });
}

void describe('entity browser entry point', () => {
  void it('compiles, fills defaults, and rejects invalid input when Function construction is forbidden', () => {
    const browserUrl = new URL('../../../dist/browser/index.js', import.meta.url).href;
    const output = executeModule(`
      globalThis.Function = class ForbiddenFunction {
        constructor() { throw new Error('dynamic code generation is forbidden'); }
      };
      const { EntityCompiler } = await import(${JSON.stringify(browserUrl)});
      const schema = {
        '$id': 'https://studnicky.dev/schemas/entity-browser-dist-csp',
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
        throw new Error('browser intake did not fill defaults correctly');
      }
      let rejection;
      try {
        intake({ 'port': 'not-a-number' });
      } catch (error) {
        rejection = error;
      }
      if (rejection === undefined || rejection.errors[0].keyword !== 'type' || rejection.errors[0].instancePath !== '/port') {
        throw new Error('browser intake did not reject invalid input with the expected error shape: ' + JSON.stringify(rejection));
      }
      process.stdout.write('ok');
    `);

    assert.equal(output, 'ok');
  });
});

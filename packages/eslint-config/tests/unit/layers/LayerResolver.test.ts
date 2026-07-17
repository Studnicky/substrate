import assert from 'node:assert';
import { describe, it } from 'node:test';

import { LayerResolver } from '../../../src/rules/layers/LayerResolver.js';
import type { LayerOptionsType } from '../../../src/types/LayerOptionsType.js';

const baseOptions: LayerOptionsType = {
  'aliasPrefixes': { '@domain/': 'domain', '@ports/': 'ports' },
  'layers': ['domain', 'ports', 'application', 'adapters', 'infrastructure'],
  'sourceRoot': 'src'
};

describe('LayerResolver.layerForPath', () => {
  it('resolves a path under sourceRoot/domain/... to "domain"', () => {
    const result = LayerResolver.layerForPath('/repo/src/domain/user/User.ts', baseOptions);
    assert.strictEqual(result, 'domain');
  });

  it('resolves a path under an unconfigured segment to undefined', () => {
    const result = LayerResolver.layerForPath('/repo/src/utils/format.ts', baseOptions);
    assert.strictEqual(result, undefined);
  });

  it('resolves a path not under sourceRoot at all to undefined', () => {
    const result = LayerResolver.layerForPath('/repo/scripts/build.ts', baseOptions);
    assert.strictEqual(result, undefined);
  });
});

describe('LayerResolver.layerForImport', () => {
  it('resolves an alias-prefixed specifier via the alias map directly', () => {
    const result = LayerResolver.layerForImport('@domain/user', '/repo/src/application/service.ts', baseOptions);
    assert.strictEqual(result, 'domain');
  });

  it('resolves a relative specifier via path resolution against the importing file directory', () => {
    const result = LayerResolver.layerForImport('../domain/foo', '/repo/src/application/service.ts', baseOptions);
    assert.strictEqual(result, 'domain');
  });

  it('resolves a bare npm-style specifier to undefined', () => {
    const result = LayerResolver.layerForImport('lodash', '/repo/src/application/service.ts', baseOptions);
    assert.strictEqual(result, undefined);
  });

  it('resolves a relative specifier that resolves outside sourceRoot to undefined', () => {
    const result = LayerResolver.layerForImport('../../scripts/build', '/repo/src/application/service.ts', baseOptions);
    assert.strictEqual(result, undefined);
  });
});

describe('LayerResolver.canImport', () => {
  it('always allows same-layer imports', () => {
    assert.strictEqual(LayerResolver.canImport('application', 'application', baseOptions), true);
  });

  it('disallows domain -> application per the default matrix', () => {
    assert.strictEqual(LayerResolver.canImport('domain', 'application', baseOptions), false);
  });

  it('allows application -> domain per the default matrix', () => {
    assert.strictEqual(LayerResolver.canImport('application', 'domain', baseOptions), true);
  });

  it('allows infrastructure -> anything configured', () => {
    assert.strictEqual(LayerResolver.canImport('infrastructure', 'domain', baseOptions), true);
    assert.strictEqual(LayerResolver.canImport('infrastructure', 'adapters', baseOptions), true);
  });

  it('respects an allowedImports override that changes the default-matrix result', () => {
    const options: LayerOptionsType = {
      ...baseOptions,
      'allowedImports': { 'domain': ['domain', 'application'] }
    };
    assert.strictEqual(LayerResolver.canImport('domain', 'application', options), true);
  });

  it('returns false for an unrecognized layer name', () => {
    assert.strictEqual(LayerResolver.canImport('domain', 'nonexistent', baseOptions), false);
  });
});

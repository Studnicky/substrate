import assert from 'node:assert/strict';
import { it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { NodeProjectHost } from '../../../src/node/NodeProjectHost.js';

void it('retains dependency resolution across repeated lookups', () => {
  const host = new NodeProjectHost();
  const importerFilename = fileURLToPath(import.meta.url);
  const firstResolution = host.resolveModule('typescript', importerFilename);
  const repeatedResolution = host.resolveModule('typescript', importerFilename);

  assert.ok(firstResolution !== undefined);
  assert.equal(repeatedResolution, firstResolution);
});

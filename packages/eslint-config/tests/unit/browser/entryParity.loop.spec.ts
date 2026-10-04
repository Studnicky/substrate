import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

class BrowserEntryFixture {
  static readonly 'expectedExports': readonly string[] = ['PlatformCallDefaults'];
}

void describe('browser entrypoint', () => {
  void it('exports browser-safe platform policy defaults', async () => {
    const browserEntry = await import('../../../dist/browser/index.js');
    const entries = browserEntry.PlatformCallDefaults.build();

    assert.deepEqual(Object.keys(browserEntry).toSorted(), BrowserEntryFixture.expectedExports);
    assert.ok(entries.length > 0, 'platform policy defaults must be non-empty');
    assert.ok(
      entries.some((entry) => { const result = entry.kind === 'call' && entry.member === 'fetch' && entry.owner === '' && entry.safeWhenLiteral === 'never'; return result; }),
      'platform policy defaults must retain the unguarded fetch policy'
    );
  });
});

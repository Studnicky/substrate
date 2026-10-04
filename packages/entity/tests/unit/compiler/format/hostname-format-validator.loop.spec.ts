import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HostnameFormatValidator } from '../../../../src/compiler/format/HostnameFormatValidator.js';

void describe('HostnameFormatValidator', () => {
  void it('accepts a well-formed multi-label hostname', () => {
    assert.equal(HostnameFormatValidator.test('www.example.com'), true);
  });

  void it('rejects a label starting with a hyphen', () => {
    assert.equal(HostnameFormatValidator.test('-hostname'), false);
  });

  void it('rejects a full-width IDN label separator (non-ASCII)', () => {
    assert.equal(HostnameFormatValidator.test('example．com'), false);
  });

  void it('rejects a non-ASCII case-folding character (Kelvin sign)', () => {
    assert.equal(HostnameFormatValidator.test('Kelvin.example.com'), false);
  });

  void it('accepts a valid A-label (punycode) host name', () => {
    assert.equal(HostnameFormatValidator.test('xn--9n2bp8q.xn--9t4b11yi5a'), true);
  });

  void it('rejects an A-label whose Punycode decodes above U+10FFFF instead of throwing', () => {
    assert.equal(HostnameFormatValidator.test('xn--9278ma1y.com'), false);
  });

  void it('rejects an A-label with invalid Punycode', () => {
    assert.equal(HostnameFormatValidator.test('xn--X'), false);
  });

  void it('rejects an A-label whose decoded label begins with a nonspacing mark', () => {
    assert.equal(HostnameFormatValidator.test('xn--hello-zed'), false);
  });

  void it('rejects a middle dot not surrounded by "l" characters', () => {
    assert.equal(HostnameFormatValidator.test('xn--al-0ea'), false);
  });

  void it('accepts a middle dot surrounded by "l" characters', () => {
    assert.equal(HostnameFormatValidator.test('xn--ll-0ea'), true);
  });
});

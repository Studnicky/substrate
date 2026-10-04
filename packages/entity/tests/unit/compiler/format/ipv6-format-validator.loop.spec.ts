import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Ipv6FormatValidator } from '../../../../src/compiler/format/Ipv6FormatValidator.js';

void describe('Ipv6FormatValidator', () => {
  void it('accepts the unspecified address written with double-colon compression', () => {
    assert.equal(Ipv6FormatValidator.test('::'), true);
  });

  void it('accepts a fully expanded 8-group address', () => {
    assert.equal(Ipv6FormatValidator.test('1:2:3:4:5:6:7:8'), true);
  });

  void it('accepts an IPv4-mapped IPv6 address', () => {
    assert.equal(Ipv6FormatValidator.test('::ffff:192.168.0.1'), true);
  });

  void it('rejects a leading zero in the embedded IPv4 portion', () => {
    assert.equal(Ipv6FormatValidator.test('::ffff:192.168.0.01'), false);
  });

  void it('rejects two separate double-colon compressions', () => {
    assert.equal(Ipv6FormatValidator.test('1::d6::42'), false);
  });

  void it('rejects a zone/scope identifier', () => {
    assert.equal(Ipv6FormatValidator.test('fe80::a%eth1'), false);
  });

  void it('rejects a bracketed literal', () => {
    assert.equal(Ipv6FormatValidator.test('[::1]'), false);
  });

  void it('rejects eight groups alongside a double-colon compression', () => {
    assert.equal(Ipv6FormatValidator.test('1:2:3:4:5:6:7:8::'), false);
  });

  void it('accepts two groups before and four groups after a double-colon compression', () => {
    assert.equal(Ipv6FormatValidator.test('1:2::3:4:5:6'), true);
  });
});

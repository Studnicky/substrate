import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Ipv4FormatValidator } from '../../../../src/compiler/format/Ipv4FormatValidator.js';

void describe('Ipv4FormatValidator', () => {
  void it('accepts a well-formed dotted-quad address', () => {
    assert.equal(Ipv4FormatValidator.test('192.168.0.1'), true);
  });

  void it('accepts the minimum and maximum addresses', () => {
    assert.equal(Ipv4FormatValidator.test('0.0.0.0'), true);
    assert.equal(Ipv4FormatValidator.test('255.255.255.255'), true);
  });

  void it('rejects an octet with a leading zero', () => {
    assert.equal(Ipv4FormatValidator.test('192.168.0.01'), false);
  });

  void it('rejects an out-of-range octet', () => {
    assert.equal(Ipv4FormatValidator.test('256.0.0.0'), false);
  });

  void it('rejects a two-part inet_aton shorthand address', () => {
    assert.equal(Ipv4FormatValidator.test('127.1'), false);
  });

  void it('rejects an embedded IPv4-mapped IPv6 address', () => {
    assert.equal(Ipv4FormatValidator.test('::ffff:192.168.0.1'), false);
  });

  void it('rejects a CIDR netmask suffix', () => {
    assert.equal(Ipv4FormatValidator.test('192.168.1.0/24'), false);
  });
});

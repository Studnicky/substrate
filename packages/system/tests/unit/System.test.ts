import assert from 'node:assert/strict';
import os from 'node:os';
import { describe, it } from 'node:test';

import { System } from '../../src/System.js';

void describe('System', () => {
  void describe('logicalCpuCount', () => {
    void it('returns a positive integer', () => {
      const count = System.logicalCpuCount;

      assert.ok(typeof count === 'number', 'logicalCpuCount is a number');
      assert.ok(count > 0, `logicalCpuCount > 0, got ${String(count)}`);
      assert.ok(Number.isInteger(count), 'logicalCpuCount is an integer');
    });
  });

  void describe('optimalWorkerCount', () => {
    void it('is at least 1', () => {
      const count = System.optimalWorkerCount;

      assert.ok(typeof count === 'number', 'optimalWorkerCount is a number');
      assert.ok(count >= 1, `optimalWorkerCount >= 1, got ${String(count)}`);
    });

    void it('is logicalCpuCount - 1 when logicalCount > 1, else 1', () => {
      const logical = System.logicalCpuCount;
      const optimal = System.optimalWorkerCount;
      const expected = Math.max(1, logical - 1);

      assert.equal(optimal, expected);
    });
  });

  void describe('cpu', () => {
    void it('arch is a non-empty string', () => {
      const { arch } = System.cpu;

      assert.ok(typeof arch === 'string', 'arch is a string');
      assert.ok(arch.length > 0, 'arch is non-empty');
    });

    void it('model is a non-empty string', () => {
      const { model } = System.cpu;

      assert.ok(typeof model === 'string', 'model is a string');
      assert.ok(model.length > 0, 'model is non-empty');
    });

    void it('logicalCount matches os.cpus().length', () => {
      assert.equal(System.cpu.logicalCount, os.cpus().length);
    });

    void it('physicalCount is >= 1 and <= logicalCount', () => {
      const { logicalCount, physicalCount } = System.cpu;

      assert.ok(physicalCount >= 1, `physicalCount >= 1, got ${String(physicalCount)}`);
      assert.ok(physicalCount <= logicalCount, `physicalCount <= logicalCount`);
    });
  });

  void describe('memory', () => {
    void it('totalMb is > 0', () => {
      const { totalMb } = System.memory;

      assert.ok(typeof totalMb === 'number', 'totalMb is a number');
      assert.ok(totalMb > 0, `totalMb > 0, got ${String(totalMb)}`);
    });

    void it('freeMb is >= 0 and <= totalMb', () => {
      const { freeMb, totalMb } = System.memory;

      assert.ok(freeMb >= 0, `freeMb >= 0, got ${String(freeMb)}`);
      assert.ok(freeMb <= totalMb, `freeMb <= totalMb`);
    });
  });

  void describe('platform', () => {
    void it('nodeVersion matches process.version', () => {
      assert.equal(System.platform.nodeVersion, process.version);
    });

    void it('os is a non-empty string', () => {
      const { os: platformOs } = System.platform;

      assert.ok(typeof platformOs === 'string', 'os is a string');
      assert.ok(platformOs.length > 0, 'os is non-empty');
    });

    void it('isAppleSilicon matches darwin + arm64', () => {
      const expected = os.platform() === 'darwin' && os.arch() === 'arm64';

      assert.equal(System.isAppleSilicon, expected);
    });
  });

  void describe('isAppleSilicon', () => {
    void it('returns correct value for the current platform', () => {
      const expected = os.platform() === 'darwin' && os.arch() === 'arm64';

      assert.equal(System.isAppleSilicon, expected);
    });
  });

  void describe('snapshot()', () => {
    void it('resolves with cpu, gpu, memory, platform fields', async () => {
      const info = await System.snapshot();

      assert.ok(typeof info === 'object' && info !== null, 'snapshot is an object');
      assert.ok('cpu' in info, 'snapshot has cpu');
      assert.ok('gpu' in info, 'snapshot has gpu');
      assert.ok('memory' in info, 'snapshot has memory');
      assert.ok('platform' in info, 'snapshot has platform');

      // gpu may be null — that is valid
      assert.ok(info.gpu === null || typeof info.gpu === 'object', 'gpu is null or object');

      // spot-check nested values
      assert.ok(info.cpu.logicalCount > 0, 'snapshot.cpu.logicalCount > 0');
      assert.ok(info.memory.totalMb > 0, 'snapshot.memory.totalMb > 0');
      assert.equal(info.platform.nodeVersion, process.version);
    });
  });
});

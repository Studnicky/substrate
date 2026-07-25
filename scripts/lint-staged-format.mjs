#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const files = process.argv.slice(2);
if (files.length === 0) {
  process.exit(0);
}

const probe = spawnSync('prettier', ['--version'], { encoding: 'utf8' });
if (probe.status !== 0) {
  console.log('lint-staged-format: prettier not available; format-only staged files left unchanged');
  process.exit(0);
}

const result = spawnSync('prettier', ['--write', ...files], {
  encoding: 'utf8',
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
